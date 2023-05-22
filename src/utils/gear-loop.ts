import { Button, ButtonInterface, VirtualKey } from './gear-buttons.js'
import { Keyboard, KeyboardEventContext } from './gear-keyboard.js';
import { DraggingTarget, Pointer, PointerInterface } from './gear-pointer.js';
import { CanvasRecorder, CanvasSizeManager } from './gear-canvas.js';
import { FrequencyMeter, required } from './gear-misc.js';

export interface Loop {
    run(): void
}

export interface LoopController {
    animationPaused: boolean
}

export interface LoopLogic<D extends LoopDescriptor> {
    inputWiring(inputs: LoopInputs<D>, outputs: LoopOutputs<D>, controller: LoopController): LoopInputWiring<D>
    outputWiring(outputs: LoopOutputs<D>): LoopOutputWiring<D>
    animate(time: number, deltaT: number, controller: LoopController): void
}

export interface LoopInputs<D extends LoopDescriptor> {
    readonly keyboard: KeyboardEventContext
    readonly keys: Record<InputKeyName<D>, ButtonInterface>
    readonly pointers: Record<InputPointerName<D>, PointerInterface>
}

export interface LoopOutputs<D extends LoopDescriptor> {
    readonly canvases: Record<CanvasName<D>, OutputCanvas>
}

export type OutputCanvas = {
    element: HTMLCanvasElement
    recorder: CanvasRecorder
} 

export type LoopDescriptor = {
    input: InputDescriptor
    output: OutputDescriptor
}

export type InputDescriptor = {
    pointers?: Record<string, PointerDescriptor>
    keys?: Record<string, KeyDescriptor>
}

export type PointerDescriptor = {
    element: string
}

export type KeyDescriptor = {
    virtualKeys?: string
    physicalKeys: OneOrMore<OneOrMore<string>>
}

export type OutputDescriptor = {
    canvases: Record<string, CanvasDescriptor>
    styling?: {
        pressedButton?: string 
        releasedButton?: string 
    }
    fps?: {
        element: string
        periodInMilliseconds?: number 
    }
}

export type CanvasDescriptor = {
    element: string
}

export type InputKeyName<D extends LoopDescriptor> = keyof D["input"]["keys"];
export type InputPointerName<D extends LoopDescriptor> = keyof D["input"]["pointers"];
export type CanvasName<D extends LoopDescriptor> = keyof D["output"]["canvases"];

export type LoopInputWiring<D extends LoopDescriptor>  = {
    pointers: Record<InputPointerName<D>, PointerWiring>
    keys: Record<InputKeyName<D>, KeyWiring>
}

export type LoopOutputWiring<D extends LoopDescriptor>  = {
    canvases?: Partial<Record<CanvasName<D>, CanvasWiring>>
    onRender: Handler
}

export type PointerWiring = {
    defaultDraggingTarget?: DraggingTarget
    onMoved?: Handler
    primaryButton?: PointerButtonWiring
    secondaryButton?: PointerButtonWiring
    auxiliaryButton?: PointerButtonWiring
}

export type KeyWiring = {
    onPressed?: Handler
    onReleased?: Handler
    onChange?: Handler
}

export type PointerButtonWiring = {
    onPressed?: Handler;
    onReleased?: Handler;
    onChange?: Handler;
};

export type CanvasWiring = {
    onResize?: Handler
}

export type Handler = () => void

export type OneOrMore<T> = [T, ...T[]]

export function newLoop<D extends LoopDescriptor, L extends LoopLogic<D>>(loopLogic: L, inputDescriptor: D): Loop {
    return new LoopImpl(loopLogic, inputDescriptor)
}

class LoopImpl<D extends LoopDescriptor, L extends LoopLogic<D>> implements Loop, LoopInputs<D>, LoopOutputs<D>, LoopController {

    private static activeLoop: Loop | null = null

    readonly keys: Record<InputKeyName<D>, Button>
    readonly pointers: Record<InputPointerName<D>, Pointer>
    readonly keyboard = new Keyboard()

    readonly canvases: Record<CanvasName<D>, OutputCanvas>

    private readonly canvasSizeManager = new CanvasSizeManager(true);
    private render: () => void = () => {}

    private readonly frequencyMeter = this.loopDescriptor.output.fps 
        ? FrequencyMeter.create(this.loopDescriptor.output.fps.periodInMilliseconds ?? 1000, this.loopDescriptor.output.fps.element)
        : new FrequencyMeter(1000, () => {})

    private _paused = false
    
    constructor(private loopLogic: L, private loopDescriptor: D) {
        const deferredInputOps: ((loopWiring: LoopInputWiring<D>) => void)[] = []
        const deferredOutputOps: ((loopWiring: LoopOutputWiring<D>) => void)[] = []
        this.keys = this.createKeys(loopDescriptor, deferredInputOps)
        this.pointers = this.createPointers(loopDescriptor, deferredInputOps)
        this.canvases = this.getCanvases(loopDescriptor, deferredOutputOps)
        const inputWiring = loopLogic.inputWiring(this, this, this)
        const outputWiring = loopLogic.outputWiring(this)
        this.render = outputWiring.onRender
        deferredInputOps.forEach(op => op(inputWiring))
        deferredOutputOps.forEach(op => op(outputWiring))
    }

