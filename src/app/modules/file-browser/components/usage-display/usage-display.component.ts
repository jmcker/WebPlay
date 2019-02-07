import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-usage-display',
    templateUrl: './usage-display.component.html',
    styleUrls: ['./usage-display.component.css']
})
export class UsageDisplayComponent implements OnInit {

    private free: number = 0;
    private used: number = 0;
    private capacity: number = 0;

    constructor() { }

    ngOnInit() {
    }

}
