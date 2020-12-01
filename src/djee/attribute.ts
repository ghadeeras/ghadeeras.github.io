import { Program } from "./program.js"
import { Buffer } from "./buffer.js"

export class Attribute {

    readonly location: number;

    constructor(readonly program: Program, readonly name: string, readonly size: number) {
        this.location = program.context.gl.getAttribLocation(program.program, name);
    }

    pointTo(buffer: Buffer, stride: number = this.size, offset: number = 0) {
        buffer.bind(gl => {
            gl.vertexAttribPointer(
                this.location,
                this.size,
                gl.FLOAT,
                false,
                stride * 4,
                offset * 4
            );
            gl.enableVertexAttribArray(this.location);
        });
    }

}
