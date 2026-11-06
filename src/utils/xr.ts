import { xrContext } from "webgxx"

export class XRSwitch {

    private constructor(
        readonly xr: XRSystem, 
        readonly mode: XRSessionMode,
    ) {}

    static async create(acceptableModes: XRSessionMode[] = ["immersive-vr", "inline"]): Promise<XRSwitch | null> {
        const xr = navigator.xr
        if (xr === undefined) {
            return null
        }

        const supportedMode = await findSupportedMode(xr, acceptableModes)
        if (supportedMode === null) {
            return null
        }

        return new XRSwitch(xr, supportedMode)
    }

    async turnOn(spaceTypes: XRReferenceSpaceType[], device: GPUDevice, listeners: XRealitySessionListeners): Promise<XRealitySession> {
        return await XRealitySession.create(this.xr, this.mode, spaceTypes, device, listeners);
    }

}

export type XRealitySessionListeners = {
    [k in keyof XRSessionEventMap]?: XRSession[`on${k}`]
}

export type XRealityFrame = {
    time: number
    wrapped: XRFrame
    layer: XRWebGLLayer
    spaceType: XRReferenceSpaceType
    space: XRReferenceSpace
    viewerPose: XRViewerPose
    view: XRView,
    viewport: XRViewport
}

export class XRealitySession {

    private animationRequest: number | null = null
    private renderer: ((frames: XRealityFrame[]) => void) | null = null

    private constructor(
        readonly session: XRSession, 
        readonly spaceType: XRReferenceSpaceType, 
        readonly space: XRReferenceSpace, 
        readonly context: GPUCanvasContext,
    ) {}

    static async create(
        xr: XRSystem, 
        mode: XRSessionMode, 
        spaceTypes: XRReferenceSpaceType[], 
        device: GPUDevice, 
        listeners: XRealitySessionListeners
    ): Promise<XRealitySession> {
        const session = await xr.requestSession(mode);
        for (const k in listeners) {
            session.addEventListener(k, listeners[k as keyof XRSessionEventMap] as EventListenerOrEventListenerObject)
        }

        const context = await xrContext(session, device)

        const [spaceType, space] = await findSpace(session, spaceTypes)
        return new XRealitySession(session, spaceType, space, context)
    }

    async end(): Promise<void> {
        this.stopAnimation()
        this.session.end()
    }

    startAnimation(renderer: (frames: XRealityFrame[]) => void) {
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

    private requestAnimationFrame(renderer: (frames: XRealityFrame[]) => void): number | null {
        return this.session.requestAnimationFrame((t, f) => this.renderFrame(t, f, renderer));
    }

    private renderFrame(
        time: number, 
        frame: XRFrame,
        renderer: (frames: XRealityFrame[]) => void
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
        
        const frames: XRealityFrame[] = []
        for (const view of viewerPose.views) {
            const viewport = layer.getViewport(view)
            if (!viewport) {
                continue
            }
            frames.push({ time, wrapped: frame, layer, spaceType, space, viewerPose, view, viewport })
        }
        renderer(frames)
    }

}

async function findSpace(session: XRSession, spaceTypes: XRReferenceSpaceType[]) {
    for (let i = 0; i < spaceTypes.length; i++) {
        const spaceType = spaceTypes[i]
        try {
            const space = await session.requestReferenceSpace(spaceTypes[i])
            return [spaceType, space] as [XRReferenceSpaceType, XRReferenceSpace]
        } catch (e) {
            console.log(`Inaccessible space ${spaceType}`, e)
        }
    }
    throw new Error("No accessible space was found!")
}

async function findSupportedMode(xr: XRSystem, acceptableModes: XRSessionMode[]) {
    for (let i = 0; i < acceptableModes.length; i++) {
        if (await xr.isSessionSupported(acceptableModes[i])) {
            return acceptableModes[i]
        }
    }
    return null
}
