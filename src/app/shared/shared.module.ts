import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertBarComponent } from './alert-bar/alert-bar.component';

@NgModule({
    declarations: [
        AlertBarComponent
    ],
    imports: [
        CommonModule
    ],
    exports: [
        AlertBarComponent
    ]
})
export class SharedModule { }
