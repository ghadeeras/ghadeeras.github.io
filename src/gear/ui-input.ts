module Gear {

    export type PointerPosition = [number, number];
    export type MouseButtons = [boolean, boolean, boolean];

    export type Dragging = {
        startPos: PointerPosition
        pos: PointerPosition
        start: boolean
        end: boolean
        shift: boolean
        ctrl: boolean
        alt: boolean
    }

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

        private readonly lazyClick: Supplier<Flow<MouseEvent>>;
        private readonly lazyMouseDown: Supplier<Flow<MouseEvent>>;
        private readonly lazyMouseUp: Supplier<Flow<MouseEvent>>;
        private readonly lazyMouseMove: Supplier<Flow<MouseEvent>>;
        private readonly lazyTouchMove: Supplier<Flow<TouchEvent>>;

        private readonly lazyClickPos: Supplier<Flow<PointerPosition>>;
        private readonly lazyMousePos: Supplier<Flow<PointerPosition>>;
        private readonly lazyTouchPos: Supplier<Flow<PointerPosition[]>>;
        private readonly lazyDragging: Supplier<Flow<Dragging>>;
        private readonly lazyMouseButtons: Supplier<Flow<MouseButtons>>;

        constructor(element: HTMLElement) {
            this.element = element;
            this.elementPos = pagePos(this.element);

            this.lazyClick = lazy(() => this.newClick());
            this.lazyMouseDown = lazy(() => this.newMouseDown());
            this.lazyMouseUp = lazy(() => this.newMouseUp());
            this.lazyMouseMove = lazy(() => this.newMouseMove());
            this.lazyTouchMove = lazy(() => this.newTouchMove());

            this.lazyClickPos = lazy(() => this.newClickPos());
            this.lazyMousePos = lazy(() => this.newMousePos());
            this.lazyTouchPos = lazy(() => this.newTouchPos());
            this.lazyDragging = lazy(() => this.newDragging());
            this.lazyMouseButtons = lazy(() => this.newMouseButtons());
        }

        parent() {
            return new ElementEvents(this.element.parentElement);
        }

        private newClick(): Flow<MouseEvent> {
            const value: Value<MouseEvent> = new Value();
            this.element.onclick = e => {
                value.value = e;
                e.preventDefault();
            }
            return value.flow();
        }
    
        private newMouseDown(): Flow<MouseEvent> {
            const value: Value<MouseEvent> = new Value();
            this.element.onmousedown = e => {
                value.value = e;
                e.preventDefault();
            }
            return value.flow();
        }
    
        private newMouseUp(): Flow<MouseEvent> {
            const value: Value<MouseEvent> = new Value();
            this.element.onmouseup = e => {
                value.value = e;
                e.preventDefault();
            }
            return value.flow();
        }
    
        private newMouseMove(): Flow<MouseEvent> {
            const value: Value<MouseEvent> = new Value();
            this.element.onmousemove = e => {
                value.value = e;
                e.preventDefault();
            }
            return value.flow();
        }
    
        private newTouchMove(): Flow<TouchEvent> {
            const value: Value<TouchEvent> = new Value();
            this.element.ontouchmove = e => {
                value.value = e;
                e.preventDefault();
            }
            return value.flow();
        }
    
        private newClickPos(): Flow<PointerPosition> {
            return this.click
                .map(e => this.relativePos(e))
                .defaultsTo([this.element.clientWidth / 2, this.element.clientHeight / 2])
        }
    
        private newMousePos(): Flow<PointerPosition> {
            return this.mouseMove
                .map(e => this.relativePos(e))
                .defaultsTo([this.element.clientWidth / 2, this.element.clientHeight / 2])
        }

        private newTouchPos(): Flow<PointerPosition[]> {
            return this.touchMove
                .map(e => {
                    const touches: PointerPosition[] = new Array<PointerPosition>(e.touches.length);
                    for (let i = 0; i < e.touches.length; i++) {
                        touches[i] = this.relativePos(e.touches.item(i));
                    }
                    return touches;
                })
                .defaultsTo([]);
        }

        private newDragging(): Flow<Dragging> {
            const dragging: Dragging = {
                startPos: [0, 0],
                pos: [0, 0],
                start: false,
                end: true,
                shift: false,
                ctrl: false,
                alt: false
            }
            return Flow.from(
                this.mouseDown.map(e => {
                    dragging.startPos = dragging.pos = this.relativePos(e)
                    dragging.start = true
                    dragging.end = false
                    dragging.shift = e.shiftKey
                    dragging.ctrl = e.ctrlKey
                    dragging.alt = e.altKey
                    return { ...dragging }
                }),
                this.mouseMove.filter(e => (e.button & 1) != 0).map(e => {
                    dragging.pos = this.relativePos(e)
                    dragging.start = false
                    dragging.end = false
                    return { ...dragging }
                }),
                Flow.from(this.mouseUp, this.mouseMove.filter(e => (e.button & 1) == 0)).map(e => {
                    dragging.startPos = dragging.pos
                    dragging.start = false
                    dragging.end = true
                    return { ...dragging }
                })
            ).defaultsTo({ ...dragging })
        }

        private relativePos(p: Pointer) {
            const pointerPos = pos(p.pageX, p.pageY);
            return sub(pointerPos, this.elementPos);
        }

        private newMouseButtons(): Flow<MouseButtons> {
            const initialValue: MouseButtons = [false, false, false];
            type MouseButtonsUpdate = [number, boolean]
            return Flow.from<MouseButtonsUpdate>(
                this.mouseDown.map(e => [e.button, true]), 
                this.mouseUp.map(e => [e.button, false])
            ).reduce(([button, down], buttons) => updatedButtons(buttons, button, down), initialValue)
        }

        get click() {
            return this.lazyClick();
        }

        get mouseDown() {
            return this.lazyMouseDown();
        }

        get mouseUp() {
            return this.lazyMouseUp();
        }

        get mouseMove() {
            return this.lazyMouseMove();
        }

        get touchMove() {
            return this.lazyTouchMove();
        }

        get clickPos() {
            return this.lazyClickPos();
        }

        get mousePos() {
            return this.lazyMousePos();
        }

        get touchPos() {
            return this.lazyTouchPos();
        }

        get dragging() {
            return this.lazyDragging();
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

    function updatedButtons(buttons: MouseButtons, button: number, pressed: boolean): MouseButtons {
        let result = buttons;
        result[button % 3] = pressed;
        return result;
    }

}