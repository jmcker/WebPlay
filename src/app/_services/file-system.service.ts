import { Injectable } from '@angular/core';

import Filer from 'src/app/ext/filer.js';
import { BehaviorSubject, Subject } from 'rxjs';
import { FileSystemUsage } from '../_models/file-system-usage';
import { LogService } from './log.service';

@Injectable({
    providedIn: 'root'
})
export class FileSystemService {

    /**
     * Initial capacity
     */
    readonly FS_INIT_CAPACITY: number = 200 * 1024 * 1024;

    /**
     * Behavior subject for filesystem usage
     */
    private usageSubject = new BehaviorSubject<FileSystemUsage>({
        used: 0,
        free: 0,
        capacity: 0
    });
    /**
     * Obserable that can be subscribed to to receive usage changes
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
     * Obserable that can be subscribed to to receive path changes
     */
    get cwd$() {
        return this.cwdSubject.asObservable();
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
                resolve(fs);
            }, (e) => {
                this.logServ.error(`Failed to open file system.`);
                this.logServ.error(e);
            });

        });
    }

    /**
     * Convert bytes to mebibytes (MB).
     * @param bytes Number of bytes
     */
    toMB(bytes: number): number {
        return parseFloat((bytes / 1024.0 / 1024.0).toFixed(2));
    }
    
    /**
     * Update usage statistics.
     */
    updateUsage() {
        let self = this;
        this.filer.df(function (used: number, free: number, cap: number) {
            self.usageSubject.next({
                used: self.toMB(used),
                free: self.toMB(free), 
                capacity: self.toMB(cap)
            });
        });
    }

    updateCwd() {
        this.cwdSubject.next(this.filer.pathToFilesystemURL(this.filer.cwd.fullPath));
    }

}
