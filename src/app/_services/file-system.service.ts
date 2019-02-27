import { Injectable } from '@angular/core';

import Filer from 'src/app/ext/filer.js';
import { BehaviorSubject, Subject } from 'rxjs';
import { FileSystemUsage } from '../_models/file-system-usage';
import { LogService } from './log.service';
import { FileSystemData } from '../_models/file-system-data';

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
    private cwdFileListSubject = new BehaviorSubject<any[]>([]);
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

    constructor(
        private logServ: LogService
    ) {
        this.filer = new Filer();
        logServ.debug(this.filer);

        this.init();
    }

    /**
     * THIS MUST RUN BEFORE THE SERVICE CAN BE TRUSTED TO WORK
     * Open an existing filesystem or prompt the user for permission
     * to create a new one.
     */
    async init(): Promise<any> {
        return new Promise((resolve, reject) => {

            // If we're already done
            if (this.filer !== null && this.filer.isOpen) {
                this.logServ.debug('Filesystem already initialized.');

                resolve(this.filer);
            }

            // Initialize the file file system using the filer.js library
            this.filer.init({
                persistent: true,
                size: this.FS_INIT_CAPACITY
            }, (fs) => {
                this.logServ.debug(`Opened FileSystem: ${fs.name}.`);

                this.updateCwd();
                this.updateUsage();
                resolve(this.filer);
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
     * Note: This will turn the path into a filesystem URL
     *
     * @param path Path of file or directory as filesystem URL
     */
    dirname(path: string) {
        this.logServ.debug(`dirname of ${path}:`);

        path = this.filer.pathToFilesystemURL(path);

        let parts = path.split('/');
        parts.pop();

        this.logServ.debug(`${parts.join('/')}`);

        return parts.join('/');
    }

    /**
     * Check if the path is the current working directory.
     *
     */
    pathIsCwd(path: string): boolean {
        // Make sure our cwd matches the real filer cwd
        this.updateCwd();

        // Convert to a filesystem URL
        path = this.filer.pathToFilesystemURL(path);
        this.logServ.debug(`Compare path: ${path} to ${this.cwdSubject.value}`);

        return path === this.cwdSubject.value;
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
        return new Promise((resolve, reject) => {
            navigator.webkitPersistentStorage.requestQuota(this.usageSubject.value.capacity + bytes, (grantedBytes) => {
                this.logServ.debug(`Filesystem expanded to: ${this.toMB(grantedBytes)} MB`);

                this.updateUsage();
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
    async ls(path: string = '.'): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.filer.ls(path, (entries) => {

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
        return new Promise((resolve, reject) => {
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
    async cd(path: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.filer.cd(path, (dirEntry) => {
                this.logServ.debug(dirEntry);

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
        return new Promise((resolve, reject) => {
            this.filer.exists(path, () => {
                this.logServ.debug(`File ${path} already exists.`);
                resolve(true);
            }, () => {
                this.logServ.debug(`File ${path} did not exist.`);
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
    async mkdir(path: string, errorOnExists: boolean = false): Promise<any> {
        errorOnExists = errorOnExists || false;

        return new Promise((resolve, reject) => {
            this.filer.mkdir(path, errorOnExists, (dirEntry) => {
                this.logServ.debug(`Created directory ${path}.`);

                // Update the file list as we may have modified the cwd
                this.updateCwdFileList();

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
        return new Promise((resolve, reject) => {
            this.filer.rm(path, () => {
                this.logServ.debug(`Removed ${path} from filesystem.`);

                // Update the file list as we may have modified the cwd
                this.updateCwdFileList();

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
    async cp(src: string, dest: string, newName: string = null): Promise<any> {
        return new Promise((resolve, reject) => {
            this.filer.cp(src, dest, newName, (entry) => {
                this.logServ.debug(`Copied ${src} to ${dest}/${newName}.`);

                // Update the file list as we may have modified the cwd
                this.updateCwdFileList();

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
    async mv(src: string, dest: string, newName?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.filer.mv(src, dest, newName, (entry) => {
                this.logServ.debug(`Moved ${src} to ${dest}/${newName}.`);

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
    async open(path: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.filer.open(path, (file) => {
                this.logServ.debug(`Opened ${path}.`);

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
    async write(path: string, data: FileSystemData): Promise<any> {
        return new Promise(async (resolve, reject) => {

            // Increase quota before writing if we need to
            await this.checkQuota((data.size) ? data.size : 0);

            // Check if the file already exists
            if (await this.exists(path)) {
                let confirm = await this.logServ.confirm(`${path} already exists. Would you like to overwrite?`);

                if (!confirm) {
                    reject('Overwrite cancelled.');
                }
            }

            // Continue with normal write
            this.filer.write(path, data, (fileEntry, fileWriter) => {
                this.logServ.debug(`File ${path} was added to storage.`);

                // Update the file list as we may have modified the cwd
                this.updateCwdFileList();

                resolve(fileEntry);
            }, (e) => {
                this.logServ.error(e, `Failed to write ${path}.`);
                reject(`Failed to write ${path}: ${e.message}`);
            });
        });
    }

}
