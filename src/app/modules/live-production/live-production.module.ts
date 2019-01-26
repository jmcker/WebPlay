import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveProductionRoutingModule } from './live-production-routing.module';
import { LiveProductionComponent } from './live-production/live-production.component';

@NgModule({
    declarations: [LiveProductionComponent],
    imports: [
        CommonModule,
        LiveProductionRoutingModule
    ]
})
export class LiveProductionModule { }
