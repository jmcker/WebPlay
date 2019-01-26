import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LiveProductionComponent } from './live-production/live-production.component';

const routes: Routes = [
    {
        path: '',
        component: LiveProductionComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class LiveProductionRoutingModule {}
