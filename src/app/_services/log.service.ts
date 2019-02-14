import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class LogService {

    constructor() {
        if (environment.production) {
            console.log('LogService running in production mode...');
        } else {
            console.log('LogService running in dev mode...');
        }
    }

    error(e: any, onscreen?: boolean) {
        if (typeof e === 'object') {
            console.dir(e);
        } else {
            console.error(e);
        }
    }

    info(msg: string) {
        // TODO: check if alert bar is present before resorting to window.alert()

        console.log(msg);
        window.alert(msg);
    }

    alert(msg: string) {
        // TODO: check if alert bar is present before resorting to window.alert()

        console.warn(msg);
        window.alert(msg);
    }

    debug(obj: any) {
        if (!environment.production) {
            console.dir(obj);
        }
    }
}
