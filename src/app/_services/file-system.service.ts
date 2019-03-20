import { Injectable } from '@angular/core';

import Filer from '@app/ext/filer.js';
import Util from '@app/ext/filer.js';
import JSZip from 'jszip/dist/jszip.js';
import streamSaver from 'streamsaver/StreamSaver.js'
import { BehaviorSubject, Subject } from 'rxjs';
import { FileSystemUsage } from '../_models/file-system-usage';
import { LogService } from './log.service';
import { FileSystemData } from '../_models/file-system-data';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FileSystemEntry } from '../_models/file-system-entry';
import { FileSystem } from '../_models/file-system';
import { FileSystemDirectoryEntry } from '../_models/file-system-directory-entry';
import { WriteVarExpr } from '@angular/compiler';

declare global {
    interface Navigator {
        webkitPersistentStorage: {
            requestQuota: (a, b, c) => {}
        }
    }
}

@Injectable({
    providedIn: 'root'
})
export class FileSystemService {

    /**
     * Filesystem settings and behaviors
     */
    readonly FS_INIT_CAPACITY: number = 200 * 1024 * 1024;
    readonly FS_MIN_FREE_SPACE: number = 10 * 1024 * 1024;
    readonly FS_INCREASE_INCREMENT: number = 50;

    /**
     * Behavior subject for filesystem usage
     */
    private usageSubject = new BehaviorSubject<FileSystemUsage>({
        used: 0,
        free: 0,
        capacity: 0
    });
    /**
     * Obserable which can be subscribed to to receive usage changes
     */
    get usage$() {
        this.updateUsage();
        return this.usageSubject.asObservable();
    }

    /**
     * Behavior subject for current working directory
     */
    private cwdSubject = new BehaviorSubject<string>('Filesystem closed');
    /**
     * Obserable which can be subscribed to to receive path changes
     */
    get cwd$() {
        return this.cwdSubject.asObservable();
    }

    /**
     * Behavior subject for files in the current directory
     */
    private cwdFileListSubject = new BehaviorSubject<FileSystemEntry[]>([]);
    /**
     * Observable which can be subscribed to to receive file list changes
     */
    get cwdFileList$() {
        return this.cwdFileListSubject.asObservable();
    }

    /**
     * Instance of Filer class from filer.js
     */
    private filer = null;

    /**
     * Instance of Util class from filer.js
     */
    public util = null;

    /**
     * This Promise should be awaited before trying to
     * access the filesytem.
     */
    public initPromise: Promise<FileSystem>;

    constructor(
        private logServ: LogService,
        private sanitizer: DomSanitizer
    ) {
        this.filer = new Filer();
        this.util = new Util();

        this.initPromise = this.init();
    }

    /**
     * THIS MUST RUN BEFORE THE SERVICE CAN BE TRUSTED TO WORK
     * Open an existing filesystem or prompt the user for permission
     * to create a new one.
     */
    async init(): Promise<FileSystem> {
        return new Promise<FileSystem>((resolve, reject) => {

            // If we're already done
            if (this.filer !== null && this.filer.isOpen) {
                this.logServ.debug('init:\t Filesystem already initialized.');

                resolve(this.filer.fs);
            }

            // Initialize the file file system using the filer.js library
            this.filer.init({
                persistent: true,
                size: this.FS_INIT_CAPACITY
            }, (fs) => {
                this.logServ.debug(`init:\t Opened FileSystem: ${fs.name}.`);

                this.updateCwd();
                this.updateCwdFileList();
                this.updateUsage();
                resolve(fs);
            }, (e) => {
                this.logServ.error(e, `Failed to open file system.`);
                reject(`Failed to open file system: ${e.message}`)
            });
        });
    }

    /**
     * Convert bytes to mebibytes (MB).
     *
     * @param bytes Number of bytes
     * @return Number of mebibytes
     */
    toMB(bytes: number): number {
        return parseFloat((bytes / 1024.0 / 1024.0).toFixed(2));
    }

    /**
     * Convert bytes to mebibytes for a usage object.
     *
     * @param usage Usage object in bytes
     * @return Converted usage object
     */
    usageToMB(usage: FileSystemUsage): FileSystemUsage {
        return {
            used: this.toMB(usage.used),
            free: this.toMB(usage.free),
            capacity: this.toMB(usage.capacity)
        };
    }

