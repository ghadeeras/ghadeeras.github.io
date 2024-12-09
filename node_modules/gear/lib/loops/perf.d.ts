export declare class FrequencyMeter {
    private unitTime;
    private measurementConsumer;
    private lastReadingTime;
    private previousTime;
    private counter;
    constructor(unitTime: number, measurementConsumer: (measuredFrequency: number) => void);
    tick(time?: number): number;
    animateForever(frame: (t: number) => void): void;
    animate(frame: (t: number) => boolean): void;
    static create(unitTime: number, elementOrId: HTMLElement | string): FrequencyMeter;
}
export declare function throttled(freqInHz: number, logic: () => void): (time?: number) => void;
