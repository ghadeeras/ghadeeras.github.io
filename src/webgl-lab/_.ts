/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
/// <reference path="samples.ts" />
/// <reference path="view.ts" />
/// <reference path="controller.ts" />

module WebGLLab {

    export function init() {
        window.onload = e => doInit();
    }

    function doInit() {
        const controller = new Controller();
        const view = new View("canvas-gl", samples);
        controller.levelOfDetails().to(view.levelOfDetail());
        controller.programSample()
            .map(index => samples[index])
            .then((sample, consumer) => loadShaders(sample, consumer))
            .to(view.editor());
        controller.program().to(view.compiler());
        controller.mesh().to(view.mesh());
        controller.mouseXBinding().to(view.xBinding());
        controller.mouseYBinding().to(view.yBinding());
        controller.mouseXY().to(view.xy());
    }


}