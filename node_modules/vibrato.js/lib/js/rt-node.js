import * as rt from "./rt.js";
import * as waNode from "./wa-node.js";
import binaryen from 'binaryen';
export * from "./rt.js";
export function addImportsToModule(module) {
    addMemImportsToModule(module);
    addSpaceImportsToModule(module);
    addDelayImportsToModule(module);
}
export function addMemImportsToModule(module) {
    module.addMemoryImport("stack", "mem", "stack");
    module.addFunctionImport("enter", "mem", "enter", binaryen.createType([]), binaryen.none);
    module.addFunctionImport("leave", "mem", "leave", binaryen.createType([]), binaryen.none);
    module.addFunctionImport("return_i32", "mem", "return_i32", binaryen.createType([binaryen.i32]), binaryen.i32);
    module.addFunctionImport("return_i64", "mem", "return_i64", binaryen.createType([binaryen.i64]), binaryen.i64);
    module.addFunctionImport("return_f32", "mem", "return_f32", binaryen.createType([binaryen.f32]), binaryen.f32);
    module.addFunctionImport("return_f64", "mem", "return_f64", binaryen.createType([binaryen.f64]), binaryen.f64);
    module.addFunctionImport("allocate8", "mem", "allocate8", binaryen.createType([binaryen.i32]), binaryen.i32);
    module.addFunctionImport("allocate16", "mem", "allocate16", binaryen.createType([binaryen.i32]), binaryen.i32);
    module.addFunctionImport("allocate32", "mem", "allocate32", binaryen.createType([binaryen.i32]), binaryen.i32);
    module.addFunctionImport("allocate64", "mem", "allocate64", binaryen.createType([binaryen.i32]), binaryen.i32);
    // module.addFunctionImport("clone8", "mem", "clone8", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32)
    // module.addFunctionImport("clone16", "mem", "clone16", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32)
    // module.addFunctionImport("clone32", "mem", "clone32", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32)
    // module.addFunctionImport("clone64", "mem", "clone64", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32)
}
export function addSpaceImportsToModule(module) {
    const vec1_vec2 = binaryen.createType([binaryen.i32, binaryen.i32]);
    const size_vec1_vec2 = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32]);
    const vec1_vec2_result = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32]);
    const size_vec1_vec2_result = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32, binaryen.i32]);
    const vec_scalar = binaryen.createType([binaryen.i32, binaryen.f64]);
    const size_vec_scalar = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.f64]);
    const vec_scalar_result = binaryen.createType([binaryen.i32, binaryen.f64, binaryen.i32]);
    const size_vec_scalar_result = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.f64, binaryen.i32]);
    const vec = binaryen.createType([binaryen.i32]);
    const size_vec = binaryen.createType([binaryen.i32, binaryen.i32]);
    const vec_result = binaryen.createType([binaryen.i32, binaryen.i32]);
    const size_vec_result = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32]);
    module.addFunctionImport("f64_vec2_add", "space", "f64_vec2_add", vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec2_add_r", "space", "f64_vec2_add_r", vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec3_add", "space", "f64_vec3_add", vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec3_add_r", "space", "f64_vec3_add_r", vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec4_add", "space", "f64_vec4_add", vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec4_add_r", "space", "f64_vec4_add_r", vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec_add", "space", "f64_vec_add", size_vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec_add_r", "space", "f64_vec_add_r", size_vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec2_sub", "space", "f64_vec2_sub", vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec2_sub_r", "space", "f64_vec2_sub_r", vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec3_sub", "space", "f64_vec3_sub", vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec3_sub_r", "space", "f64_vec3_sub_r", vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec4_sub", "space", "f64_vec4_sub", vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec4_sub_r", "space", "f64_vec4_sub_r", vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec_sub", "space", "f64_vec_sub", size_vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec_sub_r", "space", "f64_vec_sub_r", size_vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec2_mul", "space", "f64_vec2_mul", vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec2_mul_r", "space", "f64_vec2_mul_r", vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec3_mul", "space", "f64_vec3_mul", vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec3_mul_r", "space", "f64_vec3_mul_r", vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec4_mul", "space", "f64_vec4_mul", vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec4_mul_r", "space", "f64_vec4_mul_r", vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec_mul", "space", "f64_vec_mul", size_vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec_mul_r", "space", "f64_vec_mul_r", size_vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec2_div", "space", "f64_vec2_div", vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec2_div_r", "space", "f64_vec2_div_r", vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec3_div", "space", "f64_vec3_div", vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec3_div_r", "space", "f64_vec3_div_r", vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec4_div", "space", "f64_vec4_div", vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec4_div_r", "space", "f64_vec4_div_r", vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec_div", "space", "f64_vec_div", size_vec1_vec2, binaryen.i32);
    module.addFunctionImport("f64_vec_div_r", "space", "f64_vec_div_r", size_vec1_vec2_result, binaryen.i32);
    module.addFunctionImport("f64_vec2_scalar_mul", "space", "f64_vec2_scalar_mul", vec_scalar, binaryen.i32);
    module.addFunctionImport("f64_vec2_scalar_mul_r", "space", "f64_vec2_scalar_mul_r", vec_scalar_result, binaryen.i32);
    module.addFunctionImport("f64_vec3_scalar_mul", "space", "f64_vec3_scalar_mul", vec_scalar, binaryen.i32);
    module.addFunctionImport("f64_vec3_scalar_mul_r", "space", "f64_vec3_scalar_mul_r", vec_scalar_result, binaryen.i32);
    module.addFunctionImport("f64_vec4_scalar_mul", "space", "f64_vec4_scalar_mul", vec_scalar, binaryen.i32);
    module.addFunctionImport("f64_vec4_scalar_mul_r", "space", "f64_vec4_scalar_mul_r", vec_scalar_result, binaryen.i32);
    module.addFunctionImport("f64_vec_scalar_mul", "space", "f64_vec_scalar_mul", size_vec_scalar, binaryen.i32);
    module.addFunctionImport("f64_vec_scalar_mul_r", "space", "f64_vec_scalar_mul_r", size_vec_scalar_result, binaryen.i32);
    module.addFunctionImport("f64_vec2_scalar_div", "space", "f64_vec2_scalar_div", vec_scalar, binaryen.i32);
    module.addFunctionImport("f64_vec2_scalar_div_r", "space", "f64_vec2_scalar_div_r", vec_scalar_result, binaryen.i32);
    module.addFunctionImport("f64_vec3_scalar_div", "space", "f64_vec3_scalar_div", vec_scalar, binaryen.i32);
    module.addFunctionImport("f64_vec3_scalar_div_r", "space", "f64_vec3_scalar_div_r", vec_scalar_result, binaryen.i32);
    module.addFunctionImport("f64_vec4_scalar_div", "space", "f64_vec4_scalar_div", vec_scalar, binaryen.i32);
    module.addFunctionImport("f64_vec4_scalar_div_r", "space", "f64_vec4_scalar_div_r", vec_scalar_result, binaryen.i32);
    module.addFunctionImport("f64_vec_scalar_div", "space", "f64_vec_scalar_div", size_vec_scalar, binaryen.i32);
    module.addFunctionImport("f64_vec_scalar_div_r", "space", "f64_vec_scalar_div_r", size_vec_scalar_result, binaryen.i32);
    module.addFunctionImport("f64_vec2_dot", "space", "f64_vec2_dot", vec1_vec2, binaryen.f64);
    module.addFunctionImport("f64_vec3_dot", "space", "f64_vec3_dot", vec1_vec2, binaryen.f64);
    module.addFunctionImport("f64_vec4_dot", "space", "f64_vec4_dot", vec1_vec2, binaryen.f64);
    module.addFunctionImport("f64_vec_dot", "space", "f64_vec_dot", vec1_vec2_result, binaryen.f64);
    module.addFunctionImport("f64_vec2_length", "space", "f64_vec2_length", vec, binaryen.f64);
    module.addFunctionImport("f64_vec3_length", "space", "f64_vec3_length", vec, binaryen.f64);
    module.addFunctionImport("f64_vec4_length", "space", "f64_vec4_length", vec, binaryen.f64);
    module.addFunctionImport("f64_vec_length", "space", "f64_vec_length", size_vec, binaryen.f64);
    module.addFunctionImport("f64_vec2_normalize", "space", "f64_vec2_normalize", vec, binaryen.i32);
    module.addFunctionImport("f64_vec2_normalize_r", "space", "f64_vec2_normalize_r", vec_result, binaryen.i32);
    module.addFunctionImport("f64_vec3_normalize", "space", "f64_vec3_normalize", vec, binaryen.i32);
    module.addFunctionImport("f64_vec3_normalize_r", "space", "f64_vec3_normalize_r", vec_result, binaryen.i32);
    module.addFunctionImport("f64_vec4_normalize", "space", "f64_vec4_normalize", vec, binaryen.i32);
    module.addFunctionImport("f64_vec4_normalize_r", "space", "f64_vec4_normalize_r", vec_result, binaryen.i32);
    module.addFunctionImport("f64_vec_normalize", "space", "f64_vec_normalize", size_vec, binaryen.i32);
    module.addFunctionImport("f64_vec_normalize_r", "space", "f64_vec_normalize_r", size_vec_result, binaryen.i32);
}
export function addDelayImportsToModule(module) {
    module.addFunctionImport("create_delay", "delay", "create_delay", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32);
    module.addFunctionImport("item_ref", "delay", "item_ref", binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32);
    module.addFunctionImport("rotate", "delay", "rotate", binaryen.createType([binaryen.i32]), binaryen.i32);
}
export function runtime(modulesLoader = waNode.syncFsModulesLoader, rawMem = null) {
    const modules = modulesLoader(import.meta.dirname + "/../wa", rt.runtimeModulePaths());
    return rt.createRuntime(rawMem, modules);
}
