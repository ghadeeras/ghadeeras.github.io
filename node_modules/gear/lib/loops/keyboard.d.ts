import { Key } from './button.js';
export interface KeyboardEventContext {
    readonly repeat: boolean;
    readonly shift: boolean;
    readonly ctrl: boolean;
    readonly alt: boolean;
    readonly meta: boolean;
    readonly pressedCount: number;
}
export declare class Keyboard implements KeyboardEventContext {
    private keys;
    private _repeat;
    private _shift;
    private _ctrl;
    private _alt;
    private _meta;
    private _pressedCount;
    private onkeydown;
    private onkeyup;
    constructor();
    use(): void;
    get repeat(): boolean;
    get shift(): boolean;
    get ctrl(): boolean;
    get alt(): boolean;
    get meta(): boolean;
    get pressedCount(): number;
    private keyUsed;
    private updatePressedCount;
    key(code: string): Key;
}
