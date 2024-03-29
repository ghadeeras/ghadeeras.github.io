export class CommandEncoder {
    constructor(label, device) {
        this.device = device;
        this.descriptor = { label };
        this.encoder = this.device.device.createCommandEncoder(this.descriptor);
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
            pass.end();
        }
    }
    renderPass(descriptor, passSetter) {
        const pass = this.encoder.beginRenderPass(descriptor);
        try {
            return passSetter(pass);
        }
        finally {
            pass.end();
        }
    }
}
//# sourceMappingURL=encoder.js.map