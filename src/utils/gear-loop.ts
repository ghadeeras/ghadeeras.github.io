import { Button, ButtonInterface, VirtualKey } from './gear-buttons.js'
import { Keyboard, KeyboardEventContext } from './gear-keyboard.js';
import { DraggingTarget, Pointer, PointerInterface } from './gear-pointer.js';
import { FrequencyMeter } from './misc.js';

export interface Loop<D extends LoopDescriptor> {

    animationPaused: boolean

    readonly keys: Record<InputKeyName<D>, ButtonInterface>
    readonly pointers: Record<InputPointerName<D>, PointerInterface>
    readonly keyboard: KeyboardEventContext

    run(): void

}

export interface LoopLogic<D extends LoopDescriptor> {
    wiring(loop: Loop<D>): LoopWiring<D>
    animate(loop: Loop<D>, time: number, deltaT: number): void
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
    pointers?: Record<string, PointerDescriptor>
    keys?: Record<string, KeyDescriptor>
}

export type PointerDescriptor = {
    element: HTMLElement | string
}

export type KeyDescriptor = {
    virtualKey?: string
    alternatives: OneOrMore<OneOrMore<string>>
}

export type InputKeyName<D extends LoopDescriptor> = keyof D["input"]["keys"];

export type InputPointerName<D extends LoopDescriptor> = keyof D["input"]["pointers"];

export type LoopWiring<D extends LoopDescriptor>  = {
    pointers: Record<InputPointerName<D>, PointerWiring<D>>
    keys: Record<InputKeyName<D>, KeyWiring<D>>
}

export type PointerWiring<D extends LoopDescriptor> = {
    defaultDraggingTarget?: DraggingTarget
    onMoved?: InputHandler
    primaryButton?: PointerButtonWiring<D>
    secondaryButton?: PointerButtonWiring<D>
    auxiliaryButton?: PointerButtonWiring<D>
}

export type KeyWiring<D extends LoopDescriptor> = {
    onPressed?: InputHandler
    onReleased?: InputHandler
    onChange?: InputHandler
}

export type PointerButtonWiring<D extends LoopDescriptor> = {
    onPressed?: InputHandler;
    onReleased?: InputHandler;
    onChange?: InputHandler;
};

type OneOrMore<T> = [T, ...T[]]

export type InputHandler = () => void

export function newLoop<D extends LoopDescriptor, L extends LoopLogic<D>>(loopLogic: L, inputDescriptor: D): Loop<D> {
    return new LoopImpl(loopLogic, inputDescriptor)
}

class LoopImpl<D extends LoopDescriptor, L extends LoopLogic<D>> implements Loop<D> {

    private static activeLoop: Loop<any> | null = null

    readonly keys: Record<InputKeyName<D>, Button>
    readonly pointers: Record<InputPointerName<D>, Pointer>
    readonly keyboard = new Keyboard()

    private readonly frequencyMeter = this.loopDescriptor.fps 
        ? FrequencyMeter.create(this.loopDescriptor.fps.periodInMilliseconds ?? 1000, this.loopDescriptor.fps.element)
        : new FrequencyMeter(1000, () => {})

    private _paused = false
    
    constructor(private loopLogic: L, private loopDescriptor: D) {
        const postConstructionOps: ((loopWiring: LoopWiring<D>) => void)[] = []
        this.keys = this.createKeys(loopDescriptor, postConstructionOps)
        this.pointers = this.createPointers(loopDescriptor, postConstructionOps)
        postConstructionOps.forEach(op => op(loopLogic.wiring(this)))
    }

