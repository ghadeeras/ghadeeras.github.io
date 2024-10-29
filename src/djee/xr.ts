import { required, wgl } from "."
import { aether } from "../libs.js";

export class XRSwitch {

    private _session: XRSession | null = null;

    constructor(
        readonly context: wgl.Context, 
        readonly xr: XRSystem, 
        readonly mode: XRSessionMode,
        private enter: (space: XRReferenceSpace) => XRReferenceSpace,
        private leave: () => void, 
        private draw: (eye: number, viewPort: XRViewport, proj: aether.Mat4, view: aether.Mat4, model: aether.Mat4) => void
    ) {}

    static async create(
        context: wgl.Context, 
        enter: (space: XRReferenceSpace) => XRReferenceSpace, 
        leave: () => void, 
        draw: (eye: number, viewPort: XRViewport, proj: aether.Mat4, matrix: aether.Mat4, model: aether.Mat4) => void
    ): Promise<XRSwitch | null> {
        const xr = navigator.xr
        if (!xr) {
            return null
        }
    
        const supportedMode: XRSessionMode | null =
              await xr.isSessionSupported("immersive-ar") ? "immersive-ar"
            : await xr.isSessionSupported("immersive-vr") ? "immersive-vr"
            : await xr.isSessionSupported("inline") ? "inline"
            : null
    
        if (supportedMode === null) {
            return null
        }

        return new XRSwitch(context, xr, supportedMode, enter, leave, draw)
    }

    get session(): XRSession | null {
        return this._session
    }

    get isOn(): boolean {
        return this._session !== null
    }

    async turnOn(spaceType: XRReferenceSpaceType, onEnd: () => void = () => {}): Promise<this> {
        if (this._session === null) {
            const session = await this.xr.requestSession(this.mode)
            session.onend = () => {
                onEnd()
                this.leave()
                this._session = null
            }

            const layer = new XRWebGLLayer(session, this.context.gl, {
                depth: true,
                ignoreDepthValues: false,
                stencil: false,
                antialias: true,
                alpha: false,
            })
            await session.updateRenderState({ baseLayer: layer })
            this.context.gl.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, layer.framebuffer)
            this._session = session

            const space = await session.requestReferenceSpace(spaceType)
            const localSpace = this.enter(space)
            const render = (time: number, frame: XRFrame) => {
                const pose = frame.getViewerPose(localSpace)
                if (!pose) {
                    return
                }
                session.requestAnimationFrame(render)
                for (let i = 0; i < pose.views.length; i++) {
                    const view = pose.views[i]
                    const viewPort = layer.getViewport(view)
                    if (!viewPort) {
                        continue
                    }
                    const proj = aether.mat4.from(view.projectionMatrix)
                    const camera = aether.mat4.from(view.transform.inverse.matrix);
                    let model = aether.mat4.identity()
                    const inputSpace = [...session.inputSources.values()].find(s => s.gripSpace)
                    if (inputSpace && inputSpace.gripSpace) {
                        const inputPose = frame.getPose(inputSpace.gripSpace, localSpace)
                        if (inputPose) {
                            model = aether.mat4.from(inputPose.transform.matrix)
                        }
                    }
                    this.draw(i, viewPort, proj, camera, model)
                }
            }
            session.requestAnimationFrame(render)
        }
        return this
    }

    turnOff() {
        const session = this._session
        if (session !== null) {
            this._session = null
            session.end()
        }
    }

}