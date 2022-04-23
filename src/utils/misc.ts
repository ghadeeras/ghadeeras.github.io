export function required<T>(value: T | null | undefined): T {
    if (!value) {
        throw new Error(`Required value is ${value}!`)
    }
    return value
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

    private lastTime: number = 0
    private counter: number = 0
    
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