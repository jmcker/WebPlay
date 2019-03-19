import { Component, OnInit, Output, EventEmitter, HostListener } from '@angular/core';
import { LogService } from '@app/_services/log.service';
import { Key } from 'ts-keycode-enum';

@Component({
    selector: 'app-file-preview',
    templateUrl: './file-preview.component.html',
    styleUrls: ['./file-preview.component.css']
})
export class FilePreviewComponent implements OnInit {

    /**
     * Signal that the preview window should be closed.
     * Value of boolean argument does not change behavior.
     */
    @Output() close = new EventEmitter<boolean>();

    constructor(
        private logServ: LogService
    ) { }

    ngOnInit() {
    }

    /**
     * Listen for preview key events.
     * @param event Key event
     */
    @HostListener('window:keyup', ['$event'])
    keyEvent(event: KeyboardEvent) {
        if (event.keyCode === Key.Escape) {
            this.doClose();
        }
    }

    /**
     * Signal that the preview window should be closed.
     */
    doClose() {
        this.logServ.debug('FilePreviewComp:\t Close event emitted.');
        this.close.emit(true);
    }

}
