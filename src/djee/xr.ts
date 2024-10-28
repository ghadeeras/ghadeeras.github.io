import { wgl } from "."
import { aether } from "../libs.js";

export class XRSwitch {

    private _session: XRSession | null = null;

    constructor(
        readonly context: wgl.Context, 
        readonly xr: XRSystem, 
        readonly mode: XRSessionMode,
        private resize: (width: number, height: number) => void,
        private draw: (matrix: aether.Mat4) => void
    ) {}

    static async create(
        context: wgl.Context, 
        resize: (width: number, height: number) => void, 
        draw: (matrix: aether.Mat4) => void
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

        return new XRSwitch(context, xr, supportedMode, resize, draw)
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
            const render = (time: number, frame: XRFrame) => {
                const pose = frame.getViewerPose(space)
                if (pose) {
                    session.requestAnimationFrame(render)
                    this.draw(aether.mat4.from(pose.transform.inverse.matrix))
                }
            }
            session.requestAnimationFrame(render)
            this.resize(layer.framebufferWidth, layer.framebufferHeight)
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