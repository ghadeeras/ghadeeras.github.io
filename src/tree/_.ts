/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
/// <reference path="./matgen.ts" />
/// <reference path="./renderer.ts" />

module Tree {

    let vertexShaderCode = null;
    let fragmentShaderCode = null;

    export function init() {
        window.onload = () => Gear.load("/shaders", () => doInit(),
            ["tree.vert", shader => vertexShaderCode = shader],
            ["tree.frag", shader => fragmentShaderCode = shader]
        );
    }

    function doInit() {
        const generator = new MatriciesGenerator();
        const matrices = generator.generateMatricies();

        const renderer = new Renderer(vertexShaderCode, fragmentShaderCode, matrices);
        const matricesSink = renderer.matricesSink();

        const canvas = Gear.elementEvents("canvas-gl");
        const depthInc = Gear.elementEvents("depth-inc");
        const depthDec = Gear.elementEvents("depth-dec");

        Gear.Flow.from(
            depthInc.clickPos.map(() => +1),
            depthDec.clickPos.map(() => -1)
        ).reduce((inc, depth) => Math.max(Math.min(8, inc + depth), 1), 5).branch(
            flow => flow.map(depth => depth.toString()).to(Gear.text("depth")),
            flow => flow.map(depth => {
                generator.depth = depth;
                return generator.generateMatricies();
            }).to(matricesSink)
        );

        const mouseButtonPressed = canvas.mouseButons.map(([l, m, r]) => l);
        Gear.Flow.from(
            canvas.mousePos.then(Gear.flowSwitch(mouseButtonPressed)),
            canvas.touchPos.map(positions => positions[0])
        ).map(([x, y]) => [
            2 * (x - canvas.element.clientWidth / 2 ) / canvas.element.clientWidth, 
            2 * (canvas.element.clientHeight / 2 - y) / canvas.element.clientHeight
        ]).branch(
                flow => flow.filter(selected("rotation")).to(renderer.rotationSink()),
                flow => flow.filter(selected("lightPosition")).to(renderer.lightPositionSink()),
                flow => flow.filter(selected("color")).to(renderer.colorSink()),
                flow => flow.filter(selected("shininess")).map(([x, y]) => y).to(renderer.shininessSink()),
                flow => flow.filter(selected("fogginess")).map(([x, y]) => (1 + y) / 2).to(renderer.fogginessSink()),
                flow => flow.filter(selected("twist")).map(([x, y]) => y).to(renderer.twistSink()),
                flow => flow.filter(selected("angle"))
                    .map(([x, y]) => {
                        generator.verticalAngle = x * Math.PI;
                        return generator.generateMatricies()
                    })
                    .to(matricesSink),
            );
    }

    function selected(value: string): Gear.Predicate<Gear.PointerPosition> {
        const mouseBinding = document.getElementById("mouse-binding") as HTMLInputElement;
        return () => mouseBinding.value == value;
    }

}