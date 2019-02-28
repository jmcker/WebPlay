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

    @Output() select = new EventEmitter<FileSystemEntry>();
    @Output() preview = new EventEmitter<FileSystemEntry>();
    @Output() launch = new EventEmitter<FileSystemEntry>();
    @Output() zipDownload = new EventEmitter<FileSystemDirectoryEntry>();
    @Output() rename = new EventEmitter<RenameInfo>();
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
            this.logServ.debug(`FileListComp: Re-render triggered.`);

            this.ngZone.run(() => {
                this.entries = entries;
            });
        });
    }

    doSelect(entry: FileSystemEntry) {
        this.select.emit(entry);
    }

    doPreview(entry: FileSystemEntry) {
        this.preview.emit(entry);
    }

    doLaunch(entry: FileSystemEntry) {
        this.launch.emit(entry);
    }

    doZipDownload(directory: FileSystemDirectoryEntry) {
        this.zipDownload.emit(directory);
    }

    doRename(info: RenameInfo) {
        this.rename.emit(info);
    }

    doDelete(entry: FileSystemEntry) {
        this.delete.emit(entry);
    }
}
