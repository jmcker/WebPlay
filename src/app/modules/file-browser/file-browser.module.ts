import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileBrowserRoutingModule } from './file-browser-routing.module';
import { FileBrowserComponent } from './file-browser/file-browser.component';

@NgModule({
    declarations: [FileBrowserComponent],
    imports: [
        CommonModule,
        FileBrowserRoutingModule
    ]
})
export class FileBrowserModule { }
