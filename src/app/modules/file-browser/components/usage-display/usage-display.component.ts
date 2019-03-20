import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FileSystemService } from '@app/_services/file-system.service';
import { Observable } from 'rxjs';
import { LogService } from '@app/_services/log.service';
import { FileSystemUsage } from '@app/_models/file-system-usage';

@Component({
    selector: 'app-usage-display',
    templateUrl: './usage-display.component.html',
    styleUrls: ['./usage-display.component.css']
})
export class UsageDisplayComponent implements OnInit {

    public usage: FileSystemUsage;

    constructor(
        private fss: FileSystemService,
        private logServ: LogService,
    ) { }

    ngOnInit() {
        this.fss.usage$.subscribe((usage: FileSystemUsage) => {
            this.usage = this.fss.usageToMB(usage);
        });
    }

}