    /**
     * Parse the parent folder for a file or directory from a path.
     *
     * @param path Path of file or directory (relative or absolute)
     */
    dirname(path: string) {
        this.logServ.debug(`dirname:\t Original ${path}`);

        let parts = path.split('/');
        parts.pop();

        // Take care of relative paths
        if (parts[0] === '.') {
            parts[0] = this.filer.cwd.fullPath;
            this.logServ.debug(`dirname:\t Expanded . to ${parts[0]}`);
        } else if (parts[0] === '..') {
            parts[0] = '/' + this.dirname(this.filer.cwd.fullPath);
            this.logServ.debug(`dirname:\t Expanded .. to ${parts[0]}`);
        }

        this.logServ.debug(`dirname:\t Final ${parts.join('/')}`);

        return parts.join('/');
    }

    /**
     * Parse the base file or directory name from a path.
     *
     * Based on: https://stackoverflow.com/a/29939805/6798110
     *
     * @param path Path of file or directory (relative or absolute)
     */
    basename(path: string, sep: string = '/') {
        this.logServ.debug(`basename:\t Original ${path}`);

        let name = path.substr(path.lastIndexOf(sep) + 1);

        this.logServ.debug(`basename:\t Final ${name}`);

        return name;
    }

    /**
     * Check if the path is the current working directory.
     *
     * If not already a FileSystemURL, path will be converted.
     *
     * @param path Path to check against
     */
    pathIsCwd(path: string): boolean {
        // Make sure our cwd matches the real filer cwd
        this.updateCwd();

        // Convert to a filesystem URL
        path = this.filer.pathToFilesystemURL(path);
        // this.logServ.debug(`pathIsCwd:\t Compare path: ${path} to ${this.cwdSubject.value}`);

        return path === this.cwdSubject.value;
    }

    /**
     * Bypass restrictions that mark filesystem URLs as unsafe.
     *
     * @param path URL or path to sanitize
     */
    sanitizeFsUrl(path: string): SafeUrl {
        path = this.filer.pathToFilesystemURL(path);

        return this.sanitizer.bypassSecurityTrustUrl(path);
    }

    /**
     * Update usage statistics.
     *
     * Alias for df() right now.
     */
    async updateUsage() {
        return this.df();
    }

    /**
     * Update the current path.
     */
    updateCwd() {
        this.cwdSubject.next(this.filer.pathToFilesystemURL(this.filer.cwd.fullPath));
    }

    async updateCwdFileList() {
        // Make sure our cwd matches the real filer cwd
        this.updateCwd();

        return this.ls(this.cwdSubject.value);
    }

    /**
     * Check the Filesystem quota to see if we need to request
     * more space from the user.
     * If a known amount of data is expected, expand to fit that write.
     *
     * @param nextWriteSize Size of next expected write in bytes
     */
    async checkQuota(nextWriteSize: number = 0): Promise<number> {
        return this.df()
        .then((usage) => {
            if (usage.used + nextWriteSize + this.FS_MIN_FREE_SPACE > usage.capacity) {
                return this.increaseQuota(nextWriteSize + this.FS_INCREASE_INCREMENT);
            } else {
                return Promise.resolve(0);
            }
        });
    }

