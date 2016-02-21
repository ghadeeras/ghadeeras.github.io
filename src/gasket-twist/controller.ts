module GasketTwist {

    export class Controller {

        private _canvas: HTMLElement;
        private _cornersCheckbox: HTMLInputElement;
        private _centersCheckbox: HTMLInputElement;
        private _twistCheckbox: HTMLInputElement;
        private _scaleCheckbox: HTMLInputElement;
        private _depthIncButton: HTMLElement;
        private _depthDecButton: HTMLElement;
        
        private _outShowCorners = new Gear.Actuator<boolean>();
        private _outShowCenters = new Gear.Actuator<boolean>();
        private _outDepth = new Gear.Actuator<number>();
        private _outTwist = new Gear.Actuator<number>();
        private _outScale = new Gear.Actuator<number>();
        
        get outShowCorners() {
            return this._outShowCorners;
        }

        get outShowCenters() {
            return this._outShowCenters;
        }

        get outDepth() {
            return this._outDepth;
        }

        get outTwist() {
            return this._outTwist;
        }

        get outScale() {
            return this._outScale;
        }

        constructor(
            canvas: string,
            cornersCheckbox: string,
            centersCheckbox: string,
            twistCheckbox: string,
            scaleCheckbox: string,
            depthIncButton: string,
            depthDecButton: string
        ) {
            this._canvas = document.getElementById(canvas) as HTMLCanvasElement;
            this._cornersCheckbox = document.getElementById(cornersCheckbox) as HTMLInputElement;
            this._centersCheckbox = document.getElementById(centersCheckbox) as HTMLInputElement;
            this._twistCheckbox = document.getElementById(twistCheckbox) as HTMLInputElement;
            this._scaleCheckbox = document.getElementById(scaleCheckbox) as HTMLInputElement;
            this._depthIncButton = document.getElementById(depthIncButton);
            this._depthDecButton = document.getElementById(depthDecButton);

            this.registerEvents();
        }

        private registerEvents() {
            this._canvas.onmousemove = e => {
                if (e.buttons != 0) {
                    this.doMove(e.offsetX, e.offsetY);
                }
                e.preventDefault();
            };
            this._canvas.onmousedown = this._canvas.onmousemove;
            this._canvas.ontouchmove = e => {
                if (e.changedTouches.length != 0) {
                    var t = e.changedTouches[0];
                    var targetX = this.x(this._canvas);
                    var targetY = this.y(this._canvas);
                    this.doMove(t.pageX - targetX, t.pageY - targetY);
                }
                e.preventDefault();
            };
            this._canvas.ontouchstart = this._canvas.ontouchmove;
            this._cornersCheckbox.onchange = e => {
                this._outShowCorners.perform(this._cornersCheckbox.checked);
            };
            this._centersCheckbox.onchange = e => {
                this._outShowCenters.perform(this._centersCheckbox.checked);
            };
            this._depthIncButton.onclick = e => {
                this._outDepth.perform(+1); 
            };
            this._depthDecButton.onclick = e => {
                this._outDepth.perform(-1); 
            };
        }

        private doMove(x: number, y: number) {
            if (this._scaleCheckbox.checked) {
                this._outScale.perform(2 - 4 * y / this._canvas.clientHeight);
            }
            if (this._twistCheckbox.checked) {
                this._outTwist.perform(Math.PI * (4 * x / this._canvas.clientWidth - 2));
            }
        }

        private x(element: HTMLElement): number {
            var result = element.offsetLeft;
            var parent = element.parentElement;
            return parent ? this.x(parent) + result : result;
        }

        private y(element: HTMLElement): number {
            var result = element.offsetTop;
            var parent = element.parentElement;
            return parent ? this.y(parent) + result : result;
        }
        
    }

}