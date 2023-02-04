export function required(value) {
    if (value === null || value === undefined) {
        throw new Error(`Required value is ${value}!`);
    }
    return value;
}
export function error(message) {
    throw new Error(message);
}
export function save(url, contentType, fileName) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.type = contentType;
    anchor.target = '_blank';
    anchor.download = fileName;
    anchor.click();
}
export class FrequencyMeter {
    constructor(unitTime, measurementConsumer) {
        this.unitTime = unitTime;
        this.measurementConsumer = measurementConsumer;
        this.lastTime = 0;
        this.counter = 0;
    }
    tick(time = performance.now()) {
        if (this.counter === 0) {
            this.lastTime = time;
        }
        const elapsedTime = time - this.lastTime;
        if (elapsedTime >= this.unitTime) {
            this.measurementConsumer(this.counter * this.unitTime / elapsedTime);
            this.counter = 0;
            this.lastTime = time;
        }
        this.counter++;
    }
    animateForever(frame) {
        this.animate(t => {
            frame(t);
            return true;
        });
    }
    animate(frame) {
        const wrappedFrame = (t) => {
            const requestNextFrame = frame(t);
            this.tick(t);
            if (requestNextFrame) {
                requestAnimationFrame(wrappedFrame);
            }
        };
        requestAnimationFrame(wrappedFrame);
    }
    static create(unitTime, elementId) {
        const element = required(document.getElementById(elementId));
        return new FrequencyMeter(unitTime, freq => element.innerHTML = freq.toPrecision(6));
    }
}
export class CanvasRecorder {
    constructor(canvas, fps = 0) {
        this.canvas = canvas;
        this.fps = fps;
        this.chunks = [];
        this.fileName = "video.webm";
        const bps = Math.pow(2, Math.floor(Math.log2(canvas.width * canvas.height * 24))); // just a heuristic
        this.videoStream = canvas.captureStream(0);
        this.videoRecorder = new MediaRecorder(this.videoStream, { audioBitsPerSecond: 0, videoBitsPerSecond: bps, mimeType: "video/webm" });
        this.videoRecorder.ondataavailable = e => {
            this.chunks.push(e.data);
        };
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
    startStop() {
        if (this.videoRecorder.state === "recording") {
            this.videoRecorder.stop();
        }
        else {
            this.videoRecorder.start();
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
        const track = this.videoStream.getVideoTracks()[0];
        if (track instanceof CanvasCaptureMediaStreamTrack) {
            track.requestFrame();
        }
    }
}
export function throttled(freqInHz, logic) {
    const periodInMilliseconds = 1000 / freqInHz;
    const lastTime = [performance.now()];
    return time => {
        const t = time !== null && time !== void 0 ? time : performance.now();
        const elapsed = t - lastTime[0];
        if (elapsed > periodInMilliseconds) {
            logic();
            lastTime[0] = t - (elapsed % periodInMilliseconds);
        }
    };
}
//# sourceMappingURL=misc.js.map