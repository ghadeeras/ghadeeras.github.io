import { xrContext } from "webgxx";
export class XRSwitch {
    constructor(xr, mode) {
        this.xr = xr;
        this.mode = mode;
    }
    static async create(acceptableModes = ["immersive-vr", "inline"]) {
        const xr = navigator.xr;
        if (xr === undefined) {
            return null;
        }
        const supportedMode = await findSupportedMode(xr, acceptableModes);
        if (supportedMode === null) {
            return null;
        }
        return new XRSwitch(xr, supportedMode);
    }
    async turnOn(spaceTypes, device, listeners) {
        return await XRealitySession.create(this.xr, this.mode, spaceTypes, device, listeners);
    }
}
export class XRealitySession {
    constructor(session, spaceType, space, context) {
        this.session = session;
        this.spaceType = spaceType;
        this.space = space;
        this.context = context;
        this.animationRequest = null;
        this.renderer = null;
    }
    static async create(xr, mode, spaceTypes, device, listeners) {
        const session = await xr.requestSession(mode);
        for (const k in listeners) {
            session.addEventListener(k, listeners[k]);
        }
        const context = await xrContext(session, device);
        const [spaceType, space] = await findSpace(session, spaceTypes);
        return new XRealitySession(session, spaceType, space, context);
    }
    async end() {
        this.stopAnimation();
        this.session.end();
    }
    startAnimation(renderer) {
        if (this.animationRequest === null) {
            this.animationRequest = this.requestAnimationFrame(renderer);
            this.renderer = renderer;
        }
    }
    stopAnimation() {
        if (this.animationRequest !== null) {
            this.session.cancelAnimationFrame(this.animationRequest);
            this.animationRequest = null;
        }
    }
    resumeAnimation() {
        if (this.animationRequest === null && this.renderer !== null) {
            this.animationRequest = this.requestAnimationFrame(this.renderer);
        }
    }
    requestAnimationFrame(renderer) {
        return this.session.requestAnimationFrame((t, f) => this.renderFrame(t, f, renderer));
    }
    renderFrame(time, frame, renderer) {
        const spaceType = this.spaceType;
        const space = this.space;
        const viewerPose = frame.getViewerPose(space);
        if (!viewerPose) {
            return;
        }
        const layer = frame.session.renderState.baseLayer;
        if (!layer) {
            return;
        }
        if (this.animationRequest !== null) {
            this.animationRequest = this.requestAnimationFrame(renderer);
        }
        const frames = [];
        for (const view of viewerPose.views) {
            const viewport = layer.getViewport(view);
            if (!viewport) {
                continue;
            }
            frames.push({ time, wrapped: frame, layer, spaceType, space, viewerPose, view, viewport });
        }
        renderer(frames);
    }
}
async function findSpace(session, spaceTypes) {
    for (let i = 0; i < spaceTypes.length; i++) {
        const spaceType = spaceTypes[i];
        try {
            const space = await session.requestReferenceSpace(spaceTypes[i]);
            return [spaceType, space];
        }
        catch (e) {
            console.log(`Inaccessible space ${spaceType}`, e);
        }
    }
    throw new Error("No accessible space was found!");
}
async function findSupportedMode(xr, acceptableModes) {
    for (let i = 0; i < acceptableModes.length; i++) {
        if (await xr.isSessionSupported(acceptableModes[i])) {
            return acceptableModes[i];
        }
    }
    return null;
}
//# sourceMappingURL=xr.js.map