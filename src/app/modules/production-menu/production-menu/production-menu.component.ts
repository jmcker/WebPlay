import { Component, OnInit } from '@angular/core';
import { FileBrowserComponent } from 'src/app/modules/file-browser/file-browser/file-browser.component';
import { FileBrowserMode } from 'src/app/_models/file-browser-mode.enum';

@Component({
    selector: 'app-production-menu',
    templateUrl: './production-menu.component.html',
    styleUrls: ['./production-menu.component.css']
})
export class ProductionMenuComponent implements OnInit {

    constructor() { }

    ngOnInit() {
    }

}
