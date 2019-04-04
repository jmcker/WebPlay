import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { FileSystemEntry } from '@app/_models/file-system-entry';
import { FileSystemDirectoryEntry } from '@app/_models/file-system-directory-entry';
import { LogService } from '@app/_services/log.service';
import { FileBrowserMode } from '@app/_models/file-browser-mode.enum';
import { isNull } from 'util';
import { FileSystemService } from '@app/_services/file-system.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-file-browser',
    templateUrl: './file-browser.component.html',
    styleUrls: ['./file-browser.component.css']
})
export class FileBrowserComponent implements OnInit {

    @Input() public set mode(value: string) {
        if (value === "BROWSE") {
            this._mode = FileBrowserMode.BROWSE;
        } else if (value === "SELECT") {
            this._mode = FileBrowserMode.SELECT;
        } else {
            this.logServ.error(`FileBrowserComp:\t Unknown mode input: ${value}`);
            this._mode = FileBrowserMode.BROWSE;
        }
    };
    @Output() selected = new EventEmitter<string>();

    @ViewChild('fileUpload') fileUpload;

    /**
     * Enum indicating whether the file browser is in browsing mode
     * or selection mode.
     */
    private _mode: FileBrowserMode = FileBrowserMode.BROWSE;

    /**
     * FileSystemEntry that is currently being previewed.
     * null when not previewing.
     */
    public previewEntry: FileSystemEntry = null;

    constructor(
        private logServ: LogService,
        private fss: FileSystemService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    async ngOnInit() {
        this.logServ.debug(`FileBrowserComp:\t Mode is ${this._mode}`);

        // Make sure filesystem is good to go
        await this.fss.initPromise;
    }

    /**
     * If in select mode, let our parent know that an item has been selected.
     * Otherwise, defer behavior to preview().
     *
     * @param entry FileEntry to be selected
     */
    select(entry: FileSystemEntry) {
        this.logServ.debug('FileBrowserComp:\t Select event received.');

        // Treat selection like preview unless we're in selection mode
        if (this._mode !== FileBrowserMode.SELECT) {
            this.preview(entry);
            return;
        }

        this.logServ.debug('FileBrowserComp:\t Selected event emitted.');
        this.selected.emit(entry.fullPath);
    }

    /**
     * Open the preview window and preview the given file.
     *
     * @param entry FileEntry to be previewed
     */
    preview(entry: FileSystemEntry) {
        this.logServ.debug('FileBrowserComp:\t Preview event received.');

        this.previewEntry = entry;
    }

    /**
     * Close the preview window and cleanup.
     */
    endPreview() {
        this.logServ.debug('FileBrowserComp:\t End preview event received.');

        this.previewEntry = null;
    }

    /**
     * Launch the given production (TODO: or an item)
     *
     * @param entry FileEntry to be launched
     */
    launch(entry: FileSystemEntry) {
        this.logServ.debug('FileBrowserComp:\t Launch event received.');

    }

    /**
     * Zip the contents of a folder using JZip and download it.
     *
     * @param dir Directory to be zipped
     */
    createAndDownloadZip(dir: FileSystemDirectoryEntry) {
        this.logServ.debug('FileBrowserComp:\t Download zip event received.');

        this.fss.downloadAsZip(dir);
    }

    /**
     * Rename the given file or folder.
     *
     * @param entry FileEntry to be renamed
     */
    async rename(entry: FileSystemEntry) {
        this.logServ.debug('FileBrowserComp:\t Rename event received.');

        let newName = await this.logServ.prompt('Enter a new path (this can be used to move files between directories):', entry.name);

        if (isNull(newName)) {
            return;
        }

        // TODO: Develop less hackish way to move files between directories
        // Relies on user to type directory and name and cannot accomodate \ instead of /
        this.fss.mv(entry.name, this.fss.dirname(newName), this.fss.basename(newName));
    }

    /**
     * Delete the given file or folder.
     *
     * @param entry FileEntry to be deleted
     */
    async delete(entry: FileSystemEntry) {
        this.logServ.debug('FileBrowserComp:\t Delete event received.');

        let conf = await this.logServ.confirm(`Are you sure you want to delete '${entry.name}'?\nThis action cannot be undone.`);

        if (conf) {
            this.fss.rm(entry.fullPath);
        }
    }

    /**
     * Prompt the user for a name and create a new production.
     * Production will be created at root.
     */
    async newProduction() {
        // Move to root since nested productions aren't allowed
        await this.fss.cd('/');

        let prodName = '';
        while (prodName === '') {
            if (document.hasFocus()) {
                prodName = await this.logServ.prompt('Enter a name for the production:', 'New Production');

                if (prodName === null) {
                    return;
                }
            }
        }

        if (await this.fss.exists(prodName)) {
            this.logServ.alert(`'${prodName} already exists.'`);
            return;
        }

        await this.fss.mkdir(prodName);

        // TODO: Initialize production file?
        // TODO: Launch show?
    }

    /**
     * Prompt the user for a name and create a new folder.
     */
    async newFolder() {
        let folderName = await this.logServ.prompt('Enter folder name:', 'New Folder');

        if (isNull(folderName)) {
            return;
        }

        // Make sure folder doesn't already exist
        if (await this.fss.exists(folderName)) {
            this.logServ.alert(`'${folderName}' already exists.`);
            return;
        }

        await this.fss.mkdir(folderName);
    }
}
