import { save } from "./gear-misc.js";
import { DeferredComputation } from "/gear/latest/index.js";
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
export class CanvasRecorder {
    constructor(canvas) {
        this.canvas = canvas;
        this.chunks = [];
        this.fileName = "video.mp4";
        const bps = Math.pow(2, Math.floor(Math.log2(canvas.width * canvas.height * 24))); // just a heuristic
        this.videoStream = canvas.captureStream(0);
        this.videoRecorder = new MediaRecorder(this.videoStream, { audioBitsPerSecond: 0, videoBitsPerSecond: bps, mimeType: "video/webm" });
        this.videoRecorder.ondataavailable = e => this.chunks.push(e.data);
        console.log(`Recorder mime type: ${this.videoRecorder.mimeType}`);
        console.log(`Recorder video bps: ${this.videoRecorder.videoBitsPerSecond}`);
        this.videoRecorder.onstop = () => {
            const blob = new Blob(this.chunks);
            const url = URL.createObjectURL(blob);
            save(url, this.videoRecorder.mimeType, this.fileName);
            this.chunks = [];
        };
    }
    get state() {
        return this.videoRecorder.state;
    }
    startStop(fileName = "video.mp4") {
        if (this.videoRecorder.state === "recording") {
            this.stop(fileName);
        }
        else {
            this.start();
        }
    }
    start() {
        this.videoRecorder.start();
    }
    stop(fileName = "video.mp4") {
        this.fileName = fileName;
        this.videoRecorder.stop();
    }
    requestFrame() {
        if (this.videoRecorder.state === "recording") {
            const track = this.videoStream.getVideoTracks()[0];
            if (track instanceof CanvasCaptureMediaStreamTrack) {
                track.requestFrame();
            }
        }
    }
}
function asTuple(size) {
    return [size.inlineSize, size.blockSize];
}
//# sourceMappingURL=gear-canvas.js.map