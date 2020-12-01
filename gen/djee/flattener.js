function sum(v1, v2) {
    return v1 + v2;
}
class AbstractFlattener {
    constructor(size) {
        this.size = size;
    }
    offsetOf(child) {
        if (this == child) {
            return 0;
        }
        else {
            let offset = 0;
            const subFlatteners = this.subFlatteners();
            for (let i = 0; i < subFlatteners.length; i++) {
                const subFlattener = subFlatteners[i];
                const subOffset = subFlattener.offsetOf(child);
                if (subOffset >= 0) {
                    return offset + subOffset;
                }
                else {
                    offset += subFlattener.size;
                }
            }
            return -1;
        }
    }
    flatten(structure, array = new Array(this.size), index = 0) {
        this.doFlatten(structure, array, index);
        return array;
    }
    flattenAll(structures, array = new Array(this.size * structures.length), index = 0) {
        for (let i = 0; i < structures.length; i++) {
            this.flatten(structures[i], array, index);
            index += this.size;
        }
        return array;
    }
    unflatten(structure, array, index = 0) {
        this.doUnflatten(structure, array, index);
    }
}
class PrimitiveFlattener extends AbstractFlattener {
    constructor(getter, setter) {
        super(1);
        this.getter = getter;
        this.setter = setter;
    }
    subFlatteners() {
        return [];
    }
    doFlatten(structure, array, index) {
        array[index] = this.getter(structure);
    }
    doUnflatten(structure, array, index) {
        this.setter(structure, array[index]);
    }
}
class ArrayFlattener extends AbstractFlattener {
    constructor(size, getter) {
        super(size);
        this.getter = getter;
        this.getter = getter;
    }
    subFlatteners() {
        return [];
    }
    doFlatten(structure, array, index) {
        this.copy(structure, array, (sa, a, i) => a[index + i] = sa[i]);
    }
    doUnflatten(structure, array, index) {
        this.copy(structure, array, (sa, a, i) => sa[i] = a[index + i]);
    }
    copy(structure, array, copier) {
        const structureArray = this.getter(structure);
        for (let i = 0; i < this.size; i++) {
            copier(structureArray, array, i);
        }
    }
}
class ChildFlattener extends AbstractFlattener {
    constructor(flattener, getter) {
        super(flattener.size);
        this.flattener = flattener;
        this.getter = getter;
    }
    subFlatteners() {
        return [this.flattener];
    }
    doFlatten(structure, array, index) {
        this.copy(structure, array, index, (s, a, i) => this.flattener.flatten(s, a, i));
    }
    doUnflatten(structure, array, index) {
        this.copy(structure, array, index, (s, a, i) => this.flattener.unflatten(s, a, i));
    }
    copy(structure, array, index, copier) {
        copier(this.getter(structure), array, index);
    }
}
class CompositeFlattener extends AbstractFlattener {
    constructor(flatteners) {
        super(flatteners.map(f => f.size).reduce(sum));
        this.flatteners = flatteners;
    }
    subFlatteners() {
        return this.flatteners;
    }
    doFlatten(structure, array, index) {
        this.copy(structure, array, index, f => (s, a, i) => f.flatten(s, a, i));
    }
    doUnflatten(structure, array, index) {
        this.copy(structure, array, index, f => (s, a, i) => f.unflatten(s, a, i));
    }
    copy(structure, array, index, copier) {
        for (let i = 0; i < this.flatteners.length; i++) {
            const f = this.flatteners[i];
            copier(f)(structure, array, index);
            index += f.size;
        }
    }
}
export const flatteners = {
    composite: function (...flatteners) {
        return new CompositeFlattener(flatteners);
    },
    primitive: function (getter, setter) {
        return new PrimitiveFlattener(getter, setter);
    },
    array: function (getter, size) {
        return new ArrayFlattener(size, getter);
    },
    child: function (getter, flattener) {
        return new ChildFlattener(flattener, getter);
    }
};
//# sourceMappingURL=flattener.js.map