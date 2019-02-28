import { Component, OnInit, NgZone } from '@angular/core';
import { FileSystemService } from 'src/app/_services/file-system.service';
import { FileSystemEntry } from 'src/app/_models/file-system-entry';
import { LogService } from 'src/app/_services/log.service';
import { debounceTime } from 'rxjs/operators';
import { FileSystemDirectoryEntry } from 'src/app/_models/file-system-directory-entry';

@Component({
    selector: 'app-file-list',
    templateUrl: './file-list.component.html',
    styleUrls: ['./file-list.component.css']
})
export class FileListComponent implements OnInit {

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
}
