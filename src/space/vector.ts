import { failure } from "../djee/utils.js";
import { Mat } from "./matrix.js";

export type Dim = 2 | 3 | 4

export type DimMap<D extends Dim, D2, D3, D4> =
    D extends 4 ? D4 : never |
    D extends 3 ? D3 : never |
    D extends 2 ? D2 : never

export type LowerDim<D extends Dim> = DimMap<D, never, 2, 3>

export type Component<D extends Dim> = DimMap<D, (0 | 1), (0 | 1 | 2), (0 | 1 | 2 | 3)>

export type Tuple<T, D extends Dim> = DimMap<D, [T, T], [T, T, T], [T, T, T, T]> 

export type Vec<D extends Dim> = Tuple<number, D> 

export type VecDim<V extends Vec<any>> = V["length"]

export type SwizzleComponents<S extends Dim, D extends Dim> = Tuple<Component<S>, D>

export interface VecMath<D extends Dim> {

    of(...components: Vec<D>): Vec<D>

    add(v1: Vec<D>, v2: Vec<D>): Vec<D>

    sub(v1: Vec<D>, v2: Vec<D>): Vec<D>

    mul(v1: Vec<D>, v2: Vec<D>): Vec<D>

    div(v1: Vec<D>, v2: Vec<D>): Vec<D>

    scale(v: Vec<D>, f: number): Vec<D>

    max(v1: Vec<D>, v2: Vec<D>): Vec<D>
    
    min(v1: Vec<D>, v2: Vec<D>): Vec<D>

    neg(v: Vec<D>): Vec<D>

    swizzle<S extends Dim>(v: Vec<S>, ...components: SwizzleComponents<S, D>): Vec<D>

    dot(v1: Vec<D>, v2: Vec<D>): number

    lengthSquared(v: Vec<D>): number

    length(v: Vec<D>): number

    unit(v: Vec<D>): Vec<D>

    mix(w: number, v1: Vec<D>, v2: Vec<D>): Vec<D>

    weightedSum(w1: number, v1: Vec<D>, w2: number, v2: Vec<D>): Vec<D>

    angle(v1: Vec<D>, v2: Vec<D>): number

    prod(v: Vec<D>, m: Mat<D>): Vec<D>

}

abstract class VecMathBase<D extends Dim> implements VecMath<D> {

    of(...components: Vec<D>): Vec<D> {
        return components
    }
    
    abstract add(v1: Vec<D>, v2: Vec<D>): Vec<D>
    
    abstract sub(v1: Vec<D>, v2: Vec<D>): Vec<D>
    
    abstract mul(v1: Vec<D>, v2: Vec<D>): Vec<D>
    
    abstract div(v1: Vec<D>, v2: Vec<D>): Vec<D>
    
    abstract scale(v: Vec<D>, f: number): Vec<D>

    abstract max(v1: Vec<D>, v2: Vec<D>): Vec<D>
    
    abstract min(v1: Vec<D>, v2: Vec<D>): Vec<D>

    neg(v: Vec<D>): Vec<D> {
        return this.scale(v, -1)
    }
    
    swizzle<S extends Dim>(v: Vec<S>, ...components: SwizzleComponents<S, D>): Vec<D> {
        const result: Vec<D> = [...components]
        for (let i = 0; i < components.length; i++) {
            result[i] = v[components[i]] ?? failure<number>("");
        }
        return result
    }
    
    dot(v1: Vec<D>, v2: Vec<D>): number {
        let result = 0
        for (let i = 0; i < v1.length; i++) {
            result += v1[i] * v2[i]
        }
        return result
    }
    
    prod(v: Vec<D>, m: Mat<D>): Vec<D> {
        const result: Vec<D> = [...v]
        for (let i = 0; i < v.length; i++) {
            result[i] = this.dot(v, m[i])
        }
        return result
    }

    lengthSquared(v: Vec<D>): number {
        return this.dot(v, v)
    }
    
    length(v: Vec<D>): number {
        return Math.sqrt(this.lengthSquared(v))
    }
    
    unit(v: Vec<D>): Vec<D> {
        return this.scale(v, 1 / this.length(v))
    }
    
    mix(w: number, v1: Vec<D>, v2: Vec<D>): Vec<D> {
        return this.add(this.scale(v1, w), this.scale(v2, 1 - w))
    }
    
    weightedSum(w1: number, v1: Vec<D>, w2: number, v2: Vec<D>): Vec<D> {
        return this.scale(this.add(this.scale(v1, w1), this.scale(v2, w2)), 1 / (w1 + w2))
    }

    angle(v1: Vec<D>, v2: Vec<D>) {
        const l1 = this.lengthSquared(v1);
        const l2 = this.lengthSquared(v2);
        const dot = this.dot(v1, v2);
        const cos2 = (dot * dot) / (l1 * l2);
        const cos2x = 2 * cos2 - 1;
        const x = Math.acos(cos2x) / 2;
        return x;
    }

}