    /**
     * Request permission to expand the filesystem.
     *
     * @param increaseAmt Increase amount in bytes
     */
    async increaseQuota(bytes: number): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            navigator.webkitPersistentStorage.requestQuota(this.usageSubject.value.capacity + bytes, (grantedBytes) => {
                this.logServ.debug(`quota:\t Filesystem expanded to: ${this.toMB(grantedBytes)} MB`);

                this.updateUsage();
                this.logServ.debug(`quota:\t Received ${grantedBytes} bytes.`);
                resolve(grantedBytes);
            }, (e) => {
                this.logServ.error(e, `Quota increase failed.`);
                reject(`Quota increase failed: ${e.message}`);
            })
        });
    }

    /**
     * List files.
     *
     * @param path Path to list files for. Defaults to '.'
     * @returns Promise that resolves to array of FileEntry objects for the directory
     */
    async ls(path: string = '.'): Promise<FileSystemEntry[]> {
        return new Promise<FileSystemEntry[]>((resolve, reject) => {
            this.filer.ls(path, (entries: FileSystemEntry[]) => {

                // Update subscribers if we're listing the cwd
                if (this.pathIsCwd(path)) {
                    this.cwdFileListSubject.next(entries);
                }

                resolve(entries);
            }, (e) => {
                this.logServ.error(e, `Failed to list files for ${path}.`);
                reject(`Failed to list files for ${path}: ${e.message}`);
            });
        });
    }

    /**
     * Check total filesystem usage.
     *
     * @return Promise which resolves to FileSystemUsage object
     */
    async df(): Promise<FileSystemUsage> {
        return new Promise<FileSystemUsage>((resolve, reject) => {
            this.filer.df((used: number, free: number, cap: number) => {
                let usage = {
                    used: used,
                    free: free,
                    capacity: cap
                };

                // Update the behavior subject
                this.usageSubject.next(usage);
                resolve(usage);
            }, (e) => {
                this.logServ.error(e, `Usage fetch failed.`);
                reject(`Usage fetch failed: ${e.message}`);
            });
        });
    }

    /**
     * Change directories.
     *
     * @param path Relative or absolute filepath
     * @return Promise which resolves to the DirectoryEntry for path
     */
    async cd(path: string): Promise<FileSystemDirectoryEntry> {
        return new Promise<FileSystemDirectoryEntry>((resolve, reject) => {
            this.filer.cd(path, (dirEntry) => {
                // Update the cwd and file entries
                this.updateCwd();
                this.updateCwdFileList();

                resolve(dirEntry);
            }, (e) => {
                this.logServ.error(e, `cd to ${path} failed.`);
                reject(`cd to ${path} failed: ${e.message}`);
            });
        });
    }

    /**
     * Check if a file or folder already exists.
     *
     * @param path Relative or absolue filepath
     * @return Promise which resolves to truthiness of existence
     */
    async exists(path: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.filer.exists(path, () => {
                this.logServ.debug(`exists:\t File ${path} already exists.`);
                resolve(true);
            }, () => {
                this.logServ.debug(`exists:\t File ${path} did not exist.`);
                resolve(false);
            });
        });
    }

    /**
     * Create a directory or set of directories.
     * This will create intermediate directories.
     *
     * @param path Path of folders to create
     * @param errorOnExists Reject if the directory already exists. Defaults false
     * @return Promise which resolves to DirectoryEntry for path
     */
    async mkdir(path: string, errorOnExists: boolean = false): Promise<FileSystemDirectoryEntry> {
        return new Promise<FileSystemDirectoryEntry>((resolve, reject) => {
            this.filer.mkdir(path, errorOnExists, (dirEntry) => {
                this.logServ.debug(`mkdir:\t Created directory ${path}.`);

                // Update the file list as we may have modified the cwd
                this.updateCwdFileList();
                this.updateUsage();

                resolve(dirEntry);
            }, (e) => {
                this.logServ.error(e, `Failed to create directory ${path}.`);
                reject(`Failed to create directory ${path}: ${e.message}`);
            });
        });
    }

    /**
     * Remove a file or directory.
     *
     * @param path Path to file or directory
     * @return Promise which resolves to
     */
    async rm(path: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.filer.rm(path, () => {
                this.logServ.debug(`rm:\t Removed ${path} from filesystem.`);

                // Update the file list as we may have modified the cwd
                this.updateCwdFileList();
                this.updateUsage();

                resolve(true);
            }, (e) => {
                this.logServ.error(e, `Failed to remove ${path}.`);
                reject(`Failed to remove ${path}: ${e.message}`);
            });
        });
    }

    /**
     * Copy a file.
     *
     * @param src Soure file path
     * @param dest Destination file path
     * @param newName New name under which to write file
     * @return Promise which resolves to FileEntry of destination file
     */
    async cp(src: string, dest: string, newName: string = null): Promise<FileSystemEntry> {
        return new Promise<FileSystemEntry>((resolve, reject) => {
            this.filer.cp(src, dest, newName, (entry) => {
                this.logServ.debug(`cp:\t Copied ${src} to ${dest}/${newName}.`);

                // Update the file list as we may have modified the cwd
                this.updateCwdFileList();
                this.updateUsage();

                resolve(entry);
            }, (e) => {
                this.logServ.error(e, `Failed to copy ${src} to ${dest}.`);
                reject(`Failed to copy ${src} to ${dest}: ${e.message}`);
            });
        });
    }

    /**
     * Move a file.
     *
     * @param src Soure file path
     * @param dest Destination file path
     * @param newName New name under which to write file
     * @return Promise which resolves to FileEntry of destination file
     */
    async mv(src: string, dest: string, newName?: string): Promise<FileSystemEntry> {
        return new Promise<FileSystemEntry>((resolve, reject) => {
            this.filer.mv(src, dest, newName, (entry) => {
                this.logServ.debug(`mv:\t Moved ${src} to ${dest}/${newName}.`);

                // Update the file list as we may have modified the cwd
                this.updateCwdFileList();

                resolve(entry);
            }, (e) => {
                this.logServ.error(e, `Failed to move ${src} to ${dest}.`);
                reject(`Failed to move ${src} to ${dest}: ${e.message}`);
            });
        });
    }

    /**
     * Open a file system file.
     *
     * @param path Path to open
     * @return File object of opened file
     */
    async open(path: string): Promise<File> {
        return new Promise<File>((resolve, reject) => {
            this.filer.open(path, (file) => {
                this.logServ.debug(`open:\t Opened ${path}.`);

                resolve(file);
            }, (e) => {
                this.logServ.error(e, `Failed to open ${path}.`);
                reject(`Failed to open ${path}: ${e.message}`);
            });
        });
    }

    /**
     * Write data to the filesystem.
     *
     * @param path Path to file. Parent folders must exist
     * @param data Object describing data to write
     * @return Promise which resolves to the FileEntry for path
     */
    async write(path: string, data: FileSystemData): Promise<FileSystemEntry> {
        return new Promise<FileSystemEntry>(async (resolve, reject) => {

            // Increase quota before writing if we need to
            await this.checkQuota((data.size) ? data.size : 0);

            // Check if the file already exists
            if (await this.exists(path)) {
                let confirm = await this.logServ.confirm(`${path} already exists. Would you like to overwrite?`);

                if (!confirm) {
                    this.logServ.debug(`write:\t Declined overwrite of ${path}`);
                    reject('Overwrite cancelled.');
                    return;
                } else {
                    this.logServ.debug(`write:\t Accepted overwrite of ${path}`);
                }
            }

            // Continue with normal write
            this.filer.write(path, data, (fileEntry, fileWriter) => {
                this.logServ.debug(`write:\t File ${path} was added to storage.`);

                // Update the file list as we may have modified the cwd
                this.updateCwdFileList();
                this.updateUsage();

                resolve(fileEntry);
            }, (e) => {
                this.logServ.error(e, `Failed to write ${path}.`);
                reject(`Failed to write ${path}: ${e.message}`);
            });
        });
    }

    /**
     * Zip the contents of a folder using JZip and download it.
     *
     * @param dir Directory to be zipped
     * @param name Name of output zip. Defaults to directory name
     */
    async downloadAsZip(dir: FileSystemDirectoryEntry, name: string = dir.name) {
        this.logServ.debug(`zip:\t Creating zip with name ${name}...`);

        let promises = [];
        let zip = new JSZip();
        await this.addEntryToZip(zip, dir, promises, true);

        console.log('zip:\t Promise list -- ');
        console.dir(promises);

        // Wait for all files to open and add
        Promise.all(promises)
        .then(() => {
            this.logServ.debug(`zip:\t File list --`);
            this.logServ.debug(zip.files);

            zip.generateAsync({
                type: "uint8array",
                streamFiles: false
            }).then((content) => {
                // Start a download straight to disk using StreamSaver.js
                let fileStream = streamSaver.createWriteStream(`${name}.zip`);
                let writer = fileStream.getWriter();

                writer.write(content);

                writer.close();
                console.log("Downloaded zip");
            });
        });
    }

    /**
     * Add a file or directory using JSZip.
     * Directories will be added recursively.
     *
     * @param zip Root JSZip object
     * @param entry FileSystemEntry to add
     * @param topLevel Control whether the top level directory is created within the zip
     */
    async addEntryToZip(parent, entry: FileSystemEntry, promises: Promise<File>[], topLevel: boolean = false) {
        if (entry.isFile) {
            this.logServ.debug(`zip:\t Added file ${entry.fullPath}`);

            let filePromise = this.open(entry.fullPath);
            promises.push(filePromise);
            parent.file(entry.name, filePromise);
        }

        if (entry.isDirectory) {
            this.logServ.debug(`zip:\t Found subfolder ${entry.fullPath}`);

            if (!topLevel) {
                parent = parent.folder(entry.name);
            }

            let fileList = await this.ls(this.filer.pathToFilesystemURL(entry.fullPath));
            for (let i = 0; i < fileList.length; i++) {
                await this.addEntryToZip(parent, fileList[i], promises);
            }
        }
    }
}
