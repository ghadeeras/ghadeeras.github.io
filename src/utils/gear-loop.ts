import { Button, VirtualKey } from './gear-buttons.js'
import { Keyboard, KeyboardEventContext } from './gear-keyboard.js';
import { DraggingTarget, Pointer } from './gear-pointer.js';
import { FrequencyMeter } from './misc.js';

export interface Loop {

    animationPaused: boolean

    draggingTarget: DraggingTarget | null

    run(): void

}

export interface LoopLogic {
    animate(loop: Loop, time: number, deltaT: number): void
    render(): void    
}

export type LoopDescriptor = {
    input: InputDescriptor
    styling?: {
        pressedButton?: string 
        releasedButton?: string 
    }
    fps?: {
        element: HTMLElement | string
        periodInMilliseconds?: number 
    }
}

export type InputDescriptor = {
    pointer: PointerDescriptor
    keys?: KeyDescriptor[]
}

export type PointerDescriptor = {
    element: HTMLElement | string
    defaultDraggingTarget?: DraggingTarget
    onMoved?: InputPointerHandler
    primaryButton?: PointerButtonDescriptor
    secondaryButton?: PointerButtonDescriptor
    auxiliaryButton?: PointerButtonDescriptor
}

export type KeyDescriptor = {
    virtualKey?: string
    alternatives: OneOrMore<OneOrMore<string>>
    onPressed?: InputKeyHandler
    onReleased?: InputKeyHandler
    onChange?: InputKeyHandler
}

export type PointerButtonDescriptor = {
    onPressed?: InputPointerHandler;
    onReleased?: InputPointerHandler;
    onChange?: InputPointerHandler;
};

type OneOrMore<T> = [T, ...T[]]

export type InputPointerHandler = (loop: Loop, x: number, y: number) => void
export type InputKeyHandler = (loop: Loop, context: KeyboardEventContext) => void

export function newLoop<L extends LoopLogic, D extends LoopDescriptor>(loopLogic: L, inputDescriptor: D): Loop {
    return new LoopImpl(loopLogic, inputDescriptor)
}

class LoopImpl<L extends LoopLogic, D extends LoopDescriptor> implements Loop {

    private static activeLoop: Loop | null = null

    private pointer = new Pointer(this.loopDescriptor.input.pointer.element)
    private keyboard = new Keyboard()

    private frequencyMeter = this.loopDescriptor.fps 
        ? FrequencyMeter.create(this.loopDescriptor.fps.periodInMilliseconds ?? 1000, this.loopDescriptor.fps.element)
        : new FrequencyMeter(1000, () => {})

    private _paused = false
    
    constructor(private loopAutomaton: L, private loopDescriptor: D) {
        if (loopDescriptor.input.keys) {
            for (const keyDescriptor of loopDescriptor.input.keys) {
                const button = this.newButton(keyDescriptor, loopDescriptor.styling)
                if (keyDescriptor.onPressed) {
                    const onPressed = keyDescriptor.onPressed
                    button.register(b => {
                        if (b.pressed) {
                            onPressed(this, this.keyboard)
                        }
                    })
                }
                if (keyDescriptor.onReleased) {
                    const onReleased = keyDescriptor.onReleased
                    button.register(b => {
                        if (!b.pressed) {
                            onReleased(this, this.keyboard)
                        }
                    })
                }
                if (keyDescriptor.onChange) {
                    const onChange = keyDescriptor.onChange
                    button.register(b => {
                        onChange(this, this.keyboard)
                    })
                }
            }
        }
        if (loopDescriptor.input.pointer) {
            const pointer = loopDescriptor.input.pointer;
            if (pointer.onMoved) {
                const onMoved = pointer.onMoved
                this.pointer.register(p => onMoved(this, ...p.position))
            }
            if (pointer.defaultDraggingTarget) {
                this.pointer.draggingTarget = pointer.defaultDraggingTarget
            }
            if (pointer.primaryButton) {
                const buttonDescriptor = pointer.primaryButton
                if (buttonDescriptor.onPressed) {
                    const onPressed = buttonDescriptor.onPressed
                    this.pointer.primary.register(b => {
                        if (b.pressed) {
                            onPressed(this, ...this.pointer.position)
                        }
                    })
                }
                if (buttonDescriptor.onReleased) {
                    const onReleased = buttonDescriptor.onReleased
                    this.pointer.primary.register(b => {
                        if (!b.pressed) {
                            onReleased(this, ...this.pointer.position)
                        }
                    })
                }
                if (buttonDescriptor.onChange) {
                    const onChange = buttonDescriptor.onChange
                    this.pointer.primary.register(b => {
                        onChange(this, ...this.pointer.position)
                    })
                }
            }
        }
    }

    get animationPaused() {
        return this._paused
    }

    set animationPaused(p: boolean) {
        this._paused = p
    }

    get draggingTarget() {
        return this.pointer.draggingTarget
    }

    set draggingTarget(draggingTarget: DraggingTarget | null) {
        this.pointer.draggingTarget = draggingTarget
    }

    removeDraggingTarget(): void {
        this.pointer.removeDraggingTarget()
    }

    run() {
        if (LoopImpl.activeLoop !== this) {
            LoopImpl.activeLoop = this
            this.pointer.use()
            this.keyboard.use()
            this.nextFrame()
        }
    }

    private nextFrame() {
        requestAnimationFrame(time => {
            const elapsed = this.frequencyMeter.tick(time)
            if (!this.animationPaused) {
                this.loopAutomaton.animate(this, time, elapsed)
            }
            this.loopAutomaton.render()
            if (this === LoopImpl.activeLoop) {
                this.nextFrame()
            }
        })
    }

    private newButton(keyDescriptor: KeyDescriptor, styling: LoopDescriptor["styling"]) {
        const pressedClass = styling?.pressedButton ?? ""
        const releasedClass = styling?.releasedButton ?? ""
        const virtualButtons = keyDescriptor.virtualKey !== undefined
            ? [...document.querySelectorAll(keyDescriptor.virtualKey)].filter(e => e instanceof HTMLElement)
            : [];
        const button = Button.anyOf(
            ...keyDescriptor.alternatives.map(ks => Button.allOf(
                ...ks.map(k => this.keyboard.key(k))
            ).when(b => b.pressed && this.keyboard.pressedCount == ks.length)),
            ...virtualButtons.map(e => new VirtualKey(e as HTMLElement))
        );
        if (virtualButtons.length > 0) {
            button.register(b => {
                if (b.pressed) {
                    virtualButtons.forEach(b => {
                        b.className = `${b.className.replace(releasedClass, "")} ${pressedClass}`.trim() 
                    })
                } else {
                    virtualButtons.forEach(b => {
                        b.className = `${b.className.replace(pressedClass, "")} ${releasedClass}`.trim() 
                    })
                }
            })
        } 
        return button
    }

}