    private createKeys(loopDescriptor: D, postConstructionOps: ((loopWiring: LoopWiring<D>) => void)[]) {
        const keys: Partial<Record<InputKeyName<D>, Button>> = {};
        if (loopDescriptor.input.keys) {
            for (const keyDescriptorKey of keysOf(loopDescriptor.input.keys)) {
                const keyDescriptor = loopDescriptor.input.keys[keyDescriptorKey];
                const button = this.newButton(keyDescriptor, loopDescriptor.styling);
                keys[keyDescriptorKey as InputKeyName<D>] = button;
                postConstructionOps.push(loopWiring => {
                    this.wireButton(keyDescriptorKey as InputKeyName<D>, button, loopWiring)
                })
            }
        }
        return keys as Record<InputKeyName<D>, Button>;
    }

    private wireButton(keyDescriptorKey: InputKeyName<D>, button: Button, loopWiring: LoopWiring<D>){
        const wiring = loopWiring.keys ? loopWiring.keys[keyDescriptorKey] : null;
        if (!wiring) {
            return;
        }
        if (wiring.onPressed) {
            const onPressed = wiring.onPressed;
            button.register(b => {
                if (b.pressed) {
                    onPressed();
                }
            });
        }
        if (wiring.onReleased) {
            const onReleased = wiring.onReleased;
            button.register(b => {
                if (!b.pressed) {
                    onReleased();
                }
            });
        }
        if (wiring.onChange) {
            const onChange = wiring.onChange;
            button.register(b => {
                onChange();
            });
        }
    }

    private createPointers(loopDescriptor: D, postConstructionOps: ((loopWiring: LoopWiring<D>) => void)[]) {
        const pointers: Partial<Record<InputPointerName<D>, Pointer>> = {};
        if (loopDescriptor.input.pointers) {
            for (const pointerDescriptorKey of keysOf(loopDescriptor.input.pointers)) {
                const pointerDescriptor = loopDescriptor.input.pointers[pointerDescriptorKey];
                const pointer = new Pointer(pointerDescriptor.element);
                pointers[pointerDescriptorKey as InputPointerName<D>] = pointer;
                postConstructionOps.push(loopWiring => {
                    this.wirePointer(pointerDescriptorKey as InputPointerName<D>, pointer, loopWiring)
                })
            }
        }
        return pointers as Record<InputPointerName<D>, Pointer>;
    }

    private wirePointer(pointerDescriptorKey: InputPointerName<D>, pointer: Pointer, loopWiring: LoopWiring<D>) {
        const wiring = loopWiring.pointers[pointerDescriptorKey];
        if (!wiring) {
            return;
        }
        if (wiring.defaultDraggingTarget) {
            pointer.draggingTarget = wiring.defaultDraggingTarget;
        }
        if (wiring.onMoved) {
            const onMoved = wiring.onMoved;
            pointer.register(p => onMoved());
        }
        if (wiring.primaryButton) {
            const buttonWiring = wiring.primaryButton;
            if (buttonWiring.onPressed) {
                const onPressed = buttonWiring.onPressed;
                pointer.primary.register(b => {
                    if (b.pressed) {
                        onPressed();
                    }
                });
            }
            if (buttonWiring.onReleased) {
                const onReleased = buttonWiring.onReleased;
                pointer.primary.register(b => {
                    if (!b.pressed) {
                        onReleased();
                    }
                });
            }
            if (buttonWiring.onChange) {
                const onChange = buttonWiring.onChange;
                pointer.primary.register(b => {
                    onChange();
                });
            }
        }
    }

    get animationPaused() {
        return this._paused
    }

    set animationPaused(p: boolean) {
        this._paused = p
    }

    run() {
        if (LoopImpl.activeLoop !== this) {
            LoopImpl.activeLoop = this
            for (const key of keysOf(this.pointers)) {
                const pointer = this.pointers[key]
                pointer.use()
            }
            this.keyboard.use()
            this.nextFrame()
        }
    }

    private nextFrame() {
        requestAnimationFrame(time => {
            const elapsed = this.frequencyMeter.tick(time)
            if (!this.animationPaused) {
                this.loopLogic.animate(this, time, elapsed)
            }
            this.loopLogic.render()
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

function keysOf<O extends (object | {})>(object: O): (keyof O)[] {
    return Object.keys(object) as (keyof O)[]
} 
