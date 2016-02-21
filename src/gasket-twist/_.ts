/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
/// <reference path="model.ts" />
/// <reference path="view.ts" />
/// <reference path="controller.ts" />

module GasketTwist {

    window.onload = e => {
        var sierpinski = new Sierpinski();
        var rendering = new Rendering();
        var view = new View("canvas-gl", "division-depth");
        var controller = new Controller("canvas-gl", "input-corners", "input-centers", "input-twist", "input-scale", "division-inc", "division-dec");

        controller.outDepth.drives(sierpinski.depth);
        controller.outScale.drives(rendering.scale);
        controller.outTwist.drives(rendering.twist);
        controller.outShowCorners.drives(rendering.showCorners);
        controller.outShowCenters.drives(rendering.showCenters);

        view.inArrays.probes(sierpinski.outArrays);
        view.inScale.probes(rendering.scale);
        view.inTwist.probes(rendering.twist);
        view.inShowCorners.probes(rendering.showCorners);
        view.inShowCenters.probes(rendering.showCenters);
        view.inDepth.probes(sierpinski.depth);
    }

}