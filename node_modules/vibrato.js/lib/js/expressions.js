import * as types from './datatypes.js';
import binaryen from 'binaryen';
let sequenceBlocks = 0;
let sequenceValues = 0;
let sequenceDelays = 0;
export function newBlockName() {
    return `_B_${sequenceBlocks++}`;
}
export function newValueName() {
    return `_V_${sequenceValues++}`;
}
export function newDelayName() {
    return `_D_${sequenceDelays++}`;
}
export class Value {
    constructor(type, parameterTypes) {
        this.type = type;
        this.calculated = false;
        this.cachedValue = null;
        this._parameterTypes = [...parameterTypes];
    }
    get parameterTypes() {
        return [...this._parameterTypes];
    }
    named(name = null, isTestValue = false) {
        return new NamedValue(this, name, isTestValue);
    }
    delay(length) {
        return Delay.create(length, this.type, () => this);
    }
    get() {
        if (!this.calculated) {
            this.cachedValue = this.calculate();
            this.calculated = true;
        }
        return this.cachedValue ? [...this.cachedValue] : this.cachedValue;
    }
    exports() {
        return {};
    }
    expression(module, variables, parameters) {
        return this.type.size > 1 ?
            this.vectorExpression(module, variables, parameters) :
            this.primitiveExpression(0, module, variables, parameters);
    }
    vectorExpression(module, variables, parameters) {
        return this.vectorAssignment(module, variables, parameters, this.allocateResultSpace(module));
    }
    vectorAssignment(module, variables, parameters, resultRef) {
        const [dataType, insType] = this.typeInfo(module);
        const resultRefVar = variables.declare(binaryen.i32);
        return this.block(module, [
            resultRefVar.set(resultRef),
            ...this.components(i => insType.store(i * this.type.componentType.sizeInBytes, 0, resultRefVar.get(), this.primitiveExpression(i, module, variables, parameters))),
            resultRefVar.get()
        ]);
    }
    memory(memoryAllocator) {
    }
    functions(module) {
        return [];
    }
    read(module) {
        return [];
    }
    write(module) {
        return [];
    }
    checkParameters(parameters) {
        if (parameters.length != this._parameterTypes.length) {
            throw new Error(`Expected ${this._parameterTypes.length} parameters, got ${parameters.length} instead!`);
        }
        for (let i = 0; i < parameters.length; i++) {
            const parameter = parameters[i];
            const parameterType = this._parameterTypes[i];
            const [expectedType, expectedTypeName] = parameterType.size > 1 || parameterType.componentType == types.integer ?
                [binaryen.i32, "integer/reference"] :
                [binaryen.f64, "real"];
            if (parameter.type != expectedType) {
                throw new Error(`Expected ${expectedTypeName} for parameter ${i}, but was not!`);
            }
        }
    }
    typeInfo(module) {
        return [
            this.type.componentType.binaryenType,
            this.type.componentType.instructionType(module)
        ];
    }
    allocateResultSpace(module) {
        const functionName = this.type.componentType == types.integer ? "allocate32" : "allocate64";
        return module.call(functionName, [module.i32.const(this.type.size)], binaryen.i32);
    }
    block(module, expressions) {
        const label = newBlockName();
        return expressions.length > 1 ?
            module.block(label, expressions, binaryen.getExpressionType(expressions[expressions.length - 1])) :
            expressions[0];
    }
    *components(mapper) {
        for (let i = 0; i < this.type.size; i++) {
            yield mapper(i);
        }
    }
}
export class NamedValue extends Value {
    constructor(wrapped, name, isTestValue = false) {
        super(wrapped.type, wrapped.parameterTypes);
        this.wrapped = wrapped;
        this.isTestValue = isTestValue;
        this.name = name ? name : newValueName();
        this.isPublic = name != null && !isTestValue;
        this.signature = this.parameterTypes.map(parameterType => parameterType.size > 1 || parameterType.componentType == types.integer ? binaryen.i32 : binaryen.f64);
    }
    subExpressions() {
        return [this.wrapped];
    }
    calculate() {
        return this.wrapped.get();
    }
    exports() {
        return this.isPublic ?
            this.publicExports() :
            this.isTestValue ?
                this.testExports() :
                {};
    }
    publicExports() {
        return {
            [this.name]: this.type.size > 1 ?
                this.vectorName() :
                this.primitiveName(0)
        };
    }
    testExports() {
        const result = this.publicExports();
        result[this.vectorName()] = this.vectorName();
        result[this.vectorAssignmentName()] = this.vectorAssignmentName();
        for (let i = 0; i < this.type.size; i++) {
            result[this.primitiveName(i)] = this.primitiveName(i);
        }
        return result;
    }
    evaluate(exports, parameters = []) {
        return exports[this.name](...parameters);
    }
    evaluateVector(exports, parameters = []) {
        return exports[this.vectorName()](...parameters);
    }
    evaluateComponent(exports, component, parameters = []) {
        return exports[this.primitiveName(component)](...parameters);
    }
    assignVector(exports, ref, parameters = []) {
        return exports[this.vectorAssignmentName()](ref, ...parameters);
    }
    vectorExpression(module, variables, parameters) {
        return module.call(this.vectorName(), parameters.map(parameter => parameter.get()), binaryen.i32);
    }
    vectorAssignment(module, variables, parameters, resultRef) {
        return module.call(this.vectorAssignmentName(), [resultRef, ...parameters.map(parameter => parameter.get())], binaryen.i32);
    }
    primitiveExpression(component, module, variables, parameters) {
        const [dataType, insType] = this.typeInfo(module);
        return module.call(this.primitiveName(component), parameters.map(parameter => parameter.get()), dataType);
    }
    functions(module) {
        const [dataType, insType] = this.typeInfo(module);
        return [
            addFunction(module, this.vectorName(), this.signature, binaryen.i32, (params, variables) => this.wrapped.vectorExpression(module, variables, params)),
            addFunction(module, this.vectorAssignmentName(), [binaryen.i32, ...this.signature], binaryen.i32, (params, variables) => this.wrapped.vectorAssignment(module, variables, params.slice(1), module.local.get(0, binaryen.i32))),
            ...this.components(i => addFunction(module, this.primitiveName(i), this.signature, dataType, (params, variables) => this.wrapped.primitiveExpression(i, module, variables, params)))
        ];
    }
    vectorName() {
        return `${this.name}_v`;
    }
    vectorAssignmentName() {
        return `${this.name}_r`;
    }
    primitiveName(component) {
        return `${this.name}_${component}`;
    }
}
export class Delay extends Value {
    constructor(name, length, type, value) {
        super(type, [types.discrete]);
        this.length = length;
        this.type = type;
        this.nextValueRef = -1;
        this.delayRef = -1;
        this.delayBufferRef = -1;
        this.name = name != null ? name : newDelayName();
        this.value = value(this);
        this.isPublic = name != null;
        if (!type.assignableFrom(this.value.type)) {
            throw new Error("Incompatible types!");
        }
        if (this.value.parameterTypes.length > 0) {
            throw new Error("Parametrized values are not allowed as delay input!");
        }
    }
    static create(length, type, value) {
        return new Delay(null, length, type, value);
    }
    static createNamed(name, length, type, value) {
        return new Delay(name, length, type, value);
    }
    readerName() {
        return `${this.name}_read`;
    }
    writerName() {
        return `${this.name}_write`;
    }
    get delayReference() {
        return this.delayRef;
    }
    get delayBufferReference() {
        return this.delayBufferRef;
    }
    memory(memoryAllocator) {
        const bufferSize = this.length * this.type.size;
        const headerType = types.vectorOf(6, types.integer);
        const bufferType = types.vectorOf(bufferSize, this.type.componentType);
        // Room for next value (scalar or reference). This also forces 64-bit alignment
        this.nextValueRef = memoryAllocator.declare(types.scalar, [0]);
        this.delayRef = this.nextValueRef + types.scalar.sizeInBytes;
        this.delayBufferRef = this.length > 1 ? this.delayRef + headerType.sizeInBytes : this.delayRef;
        if (this.length > 1) {
            // Adjacent room for delay header
            const delayRef = memoryAllocator.declare(headerType, [
                this.length,
                this.type.sizeInBytes, // Item size
                bufferType.sizeInBytes,
                this.delayBufferRef, // Buffer low bound (inclusive)
                this.delayBufferRef + bufferType.sizeInBytes, // Buffer high bound (exclusive)
                this.delayBufferRef // First item ref
            ]);
            if (delayRef != this.delayRef) {
                throw new Error('Delay header memory allocation did not go as expected!');
            }
        }
        // Adjacent room for delay buffer
        const buffer = new Array(bufferType.size);
        const delayBufferRef = memoryAllocator.declare(bufferType, buffer.fill(0));
        if (delayBufferRef != this.delayBufferRef) {
            throw new Error('Delay buffer memory allocation did not go as expected!');
        }
    }
    functions(module) {
        const insType = this.type.size > 1 || this.type.componentType == types.integer ? module.i32 : module.f64;
        const nextValue = insType.load(0, 0, module.i32.const(this.nextValueRef));
        const firstValueRef = this.length > 1 ?
            module.call("rotate", [module.i32.const(this.delayRef)], binaryen.i32) :
            module.i32.const(this.delayBufferRef);
        return [
            addFunction(module, this.readerName(), [], binaryen.none, (params, vars) => insType.store(0, 0, module.i32.const(this.nextValueRef), this.value.expression(module, vars, []))),
            addFunction(module, this.writerName(), [], binaryen.none, (params, vars) => this.type.size > 1 ?
                module.memory.copy(firstValueRef, nextValue, module.i32.const(this.type.sizeInBytes)) :
                insType.store(0, 0, firstValueRef, nextValue)),
        ];
    }
    read(module) {
        return [module.call(this.readerName(), [], binaryen.none)];
    }
    write(module) {
        return [module.call(this.writerName(), [], binaryen.none)];
    }
    exports() {
        return this.isPublic ?
            {
                [this.readerName()]: this.readerName(),
                [this.writerName()]: this.writerName(),
            } : {};
    }
    subExpressions() {
        return [this.value];
    }
    at(index) {
        return new Apply(this, [index]);
    }
    clear(memory) {
        this.type.flatView(memory.buffer, this.delayBufferRef, this.length * this.type.size).fill(0);
    }
    calculate() {
        return null;
    }
    vectorExpression(module, variables, parameters) {
        return this.length > 1 ?
            module.call("item_ref", [
                module.i32.const(this.delayReference),
                parameters[0].get()
            ], binaryen.i32) :
            module.i32.const(this.delayBufferReference);
    }
    vectorAssignment(module, variables, parameters, resultRef) {
        const ref = variables.declare(this.type.binaryenType);
        return this.type.size > 1 ?
            module.block(newBlockName(), [
                module.memory.copy(ref.tee(resultRef), this.vectorExpression(module, variables, parameters), module.i32.const(this.type.sizeInBytes)),
                ref.get()
            ], this.type.binaryenType) :
            super.vectorAssignment(module, variables, parameters, resultRef);
    }
    primitiveExpression(component, module, variables, parameters) {
        const [dataType, insType] = this.typeInfo(module);
        return insType.load(this.type.componentType.sizeInBytes * component, 0, this.vectorExpression(module, variables, parameters));
    }
}
export class Apply extends Value {
    constructor(value, parameters) {
        super(value.type, Apply.newParameterTypes(value.parameterTypes, parameters));
        this.value = value;
        this.parameters = Apply.newParameters(value.parameterTypes, parameters);
    }
    static newParameterTypes(parameterTypes, parameters) {
        const newParameters = this.newParameters(parameterTypes, parameters);
        const result = [];
        for (let parameter of newParameters) {
            result.push(...parameter.parameterTypes);
        }
        return result;
    }
    static newParameters(parameterTypes, parameters) {
        if (parameters.length != parameterTypes.length) {
            throw new Error(`Expected ${parameterTypes.length} parameters but found ${parameters.length}`);
        }
        const result = [];
        for (let i = 0; i < parameterTypes.length; i++) {
            const parameterType = parameterTypes[i];
            const parameter = parameters[i] ?? new Variable(parameterType);
            if (!parameterType.assignableFrom(parameter.type)) {
                throw new Error(`Type mismatch for parameter at index ${i}!`);
            }
            result.push(parameter);
        }
        return result;
    }
    subExpressions() {
        return [this.value, ...this.parameters
                .filter(parameter => parameter != null)
                .map(assertNotNull)
        ];
    }
    calculate() {
        return null;
    }
    vectorExpression(module, variables, parameters) {
        return this.doApply(module, variables, parameters, binaryen.i32, valueParameters => this.value.vectorExpression(module, variables, valueParameters));
    }
    vectorAssignment(module, variables, parameters, resultRef) {
        return this.doApply(module, variables, parameters, binaryen.i32, valueParameters => this.value.vectorAssignment(module, variables, valueParameters, resultRef));
    }
    primitiveExpression(component, module, variables, parameters) {
        return this.doApply(module, variables, parameters, this.value.type.componentType.binaryenType, valueParameters => this.value.primitiveExpression(component, module, variables, valueParameters));
    }
    doApply(module, variables, parameters, type, parametersApplier) {
        const remainingParams = [...parameters];
        const valueParameters = [];
        const assignments = [];
        for (let parameter of this.parameters) {
            const parameterParameters = remainingParams.splice(0, parameter.parameterTypes.length);
            const valueParameter = variables.declare(parameter.type.binaryenType);
            valueParameters.push(valueParameter);
            assignments.push(valueParameter.set(parameter.expression(module, variables, parameterParameters)));
        }
        return module.block(newBlockName(), [
            ...assignments,
            parametersApplier(valueParameters)
        ], type);
    }
}
export class Variable extends Value {
    constructor(type, spread = false) {
        super(type, Variable.parameterTypes(type, spread));
    }
    static parameterTypes(type, spread) {
        if (spread && type.size > 1) {
            const parameterTypes = new Array(type.size);
            const parameterType = type.componentType == types.real ? types.scalar : types.discrete;
            parameterTypes.fill(parameterType);
            return parameterTypes;
        }
        else {
            return [type];
        }
    }
    get isRef() {
        return this.type.size > 1 && this.parameterTypes.length == 1;
    }
    subExpressions() {
        return [];
    }
    calculate() {
        return null;
    }
    vectorExpression(module, variables, parameters) {
        return this.isRef ?
            parameters[0].get() :
            super.vectorExpression(module, variables, parameters);
    }
    vectorAssignment(module, variables, parameters, resultRef) {
        const ref = variables.declare(this.type.binaryenType);
        return this.isRef ?
            module.block(newBlockName(), [
                module.memory.copy(ref.tee(resultRef), parameters[0].get(), module.i32.const(this.type.sizeInBytes)),
                ref.get()
            ], this.type.binaryenType) :
            super.vectorAssignment(module, variables, parameters, resultRef);
    }
    primitiveExpression(component, module, variables, parameters) {
        const [dataType, insType] = this.typeInfo(module);
        return this.isRef ?
            insType.load(component * this.type.componentType.sizeInBytes, 0, parameters[0].get()) :
            parameters[component].get();
    }
    static discrete() {
        return new Variable(types.discrete);
    }
    static scalar() {
        return new Variable(types.scalar);
    }
    static complex() {
        return new Variable(types.complex, false);
    }
    static spreadComplex() {
        return new Variable(types.complex, true);
    }
    static vectorOf(size, type) {
        return new Variable(types.vectorOf(size, type), false);
    }
    static spreadVectorOf(size, type) {
        return new Variable(types.vectorOf(size, type), true);
    }
}
function assertNotNull(parameter) {
    if (parameter == null) {
        throw new Error("Could not be null here!");
    }
    return parameter;
}
export class FunctionLocals {
    constructor(module) {
        this.module = module;
        this._locals = [];
    }
    declare(type) {
        const local = new FunctionLocal(this.module, type, this._locals.length);
        this._locals.push(local);
        return local;
    }
    get locals() {
        return [...this._locals];
    }
    get localTypes() {
        return this._locals.map(local => local.type);
    }
}
export class FunctionLocal {
    constructor(module, type, index) {
        this.module = module;
        this.type = type;
        this.index = index;
    }
    get() {
        return this.module.local.get(this.index, this.type);
    }
    set(value) {
        return this.module.local.set(this.index, value);
    }
    tee(value) {
        return this.module.local.tee(this.index, value, this.type);
    }
}
export function addFunction(module, name, signature, returnType, bodyBuilder) {
    const locals = new FunctionLocals(module);
    const params = signature.map(type => locals.declare(type));
    const body = bodyBuilder(params, locals);
    return module.addFunction(name, binaryen.createType(signature), returnType, locals.localTypes.slice(params.length), body);
}
