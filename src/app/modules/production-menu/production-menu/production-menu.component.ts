import { Component, OnInit } from '@angular/core';
import { FileBrowserComponent } from '@app/modules/file-browser/file-browser/file-browser.component';
import { FileBrowserMode } from '@app/_models/file-browser-mode.enum';
import { ActivatedRoute, Router } from '@angular/router';
import { LogService } from '@app/_services/log.service';
import { FileSystemService } from '@app/_services/file-system.service';

@Component({
    selector: 'app-production-menu',
    templateUrl: './production-menu.component.html',
    styleUrls: ['./production-menu.component.css']
})
export class ProductionMenuComponent implements OnInit {

    constructor(
        private logServ: LogService,
        private fss: FileSystemService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    async ngOnInit() {
        // Make sure filesystem is good to go
        await this.fss.initPromise;
    }

}
