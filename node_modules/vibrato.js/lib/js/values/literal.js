import * as types from '../datatypes.js';
import * as exps from '../expressions.js';
export class Literal extends exps.Value {
    constructor(type, value) {
        super(type, []);
        this.pointer = null;
        assert(() => `Expected ${type.size} vector components; found ${value.length}`, type.size == value.length);
        this.value = [...value];
    }
    subExpressions() {
        return [];
    }
    calculate() {
        return this.value;
    }
    memory(memoryAllocator) {
        if (this.type.size > 1) {
            this.pointer = memoryAllocator.declare(this.type, this.value);
        }
    }
    vectorExpression(module, variables, parameters) {
        return this.pointer != null ?
            module.i32.const(this.pointer) :
            super.vectorExpression(module, variables, parameters);
    }
    primitiveExpression(component, module, variables, parameters) {
        const [dataType, insType] = this.typeInfo(module);
        return insType.const(this.value[component]);
    }
    static discrete(value) {
        return new Literal(types.discrete, [value]);
    }
    static scalar(value) {
        return new Literal(types.scalar, [value]);
    }
    static complex(real, imaginary) {
        return new Literal(types.complex, [real, imaginary]);
    }
    static vector(...components) {
        return new Literal(types.vectorOf(components.length, types.real), components);
    }
}
function assert(message, condition) {
    if (!condition) {
        throw new Error(message());
    }
}
