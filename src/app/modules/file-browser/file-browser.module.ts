import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileBrowserRoutingModule } from './file-browser-routing.module';
import { FileBrowserComponent } from './file-browser/file-browser.component';
import { FilePreviewComponent } from './components/file-preview/file-preview.component';
import { FileListComponent } from './components/file-list/file-list.component';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { FilepathDisplayComponent } from './components/filepath-display/filepath-display.component';
import { UsageDisplayComponent } from './components/usage-display/usage-display.component';

@NgModule({
    declarations: [FileBrowserComponent, FilePreviewComponent, FileListComponent, FileUploadComponent, FilepathDisplayComponent, UsageDisplayComponent],
    imports: [
        CommonModule,
        FileBrowserRoutingModule
    ],
    exports: [
        FileBrowserComponent,
        FilePreviewComponent
    ]
})
export class FileBrowserModule { }
