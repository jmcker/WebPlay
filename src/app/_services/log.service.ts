import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { isNull } from 'util';
import { ReplaySubject } from 'rxjs';
import { OnscreenLog } from '@app/_models/onscreen-log';

@Injectable({
    providedIn: 'root'
})
export class LogService {

    readonly MAX_REPLAY_WINDOW = 5;

    /**
     * List of last 50 info and alert messages.
     */
    public msgList$ = new ReplaySubject<OnscreenLog>(50, this.MAX_REPLAY_WINDOW * 1000);

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
        if (alertMsg) {
            this.alert(alertMsg);
        }

        if (e instanceof Error) {
            console.trace(e);
        } else if (typeof e === 'object') {
            console.dir(e);
        } else {
            console.error(e);
        }
    }

    /**
     * Show the user a low priority message via notification bar
     * if available
     *
     * The message will also be logged to console
     * @param msg Message to display
     * @param duration Time to show the message for. Defaults to 3
     */
    info(msg: string, duration: number = 3) {
        console.log(msg);
        this.msgList$.next({ text: msg, color: 'black', duration: duration });
    }

    /**
     * Show the user a high priority message via notification bar
     * if available or window.alert popup
     *
     * The message will also be logged to console
     * @param msg Message to display
     * @param duration Time to show the message for. Defaults to 5
     */
    alert(msg: string, duration: number = 5) {
        console.warn(msg);
        this.msgList$.next({ text: msg, color: 'red', duration: duration });
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
    prompt(msg: string, _default?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            let res = window.prompt(msg, _default);

            /* Resolve with null on Cancel instead of rejecting
            if (isNull(res)) {
                reject('Cancel button was clicked');
            }
            */

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
