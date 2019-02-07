import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-filepath-display',
    templateUrl: './filepath-display.component.html',
    styleUrls: ['./filepath-display.component.css']
})
export class FilepathDisplayComponent implements OnInit {

    private path: string = "filesystem:http://example-path";

    constructor() { }

    ngOnInit() {
    }

}
