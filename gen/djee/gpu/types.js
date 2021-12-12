class BaseElement {
    constructor(alignment, size, offset, stride, packed) {
        this.alignment = packed ? 1 : alignment;
        this.size = size;
        this.paddedSize = Math.ceil(size / this.alignment) * this.alignment;
        this.offset = Math.ceil(offset / this.alignment) * this.alignment;
        this.packed = packed;
        this.stride = stride == 0 ? this.paddedSize : stride;
    }
    readMulti(view, index, count) {
        const values = new Array(count);
        for (let i = 0; i < count; i++) {
            values[i] = this.read(view, index + i);
        }
        return values;
    }
    writeMulti(view, index, values) {
        for (let i = 0; i < values.length; i++) {
            this.write(view, index + i, values[i]);
        }
    }
    times(length) {
        return new StaticArray(this, length, 0, 0, false);
    }
}
class Primitive32 extends BaseElement {
    constructor(offset, stride, packed, getter, setter) {
        super(4, 4, offset, stride, packed);
        this.getter = getter;
        this.setter = setter;
    }
    read(view, index) {
        return this.getter(view, this.offset + this.stride * index);
    }
    write(view, index, value) {
        this.setter(view, this.offset + this.stride * index, value);
    }
    get x2() {
        return new Vec2(this, 0, 0, false);
    }
    get x3() {
        return new Vec3(this, 0, 0, false);
    }
    get x4() {
        return new Vec4(this, 0, 0, false);
    }
}
export class U32 extends Primitive32 {
    constructor(offset, stride, packed) {
        super(offset, stride, packed, (view, offset) => view.getUint32(offset, true), (view, offset, value) => view.setUint32(offset, value, true));
    }
    clone(offset, stride, packed) {
        return new U32(offset, stride, packed);
    }
}
export class I32 extends Primitive32 {
    constructor(offset, stride, packed) {
        super(offset, stride, packed, (view, offset) => view.getInt32(offset, true), (view, offset, value) => view.setInt32(offset, value, true));
    }
    clone(offset, stride, packed) {
        return new I32(offset, stride, packed);
    }
}
export class F32 extends Primitive32 {
    constructor(offset, stride, packed) {
        super(offset, stride, packed, (view, offset) => view.getFloat32(offset, true), (view, offset, value) => view.setFloat32(offset, value, true));
    }
    clone(offset, stride, packed) {
        return new F32(offset, stride, packed);
    }
}
export class VecN extends BaseElement {
    constructor(alignment, size, offset, stride, packed) {
        super(alignment, size, offset, stride, packed);
    }
    get x2() {
        return new Mat2(this, 0, 0, false);
    }
    get x3() {
        return new Mat3(this, 0, 0, false);
    }
    get x4() {
        return new Mat4(this, 0, 0, false);
    }
}
export class Vec2 extends VecN {
    constructor(component, offset, stride, packed) {
        super(8, 8, offset, stride, packed);
        this.component = component;
        this.x = clone(component, this.offset, this.stride, packed);
        this.y = clone(component, this.x.offset + this.x.paddedSize, this.stride, packed);
    }
    read(view, index) {
        return [
            this.x.read(view, index),
            this.y.read(view, index),
        ];
    }
    write(view, index, value) {
        this.x.write(view, index, value[0]);
        this.y.write(view, index, value[1]);
    }
    clone(offset, stride, packed) {
        return new Vec2(this.component, offset, stride, packed);
    }
}
export class Vec3 extends VecN {
    constructor(component, offset, stride, packed) {
        super(16, 12, offset, stride, packed);
        this.component = component;
        this.x = clone(component, this.offset, this.stride, packed);
        this.y = clone(component, this.x.offset + this.x.paddedSize, this.stride, packed);
        this.z = clone(component, this.y.offset + this.y.paddedSize, this.stride, packed);
    }
    read(view, index) {
        return [
            this.x.read(view, index),
            this.y.read(view, index),
            this.z.read(view, index),
        ];
    }
    write(view, index, value) {
        this.x.write(view, index, value[0]);
        this.y.write(view, index, value[1]);
        this.z.write(view, index, value[2]);
    }
    clone(offset, stride, packed) {
        return new Vec3(this.component, offset, stride, packed);
    }
}
export class Vec4 extends VecN {
    constructor(component, offset, stride, packed) {
        super(16, 16, offset, stride, packed);
        this.component = component;
        this.x = clone(component, this.offset, this.stride, packed);
        this.y = clone(component, this.x.offset + this.x.paddedSize, this.stride, packed);
        this.z = clone(component, this.y.offset + this.y.paddedSize, this.stride, packed);
        this.w = clone(component, this.z.offset + this.z.paddedSize, this.stride, packed);
    }
    read(view, index) {
        return [
            this.x.read(view, index),
            this.y.read(view, index),
            this.z.read(view, index),
            this.w.read(view, index),
        ];
    }
    write(view, index, value) {
        this.x.write(view, index, value[0]);
        this.y.write(view, index, value[1]);
        this.z.write(view, index, value[2]);
        this.w.write(view, index, value[3]);
    }
    clone(offset, stride, packed) {
        return new Vec4(this.component, offset, stride, packed);
    }
}
export class Mat2 extends BaseElement {
    constructor(component, offset, stride, packed) {
        super(component.alignment, arraySize(component, 2, packed), offset, stride, packed);
        this.component = component;
        this.x = clone(component, this.offset, this.stride, packed);
        this.y = clone(component, this.x.offset + this.x.paddedSize, this.stride, packed);
    }
    read(view, index) {
        return [
            this.x.read(view, index),
            this.y.read(view, index),
        ];
    }
    write(view, index, value) {
        this.x.write(view, index, value[0]);
        this.y.write(view, index, value[1]);
    }
    clone(offset, stride, packed) {
        return new Mat2(this.component, offset, stride, packed);
    }
}
export class Mat3 extends BaseElement {
    constructor(component, offset, stride, packed) {
        super(component.alignment, arraySize(component, 3, packed), offset, stride, packed);
        this.component = component;
        this.x = clone(component, this.offset, this.stride, packed);
        this.y = clone(component, this.x.offset + this.x.paddedSize, this.stride, packed);
        this.z = clone(component, this.y.offset + this.y.paddedSize, this.stride, packed);
    }
    read(view, index) {
        return [
            this.x.read(view, index),
            this.y.read(view, index),
            this.z.read(view, index),
        ];
    }
    write(view, index, value) {
        this.x.write(view, index, value[0]);
        this.y.write(view, index, value[1]);
        this.z.write(view, index, value[2]);
    }
    clone(offset, stride, packed) {
        return new Mat3(this.component, offset, stride, packed);
    }
}
export class Mat4 extends BaseElement {
    constructor(component, offset, stride, packed) {
        super(component.alignment, arraySize(component, 4, packed), offset, stride, packed);
        this.component = component;
        this.x = clone(component, this.offset, this.stride, packed);
        this.y = clone(component, this.x.offset + this.x.paddedSize, this.stride, packed);
        this.z = clone(component, this.y.offset + this.y.paddedSize, this.stride, packed);
        this.w = clone(component, this.z.offset + this.z.paddedSize, this.stride, packed);
    }
    read(view, index) {
        return [
            this.x.read(view, index),
            this.y.read(view, index),
            this.z.read(view, index),
            this.w.read(view, index),
        ];
    }
    write(view, index, value) {
        this.x.write(view, index, value[0]);
        this.y.write(view, index, value[1]);
        this.z.write(view, index, value[2]);
        this.w.write(view, index, value[3]);
    }
    clone(offset, stride, packed) {
        return new Mat4(this.component, offset, stride, packed);
    }
}
export class StaticArray extends BaseElement {
    constructor(item, length, offset, stride, packed) {
        super(item.alignment, arraySize(item, length, packed), offset, stride, packed);
        this.item = item;
        this.items = cloneItems(item, length, this.offset, this.stride, packed);
    }
    read(view, index) {
        const result = new Array(this.items.length);
        for (let i = 0; i < this.items.length; i++) {
            result[i] = this.items[i].read(view, index);
        }
        return result;
    }
    write(view, index, value) {
        for (let i = 0; i < this.items.length; i++) {
            this.items[i].write(view, index, value[i]);
        }
    }
    clone(offset, stride, packed) {
        return new StaticArray(this.item, this.items.length, offset, stride, packed);
    }
}
export class Struct extends BaseElement {
    constructor(membersOrder, members, offset, stride, packed) {
        super(structAlignment(membersOrder, members), structSize(membersOrder, members, packed), offset, stride, packed);
        this.membersOrder = membersOrder;
        this.members = cloneStruct(membersOrder, members, this.offset, this.stride, packed);
    }
    write(view, index, value) {
        for (const key of this.membersOrder) {
            this.members[key].write(view, index, value[key]);
        }
    }
    read(view, index) {
        const result = {};
        for (const key of this.membersOrder) {
            result[key] = this.members[key].read(view, index);
        }
        return result;
    }
    clone(offset, stride, packed) {
        return new Struct(this.membersOrder, this.members, offset, stride, packed);
    }
}
function arraySize(item, length, packed) {
    return (packed ? item.size : item.paddedSize) * length;
}
function cloneItems(item, length, offset, stride, packed) {
    const items = [];
    let itemOffset = offset;
    for (let i = 0; i < length; i++) {
        const clonedItem = clone(item, itemOffset, stride, packed);
        items.push(clonedItem);
        itemOffset += clonedItem.paddedSize;
    }
    return items;
}
function structAlignment(membersOrder, struct) {
    let result = 4;
    for (const key of membersOrder) {
        if (struct[key].alignment > result) {
            result = struct[key].alignment;
        }
    }
    return result;
}
function structSize(membersOrder, struct, packed) {
    let result = 0;
    for (const key of membersOrder) {
        result = Math.ceil(result / struct[key].alignment) * struct[key].alignment;
        result += packed ? struct[key].size : struct[key].paddedSize;
    }
    return result;
}
function cloneStruct(membersOrder, struct, offset, stride, packed) {
    let result = {};
    for (const key of membersOrder) {
        const t = clone(struct[key], offset, stride, packed);
        result[key] = t;
        offset += t.paddedSize;
    }
    return result;
}
function clone(type, offset, stride, packed) {
    const result = type.clone(offset, stride, packed);
    if (type.constructor !== result.constructor) {
        throw new Error("Clone is not same class as original!");
    }
    return result;
}
export const u32 = new U32(0, 0, false);
export const i32 = new I32(0, 0, false);
export const f32 = new F32(0, 0, false);
export function vec2(component) {
    return new Vec2(component, 0, 0, false);
}
export function vec3(component) {
    return new Vec3(component, 0, 0, false);
}
export function vec4(component) {
    return new Vec4(component, 0, 0, false);
}
export const mat2x2 = vec2(f32).x2;
export const mat2x3 = vec3(f32).x2;
export const mat2x4 = vec4(f32).x2;
export const mat3x2 = vec2(f32).x3;
export const mat3x3 = vec3(f32).x3;
export const mat3x4 = vec4(f32).x3;
export const mat4x2 = vec2(f32).x4;
export const mat4x3 = vec3(f32).x4;
export const mat4x4 = vec4(f32).x4;
export function struct(members, membersOrder = Object.keys(members)) {
    return new Struct(membersOrder, members, 0, 0, false);
}
//# sourceMappingURL=types.js.map