export class ImmutableVecMathBase<D extends Dim> extends VecMathBase<D> {

    constructor(private mut: VecMath<D> = new MutableVecMathBase<D>()) {
        super()
    }

    add(v1: Vec<D>, v2: Vec<D>): Vec<D> {
        return this.mut.add([...v1], v2)
    }
    
    sub(v1: Vec<D>, v2: Vec<D>): Vec<D> {
        return this.mut.sub([...v1], v2)
    }
    
    mul(v1: Vec<D>, v2: Vec<D>): Vec<D> {
        return this.mut.mul([...v1], v2)
    }
    
    div(v1: Vec<D>, v2: Vec<D>): Vec<D> {
        return this.mut.div([...v1], v2)
    }
    
    scale(v: Vec<D>, f: number): Vec<D> {
        return this.mut.scale([...v], f)
    }
    
    max(v1: Vec<D>, v2: Vec<D>): Vec<D> {
        return this.mut.max([...v1], v2)
    }
    
    min(v1: Vec<D>, v2: Vec<D>): Vec<D> {
        return this.mut.min([...v1], v2)
    }
    
}

export class ImmutableVec4Math extends ImmutableVecMathBase<4> {

    constructor() {
        super(new MutableVecMathBase<4>())
    }

    add(v1: Vec<4>, v2: Vec<4>): Vec<4> {
        return [
            v1[0] + v2[0],
            v1[1] + v2[1],
            v1[2] + v2[2],
            v1[3] + v2[3]
        ]
    }
    
    sub(v1: Vec<4>, v2: Vec<4>): Vec<4> {
        return [
            v1[0] - v2[0],
            v1[1] - v2[1],
            v1[2] - v2[2],
            v1[3] - v2[3]
        ]
    }
    
    mul(v1: Vec<4>, v2: Vec<4>): Vec<4> {
        return [
            v1[0] * v2[0],
            v1[1] * v2[1],
            v1[2] * v2[2],
            v1[3] * v2[3]
        ]
    }
    
    div(v1: Vec<4>, v2: Vec<4>): Vec<4> {
        return [
            v1[0] / v2[0],
            v1[1] / v2[1],
            v1[2] / v2[2],
            v1[3] / v2[3]
        ]
    }
    
    scale(v: Vec<4>, f: number): Vec<4> {
        return [
            v[0] * f,
            v[1] * f,
            v[2] * f,
            v[3] * f
        ]
    }
    
    neg(v: Vec<4>): Vec<4> {
        return [
            -v[0],
            -v[1],
            -v[2],
            -v[3]
        ]
    }
    
    swizzle<S extends Dim>(v: Vec<S>, ...components: SwizzleComponents<S, 4>): Vec<4> {
        return [
            v[components[0]] ?? failure(""),
            v[components[1]] ?? failure(""),
            v[components[2]] ?? failure(""),
            v[components[3]] ?? failure(""),
        ]
    }
    
    dot(v1: Vec<4>, v2: Vec<4>): number {
        return (
            v1[0] * v2[0] +
            v1[1] * v2[1] +
            v1[2] * v2[2] +
            v1[3] * v2[3]
        )
    }
    
    prod(v: Vec<4>, m: Mat<4>): Vec<4> {
        return [
            this.dot(v, m[0]),
            this.dot(v, m[1]),
            this.dot(v, m[2]),
            this.dot(v, m[3])
        ]
    }

}

export class ImmutableVec3Math extends ImmutableVecMathBase<3> {

    constructor() {
        super(new MutableVecMathBase<3>())
    }

    add(v1: Vec<3>, v2: Vec<3>): Vec<3> {
        return [
            v1[0] + v2[0],
            v1[1] + v2[1],
            v1[2] + v2[2]
        ]
    }
    
    sub(v1: Vec<3>, v2: Vec<3>): Vec<3> {
        return [
            v1[0] - v2[0],
            v1[1] - v2[1],
            v1[2] - v2[2]
        ]
    }
    
    mul(v1: Vec<3>, v2: Vec<3>): Vec<3> {
        return [
            v1[0] * v2[0],
            v1[1] * v2[1],
            v1[2] * v2[2]
        ]
    }
    
    div(v1: Vec<3>, v2: Vec<3>): Vec<3> {
        return [
            v1[0] / v2[0],
            v1[1] / v2[1],
            v1[2] / v2[2]
        ]
    }
    
    scale(v: Vec<3>, f: number): Vec<3> {
        return [
            v[0] * f,
            v[1] * f,
            v[2] * f
        ]
    }
    
