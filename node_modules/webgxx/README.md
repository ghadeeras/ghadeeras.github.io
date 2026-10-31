# webgxx
*Or WebG(PU / L2)*

![ci-build](https://github.com/ghadeeras/webgxx/workflows/ci-build/badge.svg)

This is an attempt to **partially** implement a **subset** of the WebGPU specification on top og WebGL2 😅

## ⚠️ Important ⚠️ 
* This package is not a drop-in replacement of WebGPU that can be used seamlessly as a fall-back option. You still need to address a few things as will be explained later.
* This package still covers very little of the WebGPU API, and it is unlikely to cover significant part of it.
* It is still in an early stage and likely has lots of bugs 🐞

## Rationale
While the **compatibility mode** of WebGPU is a much better option, there are still some browsers / user agents on some platforms that 
either do not support WebGPU at all, or their support for it is still hidden behind a feature-enablement flag. 
So, to avoid having to maintain two different sets of code (one for WebGPU, and one for WebGL) that have significantly different programming models,
I decided I would just implement as much as I could of the WebGPU specification. So, it works as an abstraction layer.

## Build Instructions
### Prerequisites:
* **GIT** and **Node.js** should be installed on your system

### Instructions:
* Clone the repo
```sh
$ cd /path/to/your/favorite/dev/workspace
$ git clone https://github.com/ghadeeras/webgxx.git
$ cd webgxx
```
* Install the package
```sh
$ npm install
```
* Compile the code
```sh
$ npx tsc  # compile the code into the lib directory
$ npm pack # to create a tgz package
```
## Usage
### Depending on WebGXX
* Add the following line to your NPM package.json file, under the "dependencies" section:
```json
  "dependencies": {
    // ...
    "webgxx": "git+https://github.com/ghadeeras/webgxx.git",
    // ...
  }
```
* Update your project's dependencies:
```sh
$ npm update
```
### Using WebGXX
* In your code obtain the browser WebGPU API, or fall back to the WebGL-based one implemented by this library:
```javascript
import { 
    userAgentWebGPU, // <-- The Browser WebGPU implementation 
    glWebGPU // <-- A function that returns a WebGL-based partial implementation
} from "webgxx"

const webGPU = userAgentWebGPU         // To first try the WebGPU implementation provided by the browser
// ...
const webGPU = glWebGPU(canvas)        // When falling back to WebGL becomes necessary

// In both cases:
const gpu = webGPU.gpu                 // instead of gpu = navigator.gpu
const context = webGPU.context(canvas) // instead of context = canvas.getContext("webgpu")
```
* The remaining is kind of the same with the exceptions explained in the following section.

## Incompatibility Areas
### Shading Language
When falling back to the WebGL-based implementation you need to use **GLSL** instead of **WGSL** as this library does not translate the latter to the former. To follow are a few differences:
#### Uniform Bindings
##### WGSL
```wgsl
struct Uniforms {
    model_matrix: mat4x4<f32>,
    view_matrix: mat4x4<f32>,
    projection_matrix: mat4x4<f32>,
};

@group(0)
@binding(0)
var<uniform> uniforms: Uniforms;
```
##### GLSL
```glsl
/*
 * The naming convention is: <identifier>_<group>_<binding>
 * So in this case: 
 *    identifier = uniforms
 *    group = 0, binding = 0
 */
uniform uniforms_0_0 {
    mat4 model_matrix;
    mat4 view_matrix;
    mat4 projection_matrix;
};
```
#### Texture/Sampler Bindings
##### WGSL
```wgsl
@group(2)
@binding(1)
var base_color_texture: texture_2d<f32>;

@group(2)
@binding(2)
var base_color_sampler: sampler;

```
##### GLSL
```glsl
/*
 * The naming convention is: <identifier>_<texture-group>_<texture-binding>_<sampler-group>_<sampler-binding>
 * So in this case: 
 *    base_color_texture = U
 *    texture-group = 2 
 *    texture-binding = 1
 *    sampler-group = 2
 *    sampler-binding = 2
 */
uniform sampler2D base_color_texture_2_1_2_2;
```
#### Vertex Shader Inputs
##### WGSL
```wgsl
@vertex
fn v_main(
    @location(0) position: vec3f, 
    @location(1) normal: vec3f,
    @location(2) texcoord: vec2f,
) -> Vertex {
  // ...
}
```
##### GLSL
```glsl
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec2 texcoord;

void main() {
  // ...
}
```
#### Vertex Shader Outputs
##### WGSL
```wgsl
struct Vertex {
    @builtin(position) builtinPos: vec4<f32>,
    @location(0) position: vec3<f32>, 
    @location(1) normal: vec3<f32>,
    @location(2) texcoord: vec2<f32>,
}

@vertex
fn v_main(/* ... */) -> Vertex {
  // ...
}
```
##### GLSL
```glsl
out vec3 position;
out vec3 normal;
out vec2 texcoord;

void main() {
  // ...
  gl_Position = builtinPos;
}
```

#### Fragment Shader Inputs
##### WGSL
```wgsl
struct Vertex {
    @builtin(position) builtinPos: vec4<f32>,
    @location(0) position: vec3<f32>, 
    @location(1) normal: vec3<f32>,
    @location(2) texcoord: vec2<f32>,
}

@fragment
fn f_main(vertex: Vertex) -> @location(0) vec4f {
  // ...
}
```
##### GLSL
```glsl
in vec3 position;
in vec3 normal;
in vec2 texcoord;

void main() {
  // ...
  builtinPos = gl_FragCoord;
}
```

#### Fragment Shader Outputs
##### WGSL
```wgsl
@fragment
fn f_main(vertex: Vertex) -> @location(0) vec4f {
  // ...
  return color;
}
```
##### GLSL
```glsl
layout(location = 0) out vec4 outputColor;

void main() {
  // ...
  outputColor = color;
}
```
### Notable UNSUPPORTED Features (among many others 😅)
* Compute shaders and pipelines
* Vertex and fragment shaders in one shader module / code
* Shader modules with multiple entry points
* Storage buffers
* Storage textures

## Contribution
You are welcome to contribute to this project either by raising issues or submitting pull requests.
### Conditions
* No AI please!
* Be kind and respectful.
* Issues should be well reasoned, thorough and elaborate.
* Pull requests should also be backed by an issue, or has a well reasoned, thorough and elaborate description.