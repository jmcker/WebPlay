import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductionMenuRoutingModule } from './production-menu-routing.module';
import { ProductionMenuComponent } from './production-menu/production-menu.component';

@NgModule({
    declarations: [ProductionMenuComponent],
    imports: [
        CommonModule,
        ProductionMenuRoutingModule
    ]
})
export class ProductionMenuModule { }
