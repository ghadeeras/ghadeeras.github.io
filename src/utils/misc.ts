export function required<T>(value: T | null | undefined): T {
    if (value === null || value === undefined) {
        throw new Error(`Required value is ${value}!`)
    }
    return value
}

export function error<T>(message: string): T {
    throw new Error(message)
}

export function save(url: string, contentType: string, fileName: string) {
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.type = contentType
    anchor.target = '_blank'
    anchor.download = fileName
    anchor.click()
}

export class FrequencyMeter {

    private lastTime = 0
    private counter = 0
    
    constructor(private unitTime: number, private measurementConsumer: (measuredFrequency: number) => void) {
    }

    tick(time: number = performance.now()) {
        if (this.counter === 0) {
            this.lastTime = time
        }
        const elapsedTime = time - this.lastTime
        if (elapsedTime >= this.unitTime) {
            this.measurementConsumer(this.counter * this.unitTime / elapsedTime)
            this.counter = 0
            this.lastTime = time
        }
        this.counter++
    }

    animateForever(frame: (t: number) => void) {
        this.animate(t => {
            frame(t)
            return true
        })
    }

    animate(frame: (t: number) => boolean) {
        const wrappedFrame = (t: number) => {
            const requestNextFrame = frame(t)
            this.tick(t)
            if (requestNextFrame) {
                requestAnimationFrame(wrappedFrame)
            }
        }
        requestAnimationFrame(wrappedFrame)
    }

    static create(unitTime: number, elementId: string) {
        const element = required(document.getElementById(elementId))
        return new FrequencyMeter(unitTime, freq => element.innerHTML = freq.toPrecision(6))
    }

}

export class CanvasRecorder {

    readonly videoStream: MediaStream
    readonly videoRecorder: MediaRecorder

    private chunks: Blob[] = []
    private fileName: string = "video.webm"
    
    constructor(readonly canvas: HTMLCanvasElement, readonly fps: number = 0) {
        const bps = 2 ** Math.floor(Math.log2(canvas.width * canvas.height * 24)) // just a heuristic
        this.videoStream = canvas.captureStream(0)
        this.videoRecorder = new MediaRecorder(this.videoStream, { audioBitsPerSecond: 0, videoBitsPerSecond: bps, mimeType: "video/webm" })
        this.videoRecorder.ondataavailable = e => {
            this.chunks.push(e.data)
        }
        console.log(`Recorder mime type: ${this.videoRecorder.mimeType}`)
        console.log(`Recorder video bps: ${this.videoRecorder.videoBitsPerSecond}`)
        this.videoRecorder.onstop = () => {
            const blob = new Blob(this.chunks)
            const url = URL.createObjectURL(blob)
            save(url, this.videoRecorder.mimeType, this.fileName)
            this.chunks = []
        }
    }

    get state() {
        return this.videoRecorder.state
    }

    startStop() {
        if (this.videoRecorder.state === "recording") {
            this.videoRecorder.stop()
        } else {
            this.videoRecorder.start()
        }
    }

    start() {
        this.videoRecorder.start()
    }

    stop(fileName: string = "video.mp4") {
        this.fileName = fileName
        this.videoRecorder.stop()
    }

    requestFrame() {
        const track = this.videoStream.getVideoTracks()[0]
        if (track instanceof CanvasCaptureMediaStreamTrack) {
            track.requestFrame()
        }
    }

}

export function throttled(freqInHz: number, logic: () => void): (time?: number) => void {
    const periodInMilliseconds = 1000 / freqInHz
    const lastTime = [performance.now()]
    return time => {
        const t = time ?? performance.now()
        const elapsed = t - lastTime[0]
        if (elapsed > periodInMilliseconds) {
            logic()
            lastTime[0] = t - (elapsed % periodInMilliseconds)
        }
    }
}
