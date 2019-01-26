import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ProductionMenuComponent } from './production-menu/production-menu.component';

const routes: Routes = [
    {
        path: '',
        component: ProductionMenuComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ProductionMenuRoutingModule {}
