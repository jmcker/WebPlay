import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FileBrowserComponent } from './file-browser/file-browser.component';
import { FilePreviewComponent } from './components/file-preview/file-preview.component';

const routes: Routes = [
    {
        path: '',
        component: FileBrowserComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class FileBrowserRoutingModule { }