    private getCanvases(loopDescriptor: D, deferredOps: ((loopWiring: LoopOutputWiring<D>) => void)[]) {
        const canvases: Partial<Record<CanvasName<D>, OutputCanvas>> = {};
        if (loopDescriptor.output.canvases) {
            for (const canvasName of keysOf(loopDescriptor.output.canvases)) {
                const canvasDescriptor = loopDescriptor.output.canvases[canvasName];
                const canvas = this.getCanvasElement(canvasDescriptor)
                canvases[canvasName as CanvasName<D>] = {
                    element: canvas,
                    recorder: new CanvasRecorder(canvas)
                };
                deferredOps.push(loopWiring => this.wireCanvas(canvasName as CanvasName<D>, canvas, loopWiring))
            }
        }
        return canvases as Record<CanvasName<D>, OutputCanvas>;
    }

    private getCanvasElement(canvasDescriptor: CanvasDescriptor) {
        return required(document.getElementById(canvasDescriptor.element)) as HTMLCanvasElement;
    }

    private wireCanvas(canvasName: CanvasName<D>, canvas: HTMLCanvasElement, loopWiring: LoopOutputWiring<D>) {
        if (!loopWiring.canvases) {
            return
        }
        const canvasWiring = loopWiring.canvases[canvasName];
        if (canvasWiring && canvasWiring.onResize) {
            this.canvasSizeManager.observe(canvas, canvasWiring.onResize)
        }
}

    private createKeys(loopDescriptor: D, deferredOps: ((loopWiring: LoopInputWiring<D>) => void)[]) {
        const keys: Partial<Record<InputKeyName<D>, Button>> = {};
        if (loopDescriptor.input.keys) {
            for (const keyName of keysOf(loopDescriptor.input.keys)) {
                const keyDescriptor = loopDescriptor.input.keys[keyName];
                const button = this.newButton(keyDescriptor, loopDescriptor.output.styling, loopDescriptor.input.keys);
                keys[keyName as InputKeyName<D>] = button;
                deferredOps.push(loopWiring => {
                    this.wireButton(keyName as InputKeyName<D>, button, loopWiring)
                })
            }
        }
        return keys as Record<InputKeyName<D>, Button>;
    }

    private wireButton(keyDescriptorKey: InputKeyName<D>, button: Button, loopWiring: LoopInputWiring<D>){
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

    private createPointers(loopDescriptor: D, deferredOps: ((loopWiring: LoopInputWiring<D>) => void)[]) {
        const pointers: Partial<Record<InputPointerName<D>, Pointer>> = {};
        if (loopDescriptor.input.pointers) {
            for (const pointerDescriptorKey of keysOf(loopDescriptor.input.pointers)) {
                const pointerDescriptor = loopDescriptor.input.pointers[pointerDescriptorKey];
                const pointer = new Pointer(pointerDescriptor.element);
                pointers[pointerDescriptorKey as InputPointerName<D>] = pointer;
                deferredOps.push(loopWiring => {
                    this.wirePointer(pointerDescriptorKey as InputPointerName<D>, pointer, loopWiring)
                })
            }
        }
        return pointers as Record<InputPointerName<D>, Pointer>;
    }

    private wirePointer(pointerDescriptorKey: InputPointerName<D>, pointer: Pointer, loopWiring: LoopInputWiring<D>) {
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
                pointer.primary.register(() => {
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
            const delta = this.frequencyMeter.tick(time)
            if (!this.animationPaused) {
                this.loopLogic.animate(time, delta, this)
            }
            this.render()
            for (const key of Object.keys(this.canvases)) {
                const canvas = this.canvases[key]
                canvas.recorder.requestFrame() 
            }
            if (this === LoopImpl.activeLoop) {
                this.nextFrame()
            }
        })
    }

    private newButton(keyDescriptor: KeyDescriptor, styling: LoopDescriptor["output"]["styling"], keyDescriptors: Record<string, KeyDescriptor>) {
        const pressedClass = styling?.pressedButton ?? ""
        const releasedClass = styling?.releasedButton ?? ""
        const virtualButtons = keyDescriptor.virtualKeys !== undefined
            ? [...document.querySelectorAll(keyDescriptor.virtualKeys)].filter(e => e instanceof HTMLElement)
            : [];
        const allShortcuts: string[][] = []
        Object.keys(keyDescriptors).forEach(k => allShortcuts.push(...keyDescriptors[k].physicalKeys))
        const button = Button.anyOf(
            ...keyDescriptor.physicalKeys.map(shortcut => {
                const complements = allShortcuts
                    .map(otherShortcut => { 
                        const complement = otherShortcut.filter(k => shortcut.indexOf(k) < 0)
                        return (complement.length + shortcut.length) == otherShortcut.length ? complement : []
                    })
                    .filter(set => set.length > 0)
                return Button.allOf(
                    ...shortcut.map(k => this.keyboard.key(k)),
                    ...complements.map(c => Button.allOf(...c.map(k => this.keyboard.key(k))).not())
                )
            }),
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
