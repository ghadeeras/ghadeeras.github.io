import * as types from '../datatypes.js';
import * as exps from '../expressions.js';
import binaryen from 'binaryen';
class Reduction extends exps.Value {
    constructor(name, accumulator, operands) {
        super(accumulator.type, Reduction.parameterTypes(accumulator, operands));
        this.name = name;
        this.accumulator = accumulator;
        this.operands = operands;
    }
    static parameterTypes(accumulator, operands) {
        const types = [...accumulator.parameterTypes];
        for (let operand of operands) {
            types.push(...operand.parameterTypes);
        }
        return types;
    }
    subExpressions() {
        return [this.accumulator, ...this.operands];
    }
    calculate() {
        return this.operands.reduce((acc, operand) => {
            if (acc == null) {
                return null;
            }
            const value = operand.get();
            return value != null ? this.preApply(value, acc) : null;
        }, this.accumulator.get());
    }
    vectorAssignment(module, variables, parameters, resultRef) {
        const resultRefVar = variables.declare(binaryen.i32);
        const remainingParams = [...parameters];
        return this.block(module, [
            resultRefVar.set(resultRef),
            this.operands.reduce((acc, operand) => {
                const operandParams = remainingParams.splice(0, operand.parameterTypes.length);
                return this.block(module, [
                    module.call("enter", [], binaryen.none),
                    module.call("return_i32", [this.applicationFunction(module, variables, operandParams, acc, operand, resultRefVar.get())], binaryen.i32)
                ]);
            }, this.accumulator.vectorAssignment(module, variables, remainingParams.splice(0, this.accumulator.parameterTypes.length), resultRefVar.get()))
        ]);
    }
    applicationFunction(module, variables, parameters, acc, operand, resultRef) {
        const operandValue = operand.type.size > 1 || operand.type.size == this.type.size ?
            operand.vectorExpression(module, variables, parameters) :
            operand.primitiveExpression(0, module, variables, parameters);
        const result = resultRef;
        switch (this.type.size) {
            case 2: return module.call(`f64_vec2_${this.name}_r`, [acc, operandValue, result], binaryen.i32);
            case 3: return module.call(`f64_vec3_${this.name}_r`, [acc, operandValue, result], binaryen.i32);
            case 4: return module.call(`f64_vec4_${this.name}_r`, [acc, operandValue, result], binaryen.i32);
            default: return module.call(`f64_vec_${this.name}_r`, [module.i32.const(this.type.size), acc, operandValue, result], binaryen.i32);
        }
    }
    primitiveExpression(component, module, variables, parameters) {
        const [dataType, insType] = this.typeInfo(module);
        const remainingParams = [...parameters];
        return this.operands.reduce((acc, operand) => {
            const operandParams = remainingParams.splice(0, operand.parameterTypes.length);
            const operandValue = operand.type.size > 1 ?
                operand.primitiveExpression(component, module, variables, operandParams) :
                operand.primitiveExpression(0, module, variables, operandParams);
            return this.applicationInstruction(module, insType)(acc, operandValue);
        }, this.accumulator.primitiveExpression(component, module, variables, remainingParams.splice(0, this.accumulator.parameterTypes.length)));
    }
}
class Operation extends Reduction {
    constructor(name, accumulator, operands) {
        super(name, accumulator, operands);
        for (let operand of operands) {
            assert(() => `Expected ${this.type.size} operand vector components; found ${operand.type.size}`, this.type.size == operand.type.size);
        }
    }
}
export class Add extends Operation {
    constructor(accumulator, operands) {
        super("add", accumulator, operands);
    }
    preApply(acc, value) {
        return acc.map((a, i) => a + value[i]);
    }
    applicationInstruction(module, instructionType) {
        return instructionType.add;
    }
    static of(firstOp, ...restOps) {
        return new Add(firstOp, restOps);
    }
}
export class Sub extends Operation {
    constructor(accumulator, operands) {
        super("sub", accumulator, operands);
    }
    preApply(acc, value) {
        return acc.map((a, i) => a - value[i]);
    }
    applicationInstruction(module, instructionType) {
        return instructionType.sub;
    }
    static of(firstOp, ...restOps) {
        return new Sub(firstOp, restOps);
    }
}
export class Mul extends Operation {
    constructor(accumulator, operands) {
        super("mul", accumulator, operands);
    }
    preApply(acc, value) {
        return acc.map((a, i) => a * value[i]);
    }
    applicationInstruction(module, instructionType) {
        return instructionType.mul;
    }
    static of(firstOp, ...restOps) {
        return new Mul(firstOp, restOps);
    }
}
export class Div extends Operation {
    constructor(accumulator, operands) {
        super("div", accumulator, operands);
    }
    preApply(acc, value) {
        return acc.map((a, i) => a / value[i]);
    }
    applicationInstruction(module, instructionType) {
        return module.f64.div;
    }
    static of(firstOp, ...restOps) {
        return new Div(firstOp, restOps);
    }
}
export class ScalarMul extends Reduction {
    constructor(accumulator, operands) {
        super("scalar_mul", accumulator, operands);
        for (let operand of operands) {
            assert(() => `Expected primitive real operand; found vector of size ${operand.type.size}`, 1 == operand.type.size);
        }
    }
    preApply(acc, value) {
        return acc.map(a => a * value[0]);
    }
    applicationInstruction(module, instructionType) {
        return instructionType.mul;
    }
    static of(firstOp, ...restOps) {
        return new ScalarMul(firstOp, restOps);
    }
}
export class ScalarDiv extends Reduction {
    constructor(accumulator, operands) {
        super("scalar_div", accumulator, operands);
        for (let operand of operands) {
            assert(() => `Expected primitive real operand; found vector of size ${operand.type.size}`, 1 == operand.type.size);
        }
    }
    preApply(acc, value) {
        return acc.map(a => a / value[0]);
    }
    applicationInstruction(module, instructionType) {
        return module.f64.div;
    }
    static of(firstOp, ...restOps) {
        return new ScalarDiv(firstOp, restOps);
    }
}
export class Dot extends exps.Value {
    constructor(left, right) {
        super(types.scalar, [...left.parameterTypes, ...right.parameterTypes]);
        this.left = left;
        this.right = right;
        assert(() => `Expected left and right operands to be the same size; found ${left.type.size} and ${right.type.size} instead.`, left.type.size == right.type.size);
    }
    subExpressions() {
        return [this.left, this.right];
    }
    calculate() {
        const v1 = this.left.calculate();
        const v2 = this.right.calculate();
        return v1 != null && v2 != null ?
            [v1.reduce((a, v1_i, i) => a + v1_i * v2[i], 0)] :
            null;
    }
    primitiveExpression(component, module, variables, parameters) {
        return this.block(module, [
            module.call("enter", [], binaryen.none),
            module.call("return_f64", [this.applicationFunction(module, variables, parameters)], binaryen.f64)
        ]);
    }
    applicationFunction(module, variables, parameters) {
        const leftValue = this.left.vectorExpression(module, variables, parameters.slice(0, this.left.parameterTypes.length));
        const rightValue = this.right.vectorExpression(module, variables, parameters.slice(this.left.parameterTypes.length));
        switch (this.left.type.size) {
            case 2: return module.call(`f64_vec2_dot`, [leftValue, rightValue], binaryen.f64);
            case 3: return module.call(`f64_vec3_dot`, [leftValue, rightValue], binaryen.f64);
            case 4: return module.call(`f64_vec4_dot`, [leftValue, rightValue], binaryen.f64);
            default: return module.call(`f64_vec_dot`, [module.i32.const(this.left.type.size), leftValue, rightValue], binaryen.f64);
        }
    }
    static of(left, right) {
        return new Dot(left, right);
    }
}
function assert(message, condition) {
    if (!condition) {
        throw new Error(message());
    }
}
