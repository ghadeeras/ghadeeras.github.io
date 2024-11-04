export class XRSwitch {

    private constructor(
        readonly xr: XRSystem, 
        readonly mode: XRSessionMode,
    ) {}

    static async create(acceptableModes: XRSessionMode[] = ["immersive-vr", "inline"]): Promise<XRSwitch | null> {
        const xr = navigator.xr
        if (!xr) {
            return null
        }

        const modeFinder: (i: number) => Promise<XRSessionMode | null> = async i => {
            return i < acceptableModes.length
                ? await xr.isSessionSupported(acceptableModes[i])
                    ? acceptableModes[i]
                    : await modeFinder(i + 1)
                : null
        }
    
        const supportedMode = await modeFinder(0)
        if (supportedMode === null) {
            return null
        }

        return new XRSwitch(xr, supportedMode)
    }

    async turnOn(spaceTypes: XRReferenceSpaceType[], gl: WebGL2RenderingContext, listeners: XRealitySessionListeners): Promise<XRealitySession> {
        return await XRealitySession.create(this.xr, this.mode, spaceTypes, gl, listeners);
    }

}

export type XRealitySessionListeners = {
    [k in keyof XRSessionEventMap]?: XRSession[`on${k}`]
}

export type XRealityFrame = {
    time: number
    frame: XRFrame
    layer: XRWebGLLayer
    spaceType: XRReferenceSpaceType
    space: XRReferenceSpace
    viewerPose: XRViewerPose
    view: XRView
}

export class XRealitySession {

    private animationRequest: number | null = null
    private renderer: ((frame: XRealityFrame) => void) | null = null

    private constructor(
        readonly session: XRSession, 
        readonly spaceType: XRReferenceSpaceType, 
        readonly space: XRReferenceSpace, 
        readonly gl: WebGL2RenderingContext,
    ) {}

    static async create(
        xr: XRSystem, 
        mode: XRSessionMode, 
        spaceTypes: XRReferenceSpaceType[], 
        gl: WebGL2RenderingContext, 
        listeners: XRealitySessionListeners
    ): Promise<XRealitySession> {
        const session = await xr.requestSession(mode);
        for (const k in listeners) {
            session.addEventListener(k, listeners[k as keyof XRSessionEventMap] as EventListenerOrEventListenerObject)
        }

        await session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) })

        const spaceFinder: (i: number) => Promise<[XRReferenceSpaceType, XRReferenceSpace]> = i => {
            return i < spaceTypes.length 
                ? session.requestReferenceSpace(spaceTypes[i])
                    .then(s => [spaceTypes[i], s] as [XRReferenceSpaceType, XRReferenceSpace])
                    .catch(() => spaceFinder(i + 1))
                : Promise.reject("")
        }

        const [spaceType, space] = await spaceFinder(0)
        return new XRealitySession(session, spaceType, space, gl)
    }

    async end(): Promise<void> {
        this.stopAnimation()
        this.session.end()
    }

    startAnimation(renderer: (frame: XRealityFrame) => void) {
        if (this.animationRequest === null) {
            this.animationRequest = this.requestAnimationFrame(renderer)
            this.renderer = renderer
        }
    }

    stopAnimation() {
        if (this.animationRequest !== null) {
            this.session.cancelAnimationFrame(this.animationRequest)
            this.animationRequest = null
        }
    }

    resumeAnimation() {
        if (this.animationRequest === null && this.renderer !== null) {
            this.animationRequest = this.requestAnimationFrame(this.renderer)
        }
    }

    private requestAnimationFrame(renderer: (frame: XRealityFrame) => void): number | null {
        return this.session.requestAnimationFrame((t, f) => this.renderFrame(t, f, renderer));
    }

    private renderFrame(
        time: number, 
        frame: XRFrame,
        renderer: (frame: XRealityFrame) => void
    ): void {
        const spaceType = this.spaceType
        const space = this.space
        const viewerPose = frame.getViewerPose(space)
        if (!viewerPose) {
            return
        }
        const layer = frame.session.renderState.baseLayer
        if (!layer) {
            return
        }
        if (this.animationRequest !== null) {
            this.animationRequest = this.requestAnimationFrame(renderer)
        }
        
        this.gl.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, layer.framebuffer)
        for (const view of viewerPose.views) {
            const viewPort = layer.getViewport(view)
            if (!viewPort) {
                continue
            }
            this.gl.viewport(viewPort.x, viewPort.y, viewPort.width, viewPort.height)
            renderer({ time, frame, layer, spaceType, space, viewerPose, view })
        }
    }

}