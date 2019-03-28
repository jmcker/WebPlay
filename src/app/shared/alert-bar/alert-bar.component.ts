import { Component, OnInit, ViewChild } from '@angular/core';
import { LogService } from '@app/_services/log.service';

@Component({
    selector: 'app-alert-bar',
    templateUrl: './alert-bar.component.html',
    styleUrls: ['./alert-bar.component.css']
})
export class AlertBarComponent implements OnInit {

    @ViewChild('alertBar') alertBar;

    public msgList = [];

    constructor(
        public logServ: LogService,
    ) { }

    ngOnInit() {
        console.dir(this.alertBar);
        this.logServ.msgList$.subscribe((msg) => {
            console.log(this.generateId());

            let div = document.createElement('div');
            div.style.color = msg.color;
            div.innerHTML = msg.text;

            this.alertBar.nativeElement.appendChild(div);

            setTimeout(() => {
                div.remove();
            }, msg.duration * 1000);
        });
    }

    /**
     * Generate a random id using a combination of date and random number.
     *
     * Based on: https://gist.github.com/gordonbrander/2230317
     */
    generateId() {
        return '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

}
