export class Attribute {
    constructor(program, name, size) {
        this.program = program;
        this.name = name;
        this.size = size;
        this.location = program.context.gl.getAttribLocation(program.program, name);
    }
    pointTo(buffer, stride = this.size, offset = 0) {
        buffer.bind(gl => {
            gl.vertexAttribPointer(this.location, this.size, gl.FLOAT, false, stride * 4, offset * 4);
            gl.enableVertexAttribArray(this.location);
        });
    }
}
//# sourceMappingURL=attribute.js.map