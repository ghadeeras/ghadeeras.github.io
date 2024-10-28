var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as xrv from '../gltf/view.xr.js';
import * as aether from '/aether/latest/index.js';
export const gitHubRepo = "ghadeeras.github.io/tree/master/src/xr";
export const huds = {};
export function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const xrButton = document.getElementById("xr-button");
        if (!xrButton) {
            console.log("XR button not found");
            return;
        }
        const xr = navigator.xr;
        if (!xr) {
            console.log("XR not supported");
            return;
        }
        const supportedMode = (yield xr.isSessionSupported("immersive-vr")) ? "immersive-vr"
            : (yield xr.isSessionSupported("inline")) ? "inline"
                : null;
        if (supportedMode === null) {
            console.log("Required modes are not supported");
            return;
        }
        console.log("Supported mode: ", supportedMode);
        xrButton.style.visibility = "visible";
        xrButton.onclick = () => initXR(xr, supportedMode, xrButton);
    });
}
function initXR(xr, mode, xrButton) {
    return __awaiter(this, void 0, void 0, function* () {
        xrButton.style.visibility = "hidden";
        const session = yield xr.requestSession(mode);
        session.onend = () => xrExited(xrButton);
        const factory = yield xrv.newViewFactory(session, "canvas");
        const view = factory();
        view.modelColor = [0.8, 0.8, 0.8, 1];
        view.shininess = 1;
        view.fogginess = 0;
        view.lightPosition = [-5, 5, 5];
        view.lightRadius = 0.005;
        const model = yield view.loadModel(new URL("/models/SculptTorso.gltf", window.location.href).href);
        const space = (yield session.requestReferenceSpace("local"));
        session.requestAnimationFrame((time, frame) => renderFrame(time, frame, view, session, space, model));
        view.resize();
    });
}
let m = aether.mat4.identity();
function renderFrame(time, frame, view, session, space, model) {
    const pose = frame.getViewerPose(space);
    if (pose) {
        session.requestAnimationFrame((time, frame) => renderFrame(time, frame, view, session, space, model));
        view.viewMatrix = aether.mat4.mul(model.scene.perspectives[0].matrix, aether.mat4.from(pose.transform.inverse.matrix));
        view.draw();
    }
    else {
        session.end();
    }
}
function xrExited(xrButton) {
    xrButton.style.visibility = "visible";
    console.log("XR exited");
}
//# sourceMappingURL=toy.js.map