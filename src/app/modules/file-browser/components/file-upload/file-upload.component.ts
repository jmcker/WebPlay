import { Component, OnInit, ViewChild } from '@angular/core';
import { FileSystemService } from '@app/_services/file-system.service';
import { LogService } from '@app/_services/log.service';
import { WebkitFile } from '@app/_models/webkit-file';

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
            // Each file will individually print an error if it fails
            // This isn't really helpful as a summary since it fails fast on the first issue
            this.logServ.debug('1 or more files were not stored.');
        });
    }

    /**
     * Write the files contained in a folder once the user selects them
     * This will create the subfolder if not already present
     */
    async onFolderAdded() {
        const files: WebkitFile[] = this.folderUpload.nativeElement.files;
        let promises = [];

        for (let i = 0; i < files.length; i++) {
            // Create parent folder and any subfolders
            let parentPath = this.fss.dirname(files[i].webkitRelativePath);
            this.logServ.debug(`FileUploadComp:\t Creating parent path ${parentPath}`);
            await this.fss.mkdir(parentPath);

            this.logServ.debug(`Writing file ${files[i].webkitRelativePath}`);
            promises.push(this.fss.write(files[i].webkitRelativePath, { isFile: true, data: files[i], type: files[i].type, size: files[i].size }));
        }

        Promise.all(promises)
        .then(() => {
            this.logServ.info('All files stored successfully.');
        })
        .catch((e) => {
            // Each file will individually print an error if it fails
            // This isn't really helpful as a summary since it fails fast on the first issue
            this.logServ.debug('1 or more files were not stored.');
        });
    }
}
