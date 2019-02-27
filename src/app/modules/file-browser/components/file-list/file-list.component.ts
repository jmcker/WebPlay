import { Component, OnInit, NgZone } from '@angular/core';
import { FileSystemService } from 'src/app/_services/file-system.service';
import { LogService } from 'src/app/_services/log.service';
import { debounceTime } from 'rxjs/operators';

@Component({
    selector: 'app-file-list',
    templateUrl: './file-list.component.html',
    styleUrls: ['./file-list.component.css']
})
export class FileListComponent implements OnInit {

    private entries: any[];

    constructor(
        private fss: FileSystemService,
        private logServ: LogService,
        private ngZone: NgZone
    ) { }

    ngOnInit() {
        this.fss.cwdFileList$
        .pipe(debounceTime(500))
        .subscribe((entries) => {
            this.logServ.debug(`File list re-render triggered.`);
            this.logServ.debug(entries);

            this.ngZone.run(() => {
                this.entries = entries;
            });
        });
    }

}
