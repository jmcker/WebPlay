import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'app-menu-bar',
    templateUrl: './menu-bar.component.html',
    styleUrls: ['./menu-bar.component.css']
})
export class MenuBarComponent implements OnInit {

    /**
     * Emitted when the New Production button is clicked.
     */
    @Output() newProduction = new EventEmitter<boolean>();

    /**
     * Emitted when the New Folder button is clicked.
     */
    @Output() newFolder = new EventEmitter<boolean>();

    /**
     * Emitted when the Upload Files button is clicked.
     */
    @Output() uploadFiles = new EventEmitter<boolean>();

    /**
     * Emitted when the Upload Folder button is clicked.
     */
    @Output() uploadFolder = new EventEmitter<boolean>();

    /**
     * Emitted when the Upload Show button is clicked.
     */
    @Output() uploadZip = new EventEmitter<boolean>();

    constructor() { }

    ngOnInit() {
    }

}
