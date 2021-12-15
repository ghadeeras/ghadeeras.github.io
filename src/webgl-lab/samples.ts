import * as gear from "gear";

export type ProgramSample = {
    name: string;
    vertexShader: string;
    fragmentShader: string;
}

export const samples: ProgramSample[] = [
    {
        name: "Basic (Almost Empty)",
        vertexShader: vertexWrapper(`
            attribute vec2 vertex;

            uniform float w;
            
            void main() {
                gl_Position = vec4(vertex, 0.0, w + 2.0);
            }
        `),
        fragmentShader: fragmentWrapper(`
            uniform vec3 color;

            const vec3 one = vec3(1.0, 1.0, 1.0);

            void main() {
                gl_FragColor = vec4((color + one) / 2.0, 1.0);
            }
        `)
    },
    {
        name: "3D Sinc (Vertex Shader Lighting)",
        vertexShader: 'file:sinc-vert-lighting.vert',
        fragmentShader: 'file:sinc-vert-lighting.frag'
    },
    {
        name: "3D Sinc (Fragment Shader Lighting)",
        vertexShader: 'file:sinc-frag-lighting.vert',
        fragmentShader: 'file:sinc-frag-lighting.frag'
    },
    {
        name: "Complex Fractal",
        vertexShader: 'file:complex-fractal.vert',
        fragmentShader: 'file:complex-fractal.frag'
    }
];

export function loadShaders(sample: ProgramSample, consumer: gear.Consumer<ProgramSample>) {
    fetchShader(sample.vertexShader, shader => {
        sample.vertexShader = shader;
        if (!isFile(sample.fragmentShader)) {
            consumer(sample);
        }
    });

    fetchShader(sample.fragmentShader, shader => {
        sample.fragmentShader = shader;
        if (!isFile(sample.vertexShader)) {
            consumer(sample);
        }
    });
}

function vertexWrapper(shader: string) {
    const header = trimMargin(`
        precision highp float;
    `);
    return header + "\n\n" + trimMargin(shader);
}

function fragmentWrapper(shader: string) {
    const header = trimMargin(`
        #ifdef GL_ES
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        #else
        precision mediump float;
        #endif
        #endif
    `);
    return header + "\n\n" + trimMargin(shader);
}

function trimMargin(code: string): string {
    const lines = code.split("\n");
    const margin = lines
        .map(line => line.search(/[^\s]/))
        .filter(index => index >= 0)
        .reduce((a, b) => a < b ? a : b)
    return lines
        .map(line => line.length > margin ? line.substring(margin) : line)
        .reduce((a, b) => a + "\n" + b)
        .trim();
}

function fetchShader(shader: string, consumer: gear.Consumer<string>) {
    if (isFile(shader)) {
        fetchFile(locationOf(shader), consumer);
    } else {
        consumer(shader);
    }
}

function fetchFile(url: string, consumer: gear.Consumer<string>) {
    fetch(url, { method : "get", mode : "no-cors", cache : "no-cache" }).then(response => response.text().then(consumer));
}

function locationOf(str: string) {
    return "../shaders/" + str.substring('file:'.length);
}

function isFile(str: string) {
    return startsWith(str, 'file:');
}

function startsWith(str: string, s: string) {
    return str.substring(0, s.length) == s;
}
