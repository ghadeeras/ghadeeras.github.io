var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { DeferredComputation } from "/gear/latest/index.js";
export function fetchTextFile(url) {
    return __awaiter(this, void 0, void 0, function* () {
        return fetch(url, { method: "get", mode: "no-cors" }).then(response => response.text());
    });
}
export class CanvasSizeManager {
    constructor(devicePixels = false) {
        this.devicePixels = devicePixels;
        this.observer = new ResizeObserver(entries => this.onResize(entries));
        this.resizing = new DeferredComputation(() => this.resizeAll());
        this.observed = new Map();
        this.dirtyCanvas = new Map();
    }
    observe(canvas, handler) {
        try {
            this.observer.observe(canvas, { box: this.devicePixels ? "device-pixel-content-box" : "content-box" });
        }
        catch (e) {
            console.warn("Falling back to observing content box because of error!", e);
            this.observer.observe(canvas, { box: "content-box" });
        }
        this.observed.set(canvas, handler);
    }
    onResize(entries) {
        for (const entry of entries) {
            const [width, height] = this.getSize(entry);
            const canvas = entry.target;
            this.dirtyCanvas.set(canvas, [width, height]);
        }
        this.resizing.perform();
    }
    getSize(entry) {
        var _a, _b;
        const dpr = this.dpr();
        if (this.devicePixels && ((_a = entry.devicePixelContentBoxSize) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            return asTuple(entry.devicePixelContentBoxSize[0]);
        }
        else if (((_b = entry.contentBoxSize) === null || _b === void 0 ? void 0 : _b.length) > 0) {
            const [width, height] = asTuple(entry.contentBoxSize[0]);
            return [Math.round(width * dpr), Math.round(height * dpr)];
        }
        else {
            return [Math.round(entry.contentRect.width * dpr), Math.round(entry.contentRect.height * dpr)];
        }
    }
    dpr() {
        return this.devicePixels ? window.devicePixelRatio : 1;
    }
    resizeAll() {
        try {
            this.doResizeAll();
        }
        finally {
            this.dirtyCanvas.clear();
        }
    }
    doResizeAll() {
        for (const [canvas, [width, height]] of this.dirtyCanvas) {
            const needsResizing = (width !== canvas.width || height !== canvas.height);
            if (needsResizing) {
                canvas.width = width;
                canvas.height = height;
                this.invokeHandler(canvas);
            }
        }
    }
    invokeHandler(canvas) {
        const handler = this.observed.get(canvas);
        if (handler !== undefined) {
            try {
                handler(canvas);
            }
            catch (e) {
                console.error(e);
            }
        }
    }
}
function asTuple(size) {
    return [size.inlineSize, size.blockSize];
}
//# sourceMappingURL=gear.js.map