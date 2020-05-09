/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />

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
        const context = new Djee.Context("canvas-gl");
        const buffer = context.newBuffer();
        buffer.data = vertexData();

        const vertexShader = context.shader(Djee.ShaderType.VertexShader, vertexShaderCode);
        const fragmentShader = context.shader(Djee.ShaderType.FragmentShader, fragmentShaderCode);
        const program = context.link([vertexShader, fragmentShader]);
        program.use();

        const position = program.locateAttribute("position", 3);
        const normal = program.locateAttribute("normal", 3);
        position.pointTo(buffer, 6, 0);
        normal.pointTo(buffer, 6, 3);

        const matModel = program.locateUniform("matModel", 4, true);
        const matSubModel = program.locateUniform("matSubModel", 4, true);
        const matView = program.locateUniform("matView", 4, true);
        const matProjection = program.locateUniform("matProjection", 4, true);

        const view = Space.Matrix.globalView(Space.vec(0, 2, 8), Space.vec(0, 2, 0), Space.vec(0, 1, 0));
        matView.data = view.asColumnMajorArray;
        const proj = Space.Matrix.project(1, 100, 1);
        matProjection.data = proj.asColumnMajorArray;

        const lightPosition = program.locateUniform("lightPosition", 3, false);
        const color = program.locateUniform("color", 3, false);
        const shininess = program.locateUniform("shininess", 1, false);

        lightPosition.data = [4, 4, 8];
        color.data = [0.3, 0, 0.7]
        shininess.data = [1];

        const matricies = generateMatricies(5);

        const canvas = Gear.elementEvents("canvas-gl")
        canvas.mousePos
        .defaultsTo([0, 0])
        .map(([x, y]) => [4 * Math.PI * x / canvas.element.clientWidth, - 4 * Math.PI * y / canvas.element.clientHeight])
            .producer(([x, y]) => {
                matModel.data = Space.Matrix.translation(0, +2, 0)
                    .by(Space.Matrix.rotation(y, Space.vec(1, 0, 0)))
                    .by(Space.Matrix.rotation(x, Space.vec(0, 1, 0)))
                    .by(Space.Matrix.translation(0, -2, 0))
                    .asColumnMajorArray;
                draw(context, matSubModel, matricies)
            })

        draw(context, matSubModel, matricies);
    }

    const scale = Math.SQRT1_2;
    const verticalAngle = Math.PI / 4;
    const horizontalAngle = 2 * Math.PI / 3;
    const branch1Matrix = Space.Matrix.translation(0, 2, 0)
        .by(Space.Matrix.rotation(verticalAngle, Space.vec(1, 0, 0)))
        .by(Space.Matrix.scaling(scale, scale, scale));
    const branch2Matrix = Space.Matrix.translation(0, 2, 0)
        .by(Space.Matrix.rotation(verticalAngle, Space.vec(Math.cos(horizontalAngle), 0, +Math.sin(horizontalAngle))))
        .by(Space.Matrix.scaling(scale, scale, scale));
    const branch3Matrix = Space.Matrix.translation(0, 2, 0)
        .by(Space.Matrix.rotation(verticalAngle, Space.vec(Math.cos(horizontalAngle), 0, -Math.sin(horizontalAngle))))
        .by(Space.Matrix.scaling(scale, scale, scale));
    
    function generateMatricies(depth: number) {
        const result: Space.Matrix[] = [];
        doGenerateMatricies(result, depth, Space.Matrix.identity())
        return result.map(matrix => matrix.asColumnMajorArray);
    }

    function doGenerateMatricies(result: Space.Matrix[], depth: number, matrix: Space.Matrix) {
        result.push(matrix);
        if (depth > 0) {
            doGenerateMatricies(result, depth - 1, matrix.by(branch1Matrix));
            doGenerateMatricies(result, depth - 1, matrix.by(branch2Matrix));
            doGenerateMatricies(result, depth - 1, matrix.by(branch3Matrix));
        }
    }

    function draw(context: Djee.Context, model: Djee.Uniform, matrices: number[][]) {
        const gl = context.gl;
        gl.enable(gl.DEPTH_TEST);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (let matrix of matrices) {
            model.data = matrix;
            for (let y = 0; y < 32; y++) {
                gl.drawArrays(WebGLRenderingContext.TRIANGLE_STRIP, y * 66, 66);
            }
        }
        
        gl.finish()
        gl.flush();
    }

    function vertexData(): number[] {
        const result: number[] = [];
        for (let i = 0; i < 32; i++) {
            for (let j = 0; j <= 32; j++) {
                const y1 = i / 32; 
                const y2 = (i + 1) / 32;
                const z = Math.cos(Math.PI * j / 16); 
                const x = Math.sin(Math.PI * j / 16);

                const r = 1 / 8;
                const d = 0.5;
                const r1 = r * (1 - d * (y1 - 0.5));
                const r2 = r * (1 - d * (y2 - 0.5));

                const n = Space.vec(x, r * d, z).unit;
                
                result.push(
                    2 * x * r2, 2 * y2, 2 * z * r2, ...n.coordinates,
                    2 * x * r1, 2 * y1, 2 * z * r1, ...n.coordinates, 
                );
            }
        }
        return result;
    }

}