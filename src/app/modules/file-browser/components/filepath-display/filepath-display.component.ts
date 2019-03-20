import { Component, OnInit } from '@angular/core';
import { LogService } from '@app/_services/log.service';
import { FileSystemService } from '@app/_services/file-system.service';

@Component({
    selector: 'app-filepath-display',
    templateUrl: './filepath-display.component.html',
    styleUrls: ['./filepath-display.component.css']
})
export class FilepathDisplayComponent implements OnInit {

    public cwd: string;

    constructor(
        private fss: FileSystemService,
        private logServ: LogService,
    ) { }

    ngOnInit() {
        this.fss.cwd$.subscribe((cwd) => {
            this.cwd = cwd;
        });
    }

}
