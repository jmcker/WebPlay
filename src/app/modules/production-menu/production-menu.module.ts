import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductionMenuRoutingModule } from './production-menu-routing.module';
import { FileBrowserModule } from '@app/modules/file-browser/file-browser.module'
import { SharedModule } from '@app/modules/shared/shared.module';

import { ProductionMenuComponent } from './production-menu/production-menu.component';
import { MenuBarComponent } from './components/menu-bar/menu-bar.component';

@NgModule({
    declarations: [ProductionMenuComponent, MenuBarComponent],
    imports: [
        CommonModule,
        ProductionMenuRoutingModule,
        FileBrowserModule,
        SharedModule
    ]
})
export class ProductionMenuModule { }
