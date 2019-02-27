import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FileSystemService } from 'src/app/_services/file-system.service';
import { Observable } from 'rxjs';
import { LogService } from 'src/app/_services/log.service';
import { FileSystemUsage } from 'src/app/_models/file-system-usage';

@Component({
    selector: 'app-usage-display',
    templateUrl: './usage-display.component.html',
    styleUrls: ['./usage-display.component.css']
})
export class UsageDisplayComponent implements OnInit {

    private usage: FileSystemUsage;

    constructor(
        private fss: FileSystemService,
        private logServ: LogService,
    ) {
        this.logServ.debug(fss);
    }

    ngOnInit() {
        this.fss.usage$.subscribe((usage: FileSystemUsage) => {
            this.usage = this.fss.usageToMB(usage);
        });
    }

}
