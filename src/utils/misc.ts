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
        return elapsedTime
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

    static create(unitTime: number, elementOrId: HTMLElement | string) {
        const element = elementOrId instanceof HTMLElement 
            ? elementOrId 
            : elementOrId
                ? document.getElementById(elementOrId)
                : null
        return new FrequencyMeter(unitTime, element !== null 
            ? (freq => element.innerHTML = freq.toFixed(3)) 
            : () => {}
        )
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

export async function fetchTextFile(url: string): Promise<string> {
    return fetch(url, { method : "get", mode : "no-cors" }).then(response => response.text());
}

export type Property<V> = {
    getter: () => V
    setter: (value: V) => void
}

export function property<T, K extends keyof T>(object: T, key: K): Property<T[K]> {
    return {
        getter: () => object[key],
        setter: value => object[key] = value
    }
}

export function trap(e: UIEvent) {
    e.preventDefault()
    e.stopImmediatePropagation()
    e.stopPropagation()
}
