import { Component, OnInit, ViewChild } from '@angular/core';
import { FileSystemService } from 'src/app/_services/file-system.service';
import { LogService } from 'src/app/_services/log.service';

@Component({
    selector: 'app-file-upload',
    templateUrl: './file-upload.component.html',
    styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent implements OnInit {

    @ViewChild('file') fileUpload;
    @ViewChild('folder') folderUpload;

    constructor(
        private logServ: LogService,
        private fss: FileSystemService
    ) { }

    ngOnInit() {
    }

    /**
     * Open the file selection dialog
     */
    openFileDialog() {
        this.fileUpload.nativeElement.click();
    }

    /**
     * Open the folder selection dialog
     */
    openFolderDialog() {
        this.folderUpload.nativeElement.click();
    }

    /**
     * Write files to the file system once the user selects them
     */
    onFilesAdded() {
        const files: File[] = this.fileUpload.nativeElement.files;
        let promises = [];

        for (let i = 0; i < files.length; i++) {
            this.logServ.debug(`Writing file ${files[i].name}...`);
            promises.push(this.fss.write(files[i].name, { isFile: true, data: files[i], type: files[i].type, size: files[i].size }));
        }

        Promise.all(promises)
        .then(() => {
            this.logServ.info('All files stored successfully.');
        })
        .catch((e) => {
            this.logServ.alert('1 or more files failed to store.');
        });
    }

    /**
     * Write the files contained in a folder once the user selects them
     * This will create the subfolder if not already present
     */
    onFolderAdded() {
        const files: File[] = this.folderUpload.nativeElement.files;
        console.dir(this.folderUpload.nativeElement);

        for (let i = 0; i < files.length; i++) {
            // console.dir(files[i].webkitRelativePath);

            // TODO: Make folders and subfolders
            // TODO: Write files
        }
    }
}
