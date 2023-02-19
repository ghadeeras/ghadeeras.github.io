var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        return elapsedTime;
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
    static create(unitTime, elementOrId) {
        const element = elementOrId instanceof HTMLElement ? elementOrId : required(document.getElementById(elementOrId));
        return new FrequencyMeter(unitTime, freq => element.innerHTML = freq.toFixed(3));
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
export function fetchTextFile(url) {
    return __awaiter(this, void 0, void 0, function* () {
        return fetch(url, { method: "get", mode: "no-cors" }).then(response => response.text());
    });
}
export function property(object, key) {
    return {
        getter: () => object[key],
        setter: value => object[key] = value
    };
}
export function trap(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
}
//# sourceMappingURL=misc.js.map