    neg(v: Vec<3>): Vec<3> {
        return [
            -v[0],
            -v[1],
            -v[2]
        ]
    }
    
    swizzle<S extends Dim>(v: Vec<S>, ...components: SwizzleComponents<S, 3>): Vec<3> {
        return [
            v[components[0]] ?? failure(""),
            v[components[1]] ?? failure(""),
            v[components[2]] ?? failure("")
        ]
    }
    
    dot(v1: Vec<3>, v2: Vec<3>): number {
        return (
            v1[0] * v2[0] +
            v1[1] * v2[1] +
            v1[2] * v2[2]
        )
    }
    
    cross(v1: Vec<3>, v2: Vec<3>): Vec<3> {
        return [
            v1[1]*v2[2] - v1[2]*v2[1],
            v1[2]*v2[0] - v1[0]*v2[2],
            v1[0]*v2[1] - v1[1]*v2[0]
        ]
    }
    
    prod(v: Vec<3>, m: Mat<3>): Vec<3> {
        return [
            this.dot(v, m[0]),
            this.dot(v, m[1]),
            this.dot(v, m[2])
        ]
    }

    equal(v1: Vec<3>, v2: Vec<3>, precision: number = 0.001) {
        const cross = this.length(this.cross(v1, v2));
        const dot = this.dot(v1, v2);
        const tan = cross / dot;
        return tan < precision && tan > -precision;
    }

}

export class ImmutableVec2Math extends ImmutableVecMathBase<2> {

    constructor() {
        super(new MutableVecMathBase<2>())
    }

    add(v1: Vec<2>, v2: Vec<2>): Vec<2> {
        return [
            v1[0] + v2[0],
            v1[1] + v2[1]
        ]
    }
    
    sub(v1: Vec<2>, v2: Vec<2>): Vec<2> {
        return [
            v1[0] - v2[0],
            v1[1] - v2[1]
        ]
    }
    
    mul(v1: Vec<2>, v2: Vec<2>): Vec<2> {
        return [
            v1[0] * v2[0],
            v1[1] * v2[1]
        ]
    }
    
    div(v1: Vec<2>, v2: Vec<2>): Vec<2> {
        return [
            v1[0] / v2[0],
            v1[1] / v2[1]
        ]
    }
    
    scale(v: Vec<2>, f: number): Vec<2> {
        return [
            v[0] * f,
            v[1] * f
        ]
    }
    
    neg(v: Vec<2>): Vec<2> {
        return [
            -v[0],
            -v[1]
        ]
    }
    
    swizzle<S extends Dim>(v: Vec<S>, ...components: SwizzleComponents<S, 2>): Vec<2> {
        return [
            v[components[0]] ?? failure(""),
            v[components[1]] ?? failure("")
        ]
    }
    
    dot(v1: Vec<2>, v2: Vec<2>): number {
        return (
            v1[0] * v2[0] +
            v1[1] * v2[1]
        )
    }
    
    prod(v: Vec<2>, m: Mat<2>): Vec<2> {
        return [
            this.dot(v, m[0]),
            this.dot(v, m[1])
        ]
    }

    cross(v1: Vec<2>, v2: Vec<2>): number {
        return (
            v1[0] * v2[1] - 
            v1[1] * v2[0]
        )
    }
    
    equal(v1: Vec<2>, v2: Vec<2>, precision: number = 0.001) {
        const cross = this.cross(v1, v2);
        const dot = this.dot(v1, v2);
        const tan = cross / dot;
        return tan < precision && tan > -precision;
    }

}

export class MutableVecMathBase<D extends Dim> extends VecMathBase<D> {

    add(v1: Vec<D>, v2: Vec<D>): Vec<D> {
        for (let i = 0; i < v1.length; i++) {
            v1[i] = v1[i] + v2[i]
        }
        return v1
    }
    
    sub(v1: Vec<D>, v2: Vec<D>): Vec<D> {
        for (let i = 0; i < v1.length; i++) {
            v1[i] = v1[i] - v2[i]
        }
        return v1
    }
    
    mul(v1: Vec<D>, v2: Vec<D>): Vec<D> {
        for (let i = 0; i < v1.length; i++) {
            v1[i] = v1[i] * v2[i]
        }
        return v1
    }
    
    div(v1: Vec<D>, v2: Vec<D>): Vec<D> {
        for (let i = 0; i < v1.length; i++) {
            v1[i] = v1[i] / v2[i]
        }
        return v1
    }
    
    scale(v: Vec<D>, f: number): Vec<D> {
        for (let i = 0; i < v.length; i++) {
            v[i] = v[i] * f
        }
        return v
    }
    
    max(v1: Vec<D>, v2: Vec<D>): Vec<D> {
        for (let i = 0; i < v1.length; i++) {
            v1[i] = Math.max(v1[i], v2[i])
        }
        return v1
    }
    
