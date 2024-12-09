import binaryen from "binaryen";
class GenericRawView {
    constructor(buffer, offset, getter, setter) {
        this.getter = getter;
        this.setter = setter;
        this.view = new DataView(buffer, offset);
    }
    get(byteOffset) {
        return this.getter(this.view, byteOffset);
    }
    set(byteOffset, value) {
        this.setter(this.view, byteOffset, value);
        return this;
    }
}
export class Integer {
    constructor() {
        this.name = "integer";
        this.sizeInBytes = 4;
        this.binaryenType = binaryen.i32;
    }
    instructionType(module) {
        return module.i32;
    }
    view(buffer, byteOffset = 0, length = 1) {
        return new Int32Array(buffer, byteOffset, length);
    }
    rawView(buffer, byteOffset = 0) {
        return new GenericRawView(buffer, byteOffset, (dv, bo) => dv.getInt32(bo), (dv, bo, v) => dv.setInt32(bo, v));
    }
}
Integer.type = new Integer();
export class Real {
    constructor() {
        this.name = "real";
        this.sizeInBytes = 8;
        this.binaryenType = binaryen.f64;
    }
    instructionType(module) {
        return module.f64;
    }
    view(buffer, byteOffset = 0, length = 1) {
        return new Float64Array(buffer, byteOffset, length);
    }
    rawView(buffer, byteOffset = 0) {
        return new GenericRawView(buffer, byteOffset, (dv, bo) => dv.getFloat64(bo), (dv, bo, v) => dv.setFloat64(bo, v));
    }
}
Real.type = new Real();
export const integer = Integer.type;
export const real = Real.type;
class GenericDataType {
    constructor(componentType, size) {
        this.componentType = componentType;
        this.size = size;
        this.sizeInBytes = componentType.sizeInBytes * size;
        this.binaryenType = size > 1 ? binaryen.i32 : componentType.binaryenType;
    }
    instructionType(module) {
        return this.size > 1 ? module.i32 : this.componentType.instructionType(module);
    }
    view(buffer, byteOffset = 0, length = 1) {
        const result = [];
        for (let o = byteOffset; length-- > 0; o += this.componentType.sizeInBytes) {
            result.push(this.componentType.view(buffer, o, this.size));
        }
        return result;
    }
    flatView(buffer, byteOffset = 0, length = 1) {
        return this.componentType.view(buffer, byteOffset, length * this.size);
    }
    buffer(array) {
        if (array.length % this.size != 0) {
            throw new Error(`Invalid array length! Expected multiples of ${this.size}; got ${array.length} instead!`);
        }
        const result = new ArrayBuffer(array.length * this.componentType.sizeInBytes);
        const view = this.flatView(result);
        for (let i = 0; i < array.length; i++) {
            view[i] = array[i];
        }
        return result;
    }
    assignableFrom(dataType) {
        return dataType instanceof this.constructor && dataType.size == this.size && dataType.componentType === this.componentType;
    }
}
class GenericVector extends GenericDataType {
    constructor(componentType, size) {
        super(componentType, size);
    }
    asVector() {
        return this;
    }
    asArray() {
        throw new Error("Expected an array, but found a vector instead.");
    }
}
class GenericArray extends GenericDataType {
    constructor(itemType, length) {
        super(itemType.componentType, itemType.size * length);
        this.itemType = itemType;
        this.length = length;
    }
    asVector() {
        throw new Error("Expected a vector, but found an array instead.");
    }
    asArray() {
        return this;
    }
}
export function vectorOf(size, primitiveType) {
    return new GenericVector(primitiveType, size);
}
export function arrayOf(length, itemType) {
    return new GenericArray(itemType, length);
}
export class Discrete extends GenericVector {
    asVector() {
        throw new Error("Method not implemented.");
    }
    asArray() {
        throw new Error("Method not implemented.");
    }
    constructor() {
        super(integer, 1);
    }
}
Discrete.type = new Discrete();
export class Scalar extends GenericVector {
    asVector() {
        throw new Error("Method not implemented.");
    }
    asArray() {
        throw new Error("Method not implemented.");
    }
    constructor() {
        super(real, 1);
    }
}
Scalar.type = new Scalar();
export class Complex extends GenericVector {
    asVector() {
        throw new Error("Method not implemented.");
    }
    asArray() {
        throw new Error("Method not implemented.");
    }
    constructor() {
        super(real, 2);
    }
}
Complex.type = new Complex();
export const discrete = Discrete.type;
export const scalar = Scalar.type;
export const complex = Complex.type;
