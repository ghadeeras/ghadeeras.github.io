var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { aether } from "../libs.js";
export class XRSwitch {
    constructor(context, xr, mode, resize, draw) {
        this.context = context;
        this.xr = xr;
        this.mode = mode;
        this.resize = resize;
        this.draw = draw;
        this._session = null;
    }
    static create(context, resize, draw) {
        return __awaiter(this, void 0, void 0, function* () {
            const xr = navigator.xr;
            if (!xr) {
                return null;
            }
            const supportedMode = (yield xr.isSessionSupported("immersive-ar")) ? "immersive-ar"
                : (yield xr.isSessionSupported("immersive-vr")) ? "immersive-vr"
                    : (yield xr.isSessionSupported("inline")) ? "inline"
                        : null;
            if (supportedMode === null) {
                return null;
            }
            return new XRSwitch(context, xr, supportedMode, resize, draw);
        });
    }
    get session() {
        return this._session;
    }
    get isOn() {
        return this._session !== null;
    }
    turnOn(spaceType_1) {
        return __awaiter(this, arguments, void 0, function* (spaceType, onEnd = () => { }) {
            if (this._session === null) {
                const session = yield this.xr.requestSession(this.mode);
                session.onend = () => {
                    onEnd();
                    this._session = null;
                };
                const layer = new XRWebGLLayer(session, this.context.gl, {
                    depth: true,
                    ignoreDepthValues: false,
                    stencil: false,
                    antialias: true,
                    alpha: false,
                });
                yield session.updateRenderState({ baseLayer: layer });
                this.context.gl.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, layer.framebuffer);
                this._session = session;
                const space = yield session.requestReferenceSpace(spaceType);
                const render = (time, frame) => {
                    const pose = frame.getViewerPose(space);
                    if (pose) {
                        session.requestAnimationFrame(render);
                        this.draw(aether.mat4.from(pose.transform.inverse.matrix));
                    }
                };
                session.requestAnimationFrame(render);
                this.resize(layer.framebufferWidth, layer.framebufferHeight);
            }
            return this;
        });
    }
    turnOff() {
        const session = this._session;
        if (session !== null) {
            this._session = null;
            session.end();
        }
    }
}
//# sourceMappingURL=xr.js.map