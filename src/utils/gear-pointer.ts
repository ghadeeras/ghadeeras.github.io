import { gear } from '../libs.js'
import { required } from "./misc.js"

import { PointerButton } from './gear-buttons.js'
import { Property, trap } from './gear.js'

export class Pointer {

    readonly element: HTMLElement

    private _x = 0
    private _y = 0

    readonly primary: PointerButton = new PointerButton("primary")
    readonly secondary: PointerButton = new PointerButton("secondary")
    readonly auxiliary: PointerButton = new PointerButton("auxiliary")

    private onpointerdown: typeof this.element.onpointerdown = e => this.buttonUsed(e, b => this.buttonPressed(e, b))
    private onpointerup: typeof this.element.onpointerup = e => this.buttonUsed(e, b => this.buttonReleased(e, b))
    private onpointermove: typeof this.element.onpointermove = e => this.pointerMoved(e)

    private _draggingTarget: DraggingTarget | null = null
    
    private observers: gear.Consumer<this>[] = []

    constructor(element: HTMLElement | string) {
        this.element = element instanceof HTMLElement ? element : required(document.getElementById(element))
        this.primary.register(b => {
            if (this._draggingTarget !== null) {
                b.pressed
                    ? this._draggingTarget.startDragging(this)
                    : this._draggingTarget.stopDragging()
            }
        })
        this.register(() => {
            if (this._draggingTarget !== null) {
                this._draggingTarget.keepDragging(this)
            }    
        })
    }

    register(observer: gear.Consumer<this>) {
        this.observers.push(observer)
    }

    get draggingTarget() {
        return this._draggingTarget
    }

    set draggingTarget(draggingTarget: DraggingTarget | null) {
        this.removeDraggingTarget()
        this._draggingTarget = draggingTarget
    }

    removeDraggingTarget() {
        if (this._draggingTarget !== null) {
            this._draggingTarget.stopDragging()
            this._draggingTarget = null
        }
    }

    use() {
        this.element.onpointerdown = this.onpointerdown
        this.element.onpointerup = this.onpointerup
        this.element.onpointermove = this.onpointermove
        this.element.ontouchstart = trap
        this.element.ontouchend = trap
        this.element.ontouchmove = trap
    }

    get x() {
        return this._x
    }

    get y() {
        return this._y
    }

    get position(): gear.PointerPosition {
        return [this._x, this._y]
    }

    private pointerMoved(e: PointerEvent) {
        trap(e)
        this.updatePositionFrom(e)
        this.observers.forEach(observer => observer(this))
    }

    private buttonPressed(e: PointerEvent, b: PointerButton) {
        this.element.setPointerCapture(e.pointerId)
        b.pressed = true
    }

    private buttonReleased(e: PointerEvent, b: PointerButton) {
        b.pressed = false
        this.element.releasePointerCapture(e.pointerId)
    }

    private buttonUsed(e: PointerEvent, action: (b: PointerButton) => void) {
        const button = this.button(e.button)
        if (button !== null) {
            trap(e)
            this.updatePositionFrom(e)
            action(button)
        }
    }

    private button(buttonId: number): PointerButton | null {
        switch (buttonId) {
            case 0: return this.primary
            case 1: return this.auxiliary
            case 2: return this.secondary
            default: return null
        }
    }

    private updatePositionFrom(e: PointerEvent) {
        [this._x, this._y] = [
            2 * e.offsetX / this.element.clientWidth - 1, 
            1 - 2 * e.offsetY / this.element.clientHeight
        ]
    }

}

export interface DraggingTarget {
    startDragging(pointer: Pointer): void
    keepDragging(pointer: Pointer): void
    stopDragging(): void
}

export function draggingTarget<V>(property: Property<V>, dragger: Dragger<V>): DraggingTarget {
    return new GenericDraggingTarget(property, dragger)
}

export interface Dragger<T> {
    begin(object: T, position: gear.PointerPosition): DraggingFunction<T>
    end(object: T): T
}

export type DraggingFunction<T> = (position: gear.PointerPosition) => T

class GenericDraggingTarget<T> implements DraggingTarget {
    
    private initial: T
    private drag: (pointer: Pointer) => void = () => {}
    private done: () => void = () => {}

    constructor(private property: Property<T>, private dragger: Dragger<T>) {
        this.initial = property.getter()
    }

    startDragging(pointer: Pointer) {
        this.initial = this.property.getter()
        const draggingFunction = this.dragger.begin(this.initial, pointer.position)
        this.drag = (pointer) => this.property.setter(draggingFunction(pointer.position))
        this.done = () => this.property.setter(this.dragger.end(this.property.getter()))
    }

    keepDragging(pointer: Pointer) {
        this.drag(pointer)
    }
    
    stopDragging() {
        this.done()
        this.drag = () => {}
        this.done = () => {}
    }

}
