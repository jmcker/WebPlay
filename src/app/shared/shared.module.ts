import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertBarComponent } from './alert-bar/alert-bar.component';
import { HTMLMediaComponent } from './html-media/html-media.component';

@NgModule({
    declarations: [
        AlertBarComponent,
        HTMLMediaComponent
    ],
    imports: [
        CommonModule
    ],
    exports: [
        AlertBarComponent,
        HTMLMediaComponent
    ]
})
export class SharedModule { }
