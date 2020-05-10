module Gear {

    export type PointerPosition = [number, number];
    export type MouseButtons = [boolean, boolean, boolean];

    export function checkbox(elementId: string): Flow<boolean> {
        const element = document.getElementById(elementId) as HTMLInputElement;
        const value = new Value(element.checked);
        element.onchange = e => value.value = element.checked;
        return value.flow();
    }

    export function readableValue(elementId: string): Flow<string> {
        const element = document.getElementById(elementId) as HTMLInputElement;
        const value = new Value(element.value);
        element.onchange = e => value.value = element.value;
        return Flow.from(value);
    }

    export function elementEvents(elementId: string) {
        return ElementEvents.create(elementId);
    }

    export class ElementEvents {

        readonly element: HTMLElement;
        readonly elementPos: PointerPosition;

        private readonly lazyClick: Supplier<Flow<PointerPosition>>;
        private readonly lazyMousePos: Supplier<Flow<PointerPosition>>;
        private readonly lazyTouchPos: Supplier<Flow<PointerPosition[]>>;
        private readonly lazyMouseButtons: Supplier<Flow<MouseButtons>>;

        constructor(element: HTMLElement) {
            this.element = element;
            this.elementPos = pagePos(this.element);
            this.lazyClick = lazy(() => this.newClick());
            this.lazyMousePos = lazy(() => this.newMousePos());
            this.lazyTouchPos = lazy(() => this.newTouchPos());
            this.lazyMouseButtons = lazy(() => this.newMouseButtons());
        }

        parent() {
            return new ElementEvents(this.element.parentElement);
        }

        private newClick(): Flow<PointerPosition> {
            const value = pointerPositionValue([0, 0]);
            this.element.onclick = e => {
                value.value = this.relativePos(e);
                e.preventDefault();
            }
            return value.flow();
        }
    
        private newMousePos(): Flow<PointerPosition> {
            const value = pointerPositionValue([this.element.clientWidth / 2, this.element.clientHeight / 2]);
            this.element.onmousemove = e => {
                value.value = this.relativePos(e);
                e.preventDefault();
            };
            return value.flow();
        }

        private newTouchPos(): Flow<PointerPosition[]> {
            const value: Value<PointerPosition[]> = new Value([]);
            this.element.ontouchmove = this.element.ontouchstart = e => {
                const touches: PointerPosition[] = [];
                for (let i = 0; i < e.touches.length; i++) {
                    touches.push(this.relativePos(e.touches.item(i)));
                }
                value.value = touches;
                e.preventDefault();
            };
            return value.flow();
        }

        private relativePos(p: Pointer) {
            const pointerPos = pos(p.pageX, p.pageY);
            return sub(pointerPos, this.elementPos);
        }

        private newMouseButtons(): Flow<MouseButtons> {
            const value = mouseButtonsValue([false, false, false]);
            this.element.onmousedown = e => {
                this.setButton(value, e.button, true);
                e.preventDefault();
            }
            this.element.onmouseup = e => {
                this.setButton(value, e.button, false);
                e.preventDefault();
            }
            return value.flow();
        }

        private setButton(buttons: Value<MouseButtons>, button: number, pressed: boolean) {
            buttons.value = updatedButtons(buttons.value, button, pressed);
        }

        get click() {
            return this.lazyClick();
        }

        get mousePos() {
            return this.lazyMousePos();
        }

        get touchPos() {
            return this.lazyTouchPos();
        }

        get mouseButons() {
            return this.lazyMouseButtons();
        }

        static create(elementId: string) {
            return new ElementEvents(document.getElementById(elementId));
        }

    }

    interface Pointer {
        pageX: number;
        pageY: number;
    }

    function pagePos(element: HTMLElement): PointerPosition {
        const result = pos(element.offsetLeft, element.offsetTop);
        const parent = element.parentElement;
        return parent ? add(pagePos(parent), result) : result;
    }

    function pos(x: number, y: number): PointerPosition {
        return [x, y]
    }

    function add(pos1: PointerPosition, pos2: PointerPosition): PointerPosition {
        const [x1, y1] = pos1;
        const [x2, y2] = pos2;
        return [x1 + x2, y1 + y2]
    }

    function sub(pos1: PointerPosition, pos2: PointerPosition): PointerPosition {
        const [x1, y1] = pos1;
        const [x2, y2] = pos2;
        return [x1 - x2, y1 - y2]
    }

    function pointerPositionValue(initialPos: PointerPosition) {
        return new Value(initialPos);
    }

    function mouseButtonsValue(initialButtons: MouseButtons) {
        return new Value(initialButtons);
    }

    function updatedButtons(buttons: MouseButtons, button: number, pressed: boolean): MouseButtons {
        let result = buttons;
        result[button % 3] = pressed;
        return result;
    }

}