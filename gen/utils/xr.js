export class XRSwitch {
    constructor(xr, mode) {
        this.xr = xr;
        this.mode = mode;
    }
    static async create(acceptableModes = ["immersive-vr", "inline"]) {
        const xr = navigator.xr;
        if (!xr) {
            return null;
        }
        const modeFinder = async (i) => {
            return i < acceptableModes.length
                ? await xr.isSessionSupported(acceptableModes[i])
                    ? acceptableModes[i]
                    : await modeFinder(i + 1)
                : null;
        };
        const supportedMode = await modeFinder(0);
        if (supportedMode === null) {
            return null;
        }
        return new XRSwitch(xr, supportedMode);
    }
    async turnOn(spaceTypes, gl, listeners) {
        return await XRealitySession.create(this.xr, this.mode, spaceTypes, gl, listeners);
    }
}
export class XRealitySession {
    constructor(session, spaceType, space, gl) {
        this.session = session;
        this.spaceType = spaceType;
        this.space = space;
        this.gl = gl;
        this.animationRequest = null;
        this.renderer = null;
    }
    static async create(xr, mode, spaceTypes, gl, listeners) {
        const session = await xr.requestSession(mode);
        for (const k in listeners) {
            session.addEventListener(k, listeners[k]);
        }
        await session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
        const spaceFinder = i => {
            return i < spaceTypes.length
                ? session.requestReferenceSpace(spaceTypes[i])
                    .then(s => [spaceTypes[i], s])
                    .catch(() => spaceFinder(i + 1))
                : Promise.reject("");
        };
        const [spaceType, space] = await spaceFinder(0);
        return new XRealitySession(session, spaceType, space, gl);
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
        this.gl.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, layer.framebuffer);
        for (const view of viewerPose.views) {
            const viewPort = layer.getViewport(view);
            if (!viewPort) {
                continue;
            }
            this.gl.viewport(viewPort.x, viewPort.y, viewPort.width, viewPort.height);
            renderer({ time, frame, layer, spaceType, space, viewerPose, view });
        }
    }
}
//# sourceMappingURL=xr.js.map