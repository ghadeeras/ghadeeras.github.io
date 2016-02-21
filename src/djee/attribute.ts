module Djee {

    export class Attribute {

        private _program: Program;
        private _name: string;
        private _size: number;
        private _location: number;

        get program() {
            return this._program;
        }

        get name() {
            return this._name;
        }

        get size() {
            return this._size;
        }

        get location() {
            return this._location;
        }

        constructor(program: Program, name: string, size: number) {
            this._program = program;
            this._name = name;
            this._size = size;
            this._location = program.context.gl.getAttribLocation(program.program, name);
        }

        pointTo(buffer: Buffer, stride: number = this._size, offset: number = 0) {
            buffer.bind(gl => {
                gl.vertexAttribPointer(
                    this._location,
                    this._size,
                    gl.FLOAT,
                    false,
                    stride * 4,
                    offset * 4
                );
                gl.enableVertexAttribArray(this._location);
            });
        }

    }

}