export declare class CanvasSizeManager {
    readonly devicePixels: boolean;
    private readonly observer;
    private readonly resizing;
    private readonly observed;
    private readonly dirtyCanvas;
    constructor(devicePixels?: boolean);
    observe(canvas: HTMLCanvasElement, handler: ResizeHandler): void;
    private onResize;
    private getSize;
    private dpr;
    private resizeAll;
    private doResizeAll;
    private invokeHandler;
}
export declare class CanvasRecorder {
    readonly canvas: HTMLCanvasElement;
    readonly videoStream: MediaStream;
    readonly videoRecorder: MediaRecorder;
    private chunks;
    private fileName;
    constructor(canvas: HTMLCanvasElement);
    get state(): RecordingState;
    startStop(fileName?: string): void;
    start(): void;
    stop(fileName?: string): void;
    requestFrame(): void;
}
type ResizeHandler = (canvas: HTMLCanvasElement) => void;
export {};
