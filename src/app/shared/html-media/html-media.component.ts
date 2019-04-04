import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FileSystemEntry } from '@app/_models/file-system-entry';
import { LogService } from '@app/_services/log.service';
import { FileSystemService } from '@app/_services/file-system.service';
import { isNullOrUndefined } from 'util';

@Component({
    selector: 'app-html-media',
    templateUrl: './html-media.component.html',
    styleUrls: ['./html-media.component.css']
})
export class HTMLMediaComponent implements OnInit, OnChanges {

    @Input() entry: FileSystemEntry = null;
    @Input() parent: HTMLElement = null;
    @Input() autoplay: boolean = false;

    private elem: HTMLElement = null;

    readonly PREVIEWABLE_FILES = [
        ".as",
        ".txt",
        ".pl",
        ".c",
        ".h", ".hpp",
        ".cc", ".cpp",
        ".csv", ".tsv",
        ".js",
        ".sh",
        ".html", ".htm"
    ];

    constructor(
        private logServ: LogService,
        private fss: FileSystemService
    ) { }

    ngOnInit() {
    }

    async ngOnChanges(changes: SimpleChanges) {

        // Can't do anything without an entry
        if (isNullOrUndefined(this.entry)) {
            return;
        }

        // Don't do anything if the entry hasn't changed
        if (changes.entry.currentValue === changes.entry.previousValue) {
            this.logServ.debug(`htmlmedia:\t No entry change detected.`);

            // Switch parents
            if (this.elem && changes.parent.currentValue !== changes.parent.previousValue) {
                this.logServ.debug(`htmlmedia:\t Only parent element change detected.`);

                this.elem.remove();
                this.parent.appendChild(this.elem);
            }

            return;
        }

        let extension = '.' + this.fss.basename(this.entry.name, '.');
        let file = await this.fss.open(this.entry.fullPath);

        let type = file.type;

        // Fallback to extension if MIME type is not defined
        if (!file.type) {
            type = extension;
        }

        // Remove previous
        if (this.elem !== null) {
            this.elem.remove();
            this.elem = null;
        }

        if (type.match(/audio.*/)) {
            let audioNode = new Audio(this.entry.toURL());
            audioNode.classList.add('preview-audio');
            audioNode.controls = true;
            audioNode.load();
            if (this.autoplay) {
                audioNode.play();
            }

            this.elem = audioNode;
        }
        else if (type.match(/video.*/)) {
            let videoNode = document.createElement('video');
            videoNode.src = this.entry.toURL();
            videoNode.classList.add('preview-video');
            videoNode.controls = true;
            videoNode.load();
            if (this.autoplay) {
                videoNode.play();
            }

            this.elem = videoNode;
        }
        else if (type.match(/image.*/)) {
            let imageNode = new Image();
            imageNode.classList.add('preview-image');

            // Fade in when image is loaded
            imageNode.addEventListener('load', () => {
                imageNode.style.opacity = '1';
            });

            imageNode.src = this.entry.toURL();

            this.elem = imageNode;
        }
        else if (type.match(/text.*|application\/pdf/)) {
            // TODO: Handle production files here?
            let frameNode = document.createElement('iframe');
            frameNode.classList.add('preview-iframe');

            frameNode.src = this.entry.toURL();

            this.elem = frameNode;
        }
        else if (this.PREVIEWABLE_FILES.indexOf(extension) !== -1) {
            let textNode = document.createElement('textarea');
            textNode.classList.add('preview-text');

            // Read text
            let reader = new FileReader();
            reader.addEventListener('load', (e) => {
                textNode.textContent = reader.result.toString();
            });
            reader.readAsText(file);

            this.elem = textNode;
        }
        else {
            // Unknown file type
            this.logServ.alert(`Could not preview ${this.entry.name}.`);

            let unkNode = document.createElement('div');
            unkNode.innerHTML = `
                No preview available.<br>
                File type: ${type}<br>
                Extension: ${extension}<br>
            `;

            this.elem = unkNode;
        }

        if (this.parent) {
            this.parent.appendChild(this.elem);
        }
    }

}
