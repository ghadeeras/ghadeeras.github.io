export class CommandEncoder {
    constructor(device) {
        this.device = device;
        this.encoder = this.device.device.createCommandEncoder();
    }
    finish() {
        return this.encoder.finish();
    }
    computePass(passSetter) {
        const pass = this.encoder.beginComputePass();
        try {
            return passSetter(pass);
        }
        finally {
            pass.endPass();
        }
    }
    renderPass(descriptor, passSetter) {
        const pass = this.encoder.beginRenderPass(descriptor);
        try {
            return passSetter(pass);
        }
        finally {
            pass.endPass();
        }
    }
}
//# sourceMappingURL=encoder.js.map