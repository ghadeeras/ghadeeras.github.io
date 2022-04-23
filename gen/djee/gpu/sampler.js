export class Sampler {
    constructor(device, descriptor = undefined) {
        this.device = device;
        this.descriptor = descriptor;
        this.sampler = this.device.device.createSampler(descriptor);
    }
}
//# sourceMappingURL=sampler.js.map