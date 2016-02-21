module Space {

    export class Vector {

        constructor(public coordinates: number[]) {
        }
        
        combine(v: Vector, op: (c: number, vc: number) => number): Vector {
            var max = Math.max(this.coordinates.length, v.coordinates.length);
            var result = new Array<number>(max);
            for (var i = 0; i < max; i++) {
                var c = this.coordinates[i] || 0;
                var vc = v.coordinates[i] || 0;
                result[i] = op(c, vc);
            }
            return new Vector(result);
        }
        
        affect(f: (c: number) => number): Vector {
            var length = this.coordinates.length;
            var result = new Array<number>(length);
            for (var i = 0; i < length; i++) {
                result[i] = f(this.coordinates[i]);
            }
            return new Vector(result);
        }
        
        plus(v: Vector) {
            return this.combine(v, (c, cv) => c + cv);
        }
        
        minus(v: Vector) {
            return this.combine(v, (c, cv) => c - cv);
        }
        
        multiply(v: Vector) {
            return this.combine(v, (c, cv) => c * cv);
        }
        
        divide(v: Vector) {
            return this.combine(v, (c, cv) => c / cv);
        }
        
        scale(factor: number) {
            return this.affect(c => factor * c);
        }
        
        dot(v: Vector) {
            return this.multiply(v).coordinates.reduce((a, b) => a + b, 0);
        }
        
        mix(v: Vector, weight: number) {
            return this.scale(1 - weight).plus(v.scale(weight));
        }
        
        get lengthSquared() {
            return this.dot(this);
        }
        
        get length() {
            return Math.sqrt(this.lengthSquared);
        }
        
        get unit() {
            return this.scale(1 / this.length);
        }
        
        angle(v: Vector) {
            var l2 = this.lengthSquared;
            var vl2 = v.lengthSquared;
            var dot = this.dot(v);
            var cos2 = (dot * dot) / (l2 * vl2);
            var cos2x = 2 * cos2 - 1;
            var x = Math.acos(cos2x) / 2;
            return x;
        }
        
        c(indexes: number[]) {
            var result = new Array<number>(indexes.length);
            for (var i = 0; i < indexes.length; i++) {
                result[i] = this.coordinates[indexes[i]] || 0;
            }
            return new Vector(result);
        }
        
        cross(v: Vector) {
            var v1 = this.c([0, 1, 2]).coordinates;
            var v2 = v.c([0, 1, 2]).coordinates;
            var result = new Array<number>(3);
            result[0] = v1[1]*v2[2] - v1[2]*v2[1];
            result[1] = v1[2]*v2[0] - v1[0]*v2[2];
            result[2] = v1[0]*v2[1] - v1[1]*v2[0];
            return new Vector(result);
        }
        
        sameAs(v: Vector, precision: number = 0.001) {
            var cross = this.cross(v).length;
            var dot = this.dot(v);
            var tan = cross / dot;
            return tan < precision && tan > -precision;
        }
        
   }
    
}
