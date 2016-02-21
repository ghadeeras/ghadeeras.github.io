module Gear {

    export class Call {
        
        private _callable: Callable;
        private _timer: number = null;
        
        constructor(callable: Callable) {
            this._callable = callable;
        }
        
        now() {
            this.cancel();
            this._callable();
        }

        later() {
            if (!this._timer) {
                this._timer = setTimeout(() => {
                    this._timer = null;
                    this._callable();
                }, 0);
            }
        }

        cancel() {
            if (this._timer) {
                clearTimeout(this._timer);
                this._timer = null;
            }
        }

    }

}