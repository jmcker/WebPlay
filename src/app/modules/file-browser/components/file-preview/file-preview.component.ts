import { Component, OnInit, Output, EventEmitter, HostListener, Input, OnChanges, SimpleChanges } from '@angular/core';
import { LogService } from '@app/_services/log.service';
import { Key } from 'ts-keycode-enum';
import { FileSystemEntry } from '@app/_models/file-system-entry';
import { FileSystemService } from '@app/_services/file-system.service';

@Component({
    selector: 'app-file-preview',
    templateUrl: './file-preview.component.html',
    styleUrls: ['./file-preview.component.css']
})
export class FilePreviewComponent implements OnInit, OnChanges {

    /**
     * Entry that is being previewed.
     */
    @Input() entry: FileSystemEntry = null;

    /**
     * Signal that the preview window should be closed.
     * Value of boolean argument does not change behavior.
     */
    @Output() close = new EventEmitter<boolean>();

    /**
     * MIME type or extension of currently previewing file.
     * Default ''.
     */
    public fileType: string = '';

    /**
     * Size of the currently previewing file in bytes.
     * Default 0.
     */
    public fileSize: number = 0;

    /**
     * Local date/time string indicating last modification.
     */
    public fileLastMod: string = '';

    /**
     * Extension of currently previewing file.
     */
    public fileExtension: string = '';

    /**
     * Status messaage to display to the user within the preview window.
     */
    public status: string = '';

    constructor(
        private logServ: LogService,
        public fss: FileSystemService
    ) { }

    ngOnInit() {
    }

    ngOnChanges(changes: SimpleChanges) {
        this.reset();

        if (this.entry !== null) {
            this.status = 'Loading...';

            // Fetch the file from the filesystem
            this.fss.open(this.entry.name)
            .then((file) => {
                this.status = '';

                this.fileType = file.type;
                this.fileSize = file.size;
                this.fileExtension = this.fss.basename(file.name, '.');

                // Fallback to extension if MIME type is not defined
                if (!file.type) {
                    this.fileType = this.fileExtension;
                }

                this.fileLastMod = new Date(file.lastModified).toLocaleString();
            })
            .catch((e) => {
                this.logServ.error(e, `Could not load '${this.entry.name}'.`);
                this.status = `Could not load '${this.entry.name}'.\n${e.message}`;

                this.reset();
            });
        }
    }

    /**
     * Listen for preview key events.
     * @param event Key event
     */
    @HostListener('window:keyup', ['$event'])
    keyEvent(event: KeyboardEvent) {
        if (event.keyCode === Key.Escape) {
            this.close.emit(true);
        }
    }

    /**
     * Remove the element from DOM and reset all properties of this object.
     */
    reset() {
        this.fileType = '';
        this.fileSize = 0;
        this.fileLastMod = '';
        this.fileExtension = '';
        this.status = '';
    }
}
