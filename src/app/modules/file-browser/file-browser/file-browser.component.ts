import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FileSystemEntry } from 'src/app/_models/file-system-entry';
import { FileSystemDirectoryEntry } from 'src/app/_models/file-system-directory-entry';
import { LogService } from 'src/app/_services/log.service';
import { FileBrowserMode } from 'src/app/_models/file-browser-mode.enum';

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
            this.logServ.debug(`FileBrowserComp:\t Unknown mode input: ${value}`);
            this._mode = FileBrowserMode.BROWSE;
        }
    };
    @Output() selected = new EventEmitter<string>();

    private _mode: FileBrowserMode = FileBrowserMode.BROWSE;
    public previewing: boolean = false;

    constructor(
        private logServ: LogService,
    ) { }

    ngOnInit() {
        this.logServ.debug(`FileBrowserComp:\t Mode is ${this._mode}`);
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

        this.previewing = true;
    }

    /**
     * Close the preview window and cleanup.
     */
    endPreview() {
        this.previewing = false;
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

    }

    /**
     * Rename the given file or folder.
     *
     * @param entry FileEntry to be renamed
     */
    rename(entry: FileSystemEntry) {
        this.logServ.debug('FileBrowserComp:\t Rename event received.');

    }

    /**
     * Delete the given file or folder.
     *
     * @param entry FileEntry to be deleted
     */
    delete(entry: FileSystemEntry) {
        this.logServ.debug('FileBrowserComp:\t Delete event received.');

    }

}
