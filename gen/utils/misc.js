export function required(value) {
    if (!value) {
        throw new Error(`Required value is ${value}!`);
    }
    return value;
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
//# sourceMappingURL=misc.js.map