import { DeferredComputation } from "/gear/latest/index.js";

export async function fetchTextFile(url: string): Promise<string> {
    return fetch(url, { method : "get", mode : "no-cors" }).then(response => response.text());
}

type ResizeHandler = (canvas: HTMLCanvasElement) => void

export class CanvasSizeManager {

    private observer: ResizeObserver = new ResizeObserver(entries => this.onResize(entries))
    private resizing: DeferredComputation<void> = new DeferredComputation(() => this.resizeAll())

    private observed: Map<HTMLCanvasElement, ResizeHandler> = new Map()
    private dirtyCanvas: Map<HTMLCanvasElement, [number, number]> = new Map()

    constructor(readonly devicePixels: boolean = false) {
    }

    observe(canvas: HTMLCanvasElement, handler: ResizeHandler) {
        try {
            this.observer.observe(canvas, { box: this.devicePixels ? "device-pixel-content-box" : "content-box" })
        } catch (e) {
            console.warn("Falling back to observing content box because of error!", e)
            this.observer.observe(canvas, { box: "content-box" })
        }
        this.observed.set(canvas, handler)
    }

    private onResize(entries: ResizeObserverEntry[]) {
        for (const entry of entries) {
            const [width, height] = this.getSize(entry)
            const canvas = entry.target as HTMLCanvasElement;
            this.dirtyCanvas.set(canvas, [width, height])
        }
        this.resizing.perform()
    }

    private getSize(entry: ResizeObserverEntry): [number, number] {
        const dpr = this.dpr()
        if (this.devicePixels && entry.devicePixelContentBoxSize?.length > 0) {
            return asTuple(entry.devicePixelContentBoxSize[0])
        } else if (entry.contentBoxSize?.length > 0) {
            const [width, height] = asTuple(entry.contentBoxSize[0]);
            return [Math.round(width * dpr), Math.round(height * dpr)]
        } else {
            return [Math.round(entry.contentRect.width * dpr), Math.round(entry.contentRect.height * dpr)]
        }
    }

    private dpr() {
        return this.devicePixels ? window.devicePixelRatio : 1;
    }

    private resizeAll() {
        try {
            this.doResizeAll();
        } finally {
            this.dirtyCanvas.clear()
        }
    }

    private doResizeAll() {
        for (const [canvas, [width, height]] of this.dirtyCanvas) {
            const needsResizing = (width !== canvas.width || height !== canvas.height);
            if (needsResizing) {
                canvas.width = width;
                canvas.height = height;
                this.invokeHandler(canvas);
            }
        }
    }

    private invokeHandler(canvas: HTMLCanvasElement) {
        const handler = this.observed.get(canvas);
        if (handler !== undefined) {
            try {
                handler(canvas);
            } catch (e) {
                console.error(e);
            }
        }
    }

}

function asTuple(size: ResizeObserverSize): [number, number] {
    return [size.inlineSize, size.blockSize];
}
