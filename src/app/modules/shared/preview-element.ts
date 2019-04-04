import { FileSystemEntry } from '@app/_models/file-system-entry';
import { FileSystemService } from '@app/_services/file-system.service';
import { LogService } from '@app/_services/log.service';

export class PreviewElement {

    /**
    * FileSystemEntry that is currently being previewed.
    *
    * null when not in use.
    */
    public entry: FileSystemEntry = null;
    /**
     * Media element for currently previewing media.
     *
     * null when not in use.
     */
    public elem: HTMLElement = null;

    /**
     * File belonging to the currently previewing entry.
     *
     * null when not in use.
     */
    public file: File = null;
    /**
     * MIME type or extension of currently previewing file.
     * Empty if type could not be determined.
     */
    public fileType: string = '';

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

    readonly PREVIEWABLE_FILES = [
        ".as",
        ".txt",
        ".pl",
        ".h",
        ".cc", ".cpp",
        ".csv", ".tsv",
        ".js",
        ".sh",
        ".html"
    ];

    /**
     * @param entry File system entry belonging to the targeted media
     * @param parentElem Parent element to which the media element should be attached. Element is hidden if null
     */
    constructor(
        private fss: FileSystemService,
        private logServ: LogService
    ) { }

    /**
     * Remove the element from DOM and reset all properties of this object.
     */
    reset() {
        if (this.elem !== null) {
            this.elem.remove();
        }

        this.entry = null;
        this.elem = null;
        this.file = null;
        this.fileType = '';
        this.fileLastMod = '';
        this.fileExtension = '';
        this.status = '';
    }

    /**
     * Overwrite the existing entry with a new one.
     *
     * @param entry FileSystemEntry corresponding to the targeted media.
     */
    setEntry(entry: FileSystemEntry): void {
        this.reset();

        this.entry = entry;

        if (this.entry !== null) {
            this.status = 'Loading...';

            // Fetch the file from the filesystem
            this.fss.open(this.entry.name)
            .then((file) => {
                this.status = '';

                this.file = file;

                this.fileType = file.type;
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
     * Generate the DOM element that should be used to display the media.
     *
     * setEntry(entry) must be called prior to this.
     *
     * @param autoplay Control whether the media should start playing immediately. Defaults to true.
     */
    generateElem(autoplay: boolean = true): HTMLElement {
        if (this.entry === null || this.file === null) {
            return null;
        }

        // Return the existing element
        if (this.elem !== null) {
            return this.elem;
        }

        if (this.fileType.match(/audio.*/)) {
            let audioNode = new Audio(this.entry.toURL());
            audioNode.classList.add('preview-audio');
            audioNode.controls = true;
            audioNode.load();
            if (autoplay) {
                audioNode.play();
            }

            this.elem = audioNode;
        }
        else if (this.fileType.match(/video.*/)) {
            let videoNode = document.createElement('video');
            videoNode.classList.add('preview-video');
            videoNode.controls = true;
            videoNode.load();
            if (autoplay) {
                videoNode.play();
            }

            this.elem = videoNode;
        }
        else if (this.fileType.match(/image.*/)) {
            let imageNode = new Image();
            imageNode.classList.add('preview-image');

            // Fade in when image is loaded
            imageNode.addEventListener('load', () => {
                imageNode.style.opacity = '1';
            });

            imageNode.src = this.entry.toURL();

            this.elem = imageNode;
        }
        else if (this.fileType.match(/text.*|application\/pdf/)) {
            // TODO: Handle production files here?
            let frameNode = document.createElement('iframe');
            frameNode.classList.add('preview-iframe');

            frameNode.src = this.entry.toURL();
        }
        else if (this.PREVIEWABLE_FILES.indexOf(this.fileExtension) !== -1) {
            let textNode = document.createElement('textarea');
            textNode.classList.add('preview-text');

            // Read text
            let reader = new FileReader();
            reader.addEventListener('load', (e) => {
                textNode.textContent = reader.result.toString();
            });
            reader.readAsText(this.file);
        }
        else {
            // Unknown file type
            this.logServ.alert(`Could not preview ${this.file.name}.`);

            let unkNode = document.createElement('div');
            unkNode.innerHTML = `
                No preview available.<br>
                File type: ${ this.fileType }<br>
                Extension: ${ this.fileExtension }<br>
            `;

            this.elem = unkNode;
        }

        return this.elem;
    }
}
