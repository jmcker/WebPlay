import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// TODO: routes with names do not currently work
const routes: Routes = [
    {
        path: 'browse/:name',
        loadChildren: './modules/file-browser/file-browser.module#FileBrowserModule'
    },
    {
        path: 'browse',
        loadChildren: './modules/file-browser/file-browser.module#FileBrowserModule'
    },
    {
        path: 'live',
        loadChildren: './modules/live-production/live-production.module#LiveProductionModule'
    },
    {
        path: 'productions/:name',
        loadChildren: './modules/production-menu/production-menu.module#ProductionMenuModule'
    },
    {
        path: 'productions',
        loadChildren: './modules/production-menu/production-menu.module#ProductionMenuModule'
    },
    {
        path: '',
        redirectTo: '/productions',
        pathMatch: 'full'
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })], // Use hash-style URLs to prevent 404's on deeplinks
    exports: [RouterModule]
})
export class AppRoutingModule { }
