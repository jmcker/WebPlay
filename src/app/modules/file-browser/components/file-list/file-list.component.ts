import { Component, OnInit, NgZone, Output, EventEmitter } from '@angular/core';
import { FileSystemService } from '@app/_services/file-system.service';
import { FileSystemEntry } from '@app/_models/file-system-entry';
import { LogService } from '@app/_services/log.service';
import { debounceTime } from 'rxjs/operators';
import { FileSystemDirectoryEntry } from '@app/_models/file-system-directory-entry';

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

    public entries: FileSystemEntry[];

    constructor(
        public fss: FileSystemService,
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
}
