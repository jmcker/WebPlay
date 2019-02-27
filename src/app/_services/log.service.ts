import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { isNull } from 'util';

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

    /**
     * Show the user an error via notification bar
     * if available or window.alert popup
     *
     * The error will be logged to console
     * @param msg Message to display
     */
    error(e: any, alertMsg?: string) {
        if (typeof e === 'object') {
            console.dir(e);
        } else {
            console.error(e);
        }

        if (alertMsg) {
            this.alert(alertMsg);
        }
    }

    /**
     * Show the user a low priority message via notification bar
     * if available
     *
     * The message will also be logged to console
     * @param msg Message to display
     */
    info(msg: string) {
        // TODO: check if alert bar is present before resorting to window.alert()

        console.log(msg);
        window.alert(msg);
    }

    /**
     * Show the user a high priority message via notification bar
     * if available or window.alert popup
     *
     * The message will also be logged to console
     * @param msg Message to display
     */
    alert(msg: string) {
        // TODO: check if alert bar is present before resorting to window.alert()

        console.warn(msg);
        window.alert(msg);
    }

    /**
     * Prompt the user to confirm or reject an action via
     * window.confirm dialog
     *
     * @param msg Prompt to display
     * @return Promise which resolves to result of window.confirm
     */
    confirm(msg: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let res = window.confirm(msg);

            resolve(res);
        });
    }

    /**
     * Prompt the user to enter information via window.prompt dialog
     *
     * @param msg Prompt to display
     * @return Promise which resolves to result of window.prompt
     */
    prompt(msg: string): Promise<string> {
        return new Promise((resolve, reject) => {
            let res = window.prompt(msg, '');

            if (isNull(res)) {
                reject('Cancel button was clicked');
            }

            resolve(res);
        });
    }

    /**
     * Log any type to the console during debug mode
     *
     * Message will not be shown when running a production build
     * @param obj Object to log
     */
    debug(obj: any) {
        if (!environment.production) {
            console.dir(obj);
        }
    }
}
