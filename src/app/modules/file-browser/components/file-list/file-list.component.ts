import { Component, OnInit, NgZone, Output, EventEmitter } from '@angular/core';
import { FileSystemService } from 'src/app/_services/file-system.service';
import { FileSystemEntry } from 'src/app/_models/file-system-entry';
import { LogService } from 'src/app/_services/log.service';
import { debounceTime } from 'rxjs/operators';
import { FileSystemDirectoryEntry } from 'src/app/_models/file-system-directory-entry';

/**
 * Paired info for the rename event.
 */
interface RenameInfo {
    entry: FileSystemEntry;
    newName: string;
}

@Component({
    selector: 'app-file-list',
    templateUrl: './file-list.component.html',
    styleUrls: ['./file-list.component.css']
})
export class FileListComponent implements OnInit {

    /**
     * Emitted when an entry is selected.
     */
    @Output() select = new EventEmitter<FileSystemEntry>();
    /**
     * Emitted when the preview button is clicked on an entry.
     */
    @Output() preview = new EventEmitter<FileSystemEntry>();
    /**
     * Emitted when the launch button is clicked on folder or .wpjs file.
     */
    @Output() launch = new EventEmitter<FileSystemEntry>();
    /**
     * Emitted when the download button is clicked on a folder.
     */
    @Output() zipDownload = new EventEmitter<FileSystemDirectoryEntry>();
    /**
     * Emitted when rename button is clicked on an entry.
     */
    @Output() rename = new EventEmitter<RenameInfo>();
    /**
     * Emitted when delete button is clicked on an entry.
     */
    @Output() delete = new EventEmitter<FileSystemEntry>();

    private entries: FileSystemEntry[];

    constructor(
        private fss: FileSystemService,
        private logServ: LogService,
        private ngZone: NgZone
    ) { }

    ngOnInit() {
        this.fss.cwdFileList$
        .pipe()
        .subscribe((entries) => {
            this.logServ.debug(`FileListComp:\t Re-render triggered.`);

            this.ngZone.run(() => {
                this.entries = entries;
            });
        });
    }

    /**
     * Emit the select event.
     * @param entry FileEntry to be selected
     */
    doSelect(entry: FileSystemEntry) {
        this.logServ.debug('FileListComp:\t Select event emitted.');
        this.select.emit(entry);
    }

    /**
     * Emit the preview event.
     * @param entry FileEntry to be previewed
     */
    doPreview(entry: FileSystemEntry) {
        this.logServ.debug('FileListComp:\t Preview event emitted.');
        this.preview.emit(entry);
    }

    /**
     * Emit the launch event.
     * @param entry FileEntry to be launched
     */
    doLaunch(entry: FileSystemEntry) {
        this.logServ.debug('FileListComp:\t Launch event emitted.');
        this.launch.emit(entry);
    }

    /**
     * Emit the download event.
     * @param entry Directory to be zipped and downloaded
     */
    doZipDownload(directory: FileSystemDirectoryEntry) {
        this.logServ.debug('FileListComp:\t Zip download event emitted.');
        this.zipDownload.emit(directory);
    }

    /**
     * Emit the rename event.
     * @param entry FileEntry to be renamed
     */
    doRename(info: RenameInfo) {
        this.logServ.debug('FileListComp:\t Rename event emitted.');
        this.rename.emit(info);
    }

    /**
     * Emit the delete event.
     * @param entry FileEntry to be deleted
     */
    doDelete(entry: FileSystemEntry) {
        this.logServ.debug('FileListComp:\t Delete event emitted.');
        this.delete.emit(entry);
    }
}
