import * as wa from './wa.js';
import * as rt from './rt-node.js';
import binaryen from 'binaryen';
export class Assembler {
    constructor(expressions) {
        const allExpressions = flatten(expressions);
        const rawMemModule = this.newModule(false);
        const module = this.newModule(true);
        try {
            this.organizeMemory(rawMemModule, allExpressions);
            this.validate(rawMemModule);
            rawMemModule.optimize();
            this.rawMemTextCode = rawMemModule.emitText();
            this.rawMemBinaryCode = rawMemModule.emitBinary();
            this.declareCycleFunction(module, allExpressions);
            this.declareExpressionFunctions(module, allExpressions);
            this.validate(module);
            this.nonOptimizedTextCode = module.emitText();
            this.nonOptimizedBinaryCode = module.emitBinary();
            module.optimize();
            this.textCode = module.emitText();
            this.binaryCode = module.emitBinary();
            console.log(`Raw memory code: \n${this.rawMemTextCode}`);
            console.log(`Final code: \n${this.textCode}`);
        }
        catch (e) {
            console.log(e);
            console.log(`Bad code: \n${module.emitText()}`);
            throw e;
        }
        finally {
            rawMemModule.dispose();
            module.dispose();
        }
    }
    newModule(withRT) {
        const module = new binaryen.Module();
        module.setFeatures(module.getFeatures() | binaryen.Features.BulkMemory);
        if (withRT) {
            rt.addImportsToModule(module);
        }
        return module;
    }
    organizeMemory(module, expressions) {
        const memoryBuilder = new StaticMemoryBuilder(module);
        for (let value of expressions) {
            value.memory(memoryBuilder);
        }
        memoryBuilder.build();
    }
    declareCycleFunction(module, expressions) {
        const exps = [];
        exps.push(module.call("enter", [], binaryen.none));
        for (let value of expressions) {
            exps.push(...value.read(module));
        }
        for (let value of expressions) {
            exps.push(...value.write(module));
        }
        exps.push(module.call("leave", [], binaryen.none));
        module.addFunction("cycle", binaryen.createType([]), binaryen.none, [], module.block("cycle_block", exps, binaryen.none));
        module.addFunctionExport("cycle", "cycle");
    }
    declareExpressionFunctions(module, expressions) {
        for (let value of expressions) {
            value.functions(module);
            const exports = value.exports();
            for (let k in exports) {
                module.addFunctionExport(exports[k], k);
            }
        }
    }
    validate(module) {
        if (!module.validate()) {
            throw new Error("Web Assembly module validation failed!");
        }
    }
    get rawMem() {
        return this.rawMemBinaryCode.buffer;
    }
    exports(rt) {
        const linker = new wa.Linker({
            generated: new WebAssembly.Module(this.binaryCode.buffer)
        });
        return linker.link(rt.instances).generated.exports;
    }
}
class StaticMemoryBuilder {
    constructor(module) {
        this.module = module;
        this.offset = 0;
        this.segments = [];
        this.allocate(4, [0, 0, 0, 0]);
    }
    declare(vector, initialValue) {
        return this.allocate(vector.componentType.sizeInBytes, vector.buffer(initialValue));
    }
    build() {
        this.allocate(8, charCodesOf("STACK..."));
        const minPages = (this.offset + 0xFFFF) / 0x10000;
        new Uint32Array(this.segments[0].data.buffer)[0] = this.offset;
        this.module.setMemory(minPages, 65536, "mem", this.segments);
    }
    allocate(wordSize, array) {
        const alignment = (wordSize - this.offset % wordSize) % wordSize;
        const result = this.offset + alignment;
        const segment = {
            data: new Uint8Array(array),
            offset: this.module.i32.const(result),
            passive: false
        };
        this.segments.push(segment);
        this.offset = result + segment.data.length;
        return result;
    }
}
function charCodesOf(stackMarker) {
    const stackMarkerArray = [];
    for (let i = 0; i < stackMarker.length; i++) {
        stackMarkerArray.push(stackMarker.charCodeAt(i));
    }
    return stackMarkerArray;
}
function flatten(expressions) {
    function visit(expression, visited) {
        if (!visited.has(expression)) {
            visited.add(expression);
            for (let exp of expression.subExpressions()) {
                visit(exp, visited);
            }
        }
    }
    const result = new Set();
    for (let exp of expressions) {
        visit(exp, result);
    }
    return [...result];
}
