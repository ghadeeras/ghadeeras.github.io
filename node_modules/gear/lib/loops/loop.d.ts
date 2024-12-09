import { ButtonInterface } from './button.js';
import { KeyboardEventContext } from './keyboard.js';
import { DraggingTarget, PointerInterface } from './pointer.js';
import { CanvasRecorder } from './canvas.js';
export interface Loop {
    run(): void;
}
export interface LoopController {
    animationPaused: boolean;
}
export interface LoopLogic<D extends LoopDescriptor> {
    inputWiring(inputs: LoopInputs<D>, outputs: LoopOutputs<D>, controller: LoopController): LoopInputWiring<D>;
    outputWiring(outputs: LoopOutputs<D>): LoopOutputWiring<D>;
    animate(time: number, deltaT: number, controller: LoopController): void;
}
export interface LoopInputs<D extends LoopDescriptor> {
    readonly keyboard: KeyboardEventContext;
    readonly keys: Record<InputKeyName<D>, ButtonInterface>;
    readonly pointers: Record<InputPointerName<D>, PointerInterface>;
}
export interface LoopOutputs<D extends LoopDescriptor> {
    readonly canvases: Record<CanvasName<D>, OutputCanvas>;
}
export type OutputCanvas = {
    element: HTMLCanvasElement;
    recorder: CanvasRecorder;
};
export type LoopDescriptor = {
    input: InputDescriptor;
    output: OutputDescriptor;
};
export type InputDescriptor = {
    pointers?: Record<string, PointerDescriptor>;
    keys?: Record<string, KeyDescriptor>;
};
export type PointerDescriptor = {
    element: string;
};
export type KeyDescriptor = {
    virtualKeys?: string;
    physicalKeys: OneOrMore<OneOrMore<string>>;
};
export type OutputDescriptor = {
    canvases: Record<string, CanvasDescriptor>;
    styling?: {
        pressedButton?: string;
        releasedButton?: string;
    };
    fps?: {
        element: string;
        periodInMilliseconds?: number;
    };
};
export type CanvasDescriptor = {
    element: string;
};
export type InputKeyName<D extends LoopDescriptor> = keyof D["input"]["keys"];
export type InputPointerName<D extends LoopDescriptor> = keyof D["input"]["pointers"];
export type CanvasName<D extends LoopDescriptor> = keyof D["output"]["canvases"];
export type LoopInputWiring<D extends LoopDescriptor> = {
    pointers: Record<InputPointerName<D>, PointerWiring>;
    keys: Record<InputKeyName<D>, KeyWiring>;
};
export type LoopOutputWiring<D extends LoopDescriptor> = {
    canvases?: Partial<Record<CanvasName<D>, CanvasWiring>>;
    onRender: Handler;
};
export type PointerWiring = {
    defaultDraggingTarget?: DraggingTarget;
    onMoved?: Handler;
    primaryButton?: PointerButtonWiring;
    secondaryButton?: PointerButtonWiring;
    auxiliaryButton?: PointerButtonWiring;
};
export type KeyWiring = {
    onPressed?: Handler;
    onReleased?: Handler;
    onChange?: Handler;
};
export type PointerButtonWiring = {
    onPressed?: Handler;
    onReleased?: Handler;
    onChange?: Handler;
};
export type CanvasWiring = {
    onResize?: Handler;
};
export type Handler = () => void;
export type OneOrMore<T> = [T, ...T[]];
export declare function newLoop<D extends LoopDescriptor, L extends LoopLogic<D>>(loopLogic: L, inputDescriptor: D): Loop;
