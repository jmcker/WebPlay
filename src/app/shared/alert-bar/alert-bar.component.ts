import { Component, OnInit } from '@angular/core';
import { LogService } from '@app/_services/log.service';

@Component({
    selector: 'app-alert-bar',
    templateUrl: './alert-bar.component.html',
    styleUrls: ['./alert-bar.component.css']
})
export class AlertBarComponent implements OnInit {

    public msgList = [];

    constructor(
        public logServ: LogService,
    ) { }

    ngOnInit() {
        this.logServ.msgList$.subscribe((msg) => {
            this.msgList.push(msg);
            // TODO: Implement timeout
        });
    }

}
