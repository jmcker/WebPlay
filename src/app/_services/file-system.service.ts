import { Injectable } from '@angular/core';

import Filer from 'src/app/ext/filer.js';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class FileSystemService {

    private fsCapacity: number = 200 * 1024 * 1024;
    private fsUsed: number = 0;

    private isOpen = new BehaviorSubject<boolean>(false);
    get isOpen$() {
        return this.isOpen.asObservable();
    }

    public filer = null;

    constructor() {
        console.log(Filer);

        this.filer = new Filer();
        console.log(this.filer);

        // Initialize the file file system using the filer.js library
        this.filer.init({
            persistent: true,
            size: this.fsCapacity
        }, (fs) => {
            console.log(`Opened FileSystem: ${fs.name}.`);

            // Emit event
            this.isOpen.next(true);
        }, (e) => {
            console.log(`Failed to open file system.`);
            console.dir(e);
        });
    }
}