    min(v1: Vec<D>, v2: Vec<D>): Vec<D> {
        for (let i = 0; i < v1.length; i++) {
            v1[i] = Math.min(v1[i], v2[i])
        }
        return v1
    }
    
}

export class MutableVec4Math extends ImmutableVec4Math {

    add(v1: Vec<4>, v2: Vec<4>): Vec<4> {
        v1[0] += v2[0]
        v1[1] += v2[1]
        v1[2] += v2[2]
        v1[3] += v2[3]
        return v1
    }
    
    sub(v1: Vec<4>, v2: Vec<4>): Vec<4> {
        v1[0] -= v2[0]
        v1[1] -= v2[1]
        v1[2] -= v2[2]
        v1[3] -= v2[3]
        return v1
    }
    
    mul(v1: Vec<4>, v2: Vec<4>): Vec<4> {
        v1[0] *= v2[0]
        v1[1] *= v2[1]
        v1[2] *= v2[2]
        v1[3] *= v2[3]
        return v1
    }
    
    div(v1: Vec<4>, v2: Vec<4>): Vec<4> {
        v1[0] /= v2[0]
        v1[1] /= v2[1]
        v1[2] /= v2[2]
        v1[3] /= v2[3]
        return v1
    }
    
    scale(v: Vec<4>, f: number): Vec<4> {
        v[0] *= f
        v[1] *= f
        v[2] *= f
        v[3] *= f
        return v
    }
    
    neg(v: Vec<4>): Vec<4> {
        v[0] = -v[0]
        v[1] = -v[1]
        v[2] = -v[2]
        v[3] = -v[3]
        return v
    }
    
}

export class MutableVec3Math extends ImmutableVec3Math {

    add(v1: Vec<3>, v2: Vec<3>): Vec<3> {
        v1[0] += v2[0]
        v1[1] += v2[1]
        v1[2] += v2[2]
        return v1
    }
    
    sub(v1: Vec<3>, v2: Vec<3>): Vec<3> {
        v1[0] -= v2[0]
        v1[1] -= v2[1]
        v1[2] -= v2[2]
        return v1
    }
    
    mul(v1: Vec<3>, v2: Vec<3>): Vec<3> {
        v1[0] *= v2[0]
        v1[1] *= v2[1]
        v1[2] *= v2[2]
        return v1
    }
    
    div(v1: Vec<3>, v2: Vec<3>): Vec<3> {
        v1[0] /= v2[0]
        v1[1] /= v2[1]
        v1[2] /= v2[2]
        return v1
    }
    
    scale(v: Vec<3>, f: number): Vec<3> {
        v[0] *= f
        v[1] *= f
        v[2] *= f
        return v
    }
    
    neg(v: Vec<3>): Vec<3> {
        v[0] = -v[0]
        v[1] = -v[1]
        v[2] = -v[2]
        return v
    }
    
}

export class MutableVec2Math extends ImmutableVec2Math {

    add(v1: Vec<2>, v2: Vec<2>): Vec<2> {
        v1[0] += v2[0]
        v1[1] += v2[1]
        return v1
    }
    
    sub(v1: Vec<2>, v2: Vec<2>): Vec<2> {
        v1[0] -= v2[0]
        v1[1] -= v2[1]
        return v1
    }
    
    mul(v1: Vec<2>, v2: Vec<2>): Vec<2> {
        v1[0] *= v2[0]
        v1[1] *= v2[1]
        return v1
    }
    
    div(v1: Vec<2>, v2: Vec<2>): Vec<2> {
        v1[0] /= v2[0]
        v1[1] /= v2[1]
        return v1
    }
    
    scale(v: Vec<2>, f: number): Vec<2> {
        v[0] *= f
        v[1] *= f
        return v
    }
    
    neg(v: Vec<2>): Vec<2> {
        v[0] = -v[0]
        v[1] = -v[1]
        return v
    }
    
}

export const vec2 = new ImmutableVec2Math() 
export const vec3 = new ImmutableVec3Math() 
export const vec4 = new ImmutableVec4Math() 

export const mutVec2 = new MutableVec2Math() 
export const mutVec3 = new MutableVec3Math() 
export const mutVec4 = new MutableVec4Math() 

export function deleteComponent<T, D extends Dim>(tuple: Tuple<T, D>, component: Component<D>): Tuple<T, LowerDim<D>> {
    const result = new Array<T>(tuple.length - 1)
    for (let i = 0, j = 0; i < component; i++, j++) {
        result[j] = tuple[i]
    }
    for (let i = component + 1, j = component; i < tuple.length; i++, j++) {
        result[j] = tuple[i]
    }
    return result as Tuple<T, LowerDim<D>>
}