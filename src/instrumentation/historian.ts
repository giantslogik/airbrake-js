import {makeEventHandler} from './dom';

interface XMLHttpRequestWithState extends XMLHttpRequest {
    __state: any;
}

export default class Historian {
    private historyMaxLen = 10;

    private history = [];
    private lastState: any;
    private lastLocation: string | null;

    constructor() {}

    getHistory(): any[] {
        return this.history;
    }

    pushHistory(state: any): void {
        if (this.isDupState(state)) {
            if (this.lastState.num) {
                this.lastState.num++;
            } else {
                this.lastState.num = 2;
            }
            return;
        }

        if (!state.date) {
            state.date = new Date();
        }
        this.history.push(state);
        this.lastState = state;

        if (this.history.length > this.historyMaxLen) {
            this.history = this.history.slice(-this.historyMaxLen);
        }
    }

    private isDupState(state): boolean {
        if (!this.lastState) {
            return false;
        }
        for (let key in state) {
            if (key === 'date') {
                continue;
            }
            if (state[key] !== this.lastState[key]) {
                return false;
            }
        }
        return true;
    }

    dom(): void {
        let handler = makeEventHandler(this);
        document.addEventListener('click', handler, false);
        document.addEventListener('keypress', handler, false);
        window.addEventListener('error', handler, true);
    }

    console(): void {
        let client = this;
        let methods = ['debug', 'log', 'info', 'warn', 'error'];
        for (let m of methods) {
            if (!(m in console)) {
                continue;
            }

            let oldFn = console[m];
            let newFn = function () {
                oldFn.apply(console, arguments);
                client.pushHistory({
                    type: 'log',
                    severity: m,
                    arguments: Array.prototype.slice.call(arguments),
                });
            };
            console[m] = newFn;
        }
    }

    xhr(): void {
        let client = this;

        let oldOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(
            method: string,
            url: string,
            _async?: boolean,
            _user?: string,
            _password?: string
        ): void {
            this.__state = {
                type: 'xhr',
                method: method,
                url: url,
            };
            oldOpen.apply(this, arguments);
        };

        let oldSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(_data?: any): void {
            let oldFn = this.onreadystatechange;
            this.onreadystatechange = function(_ev: Event): any {
                if (this.__state && this.readyState === 4) {
                    client.recordReq(this);
                }
                if (oldFn) {
                    return oldFn.apply(this, arguments);
                }
            };

            (this as XMLHttpRequestWithState).__state.date = new Date();
            return oldSend.apply(this, arguments);
        };
    }

    private recordReq(req: XMLHttpRequestWithState): void {
        let state = req.__state;
        state.statusCode = req.status;
        if (state.date) {
            state.duration = new Date().getTime() - state.date.getTime();
        }
        this.pushHistory(state);
    }

    location(): void {
        this.lastLocation = document.location.pathname;

        let client = this;
        let oldFn = window.onpopstate;
        window.onpopstate = function(_event: PopStateEvent): any {
            client.recordLocation(document.location.pathname);
            if (oldFn) {
                return oldFn.apply(this, arguments);
            }
        };

        let oldPushState = history.pushState;
        history.pushState = function(_state: any, _title: string, url?: string | null): void {
            if (url) {
                client.recordLocation(url);
            }
            oldPushState.apply(this, arguments);
        };
    }

    private recordLocation(url: string): void {
        let index = url.indexOf('://');
        if (index >= 0) {
            url = url.slice(index + 3);
            index = url.indexOf('/');
            if (index >= 0) {
                url = url.slice(index);
            } else {
                url = '/';
            }
        } else if (url.charAt(0) !== '/') {
            url = '/' + url;
        }

        this.pushHistory({
            type: 'location',
            from: this.lastLocation,
            to: url,
        });
        this.lastLocation = url;
    }
}

let historian = new Historian();

if (typeof document === 'object') {
    historian.dom();
}
if (typeof console === 'object') {
    historian.console();
}
if (typeof XMLHttpRequest !== 'undefined') {
    historian.xhr();
}
if (typeof history === 'object') {
    historian.location();
}

export function getHistory(): any[] {
    return historian.getHistory();
}
