import { Mat3 } from "./matrix.js";
import { Vec3, Vec4, NumberArray } from "./vector.js";
export type Quat = Vec4;
export declare class QuatMath {
    from(array: NumberArray, offset?: number): Quat;
    add(q1: Quat, q2: Quat): Quat;
    sub(q1: Quat, q2: Quat): Quat;
    mul(q1: Quat, q2: Quat): Quat;
    scale(q: Quat, s: number): Quat;
    neg(q: Quat): Quat;
    conj(q: Quat): Quat;
    unit(q: Quat): Quat;
    inverse(q: Quat): Quat;
    lengthSquared(q: Quat): number;
    length(q: Quat): number;
    rotation(angle: number, axis: Vec3, isNormalized?: boolean): Quat;
    transform(q: Quat, v: Vec3, isNormalized?: boolean): Vec3;
    toMatrix(q: Quat, isNormalized?: boolean): Mat3;
}
export declare const quat: QuatMath;
