function GLContext(canvasId, config) {

  this.canvas = getCanvas();
  this.config = config;
  this.gl = getContext(this.canvas, config);
  
  function getCanvas() {
    var canvas = document.getElementById(canvasId);
    if (!canvas) {
      throw Error("No canvas found with ID: " + canvasId)
    }
    return canvas;
  }
  
  function getContext(canvas, config) {
    var gl = null;
    try {
      gl = canvas.getContext("webgl", config) || canvas.getContext("experimental-webgl", config);
    } catch(e) {}
    if (!gl) {
      throw Error("Your browser seems not to support WebGL!");
    }
    return gl;
  }
  
  this.newShader = function(scriptId) {
    return new Shader(this, scriptId);
  }
  
  this.newProgram = function(shaders) {
    return new Program(this, shaders);
  }
  
  this.newBuffer = function(buffer) {
    return new VertexBuffer(this, buffer);
  }
  
  this.checkError = function() {
    var error = this.gl.getError(); 
    if (error != this.gl.NO_ERROR) {
      throw Error("GL Error: " + error);
    }
  }
  
}

function Shader(context, scriptId) {

  this.context = context;
  this.script = getScript();
  this.code = this.script.innerHTML;
  this.type = getShaderType(this.script.getAttribute("type"));
  this.handle = makeShader(context.gl, this.code, this.type);
  
  function getScript() {
    var script = document.getElementById(scriptId);
    if (!script) {
      throw Error("No script found with ID: " + scriptId)
    }
    return script;
  }
  
  function getShaderType(type) {
    if (type == "x-shader/x-vertex") {
      return context.gl.VERTEX_SHADER;
    } else if (type == "x-shader/x-fragment") {
      return context.gl.FRAGMENT_SHADER;
    } else {
      throw Error("Unknown shader type for script type: " + type);
    }
  }
  
  function makeShader(gl, code, type) {
    var s = gl.createShader(type);
    gl.shaderSource(s, code);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw Error("Error compiling shader '" + scriptId + "': " + gl.getShaderInfoLog(s));
    }
    return s;
  }
  
}

function Program(context, shaders) {

  this.context = context;
  this.shaders = shaders;
  this.handle = makeProgram(context.gl);
  
  function makeProgram(gl) {
    var p = gl.createProgram();
    for (s in shaders) {
      var shader = shaders[s].handle
      gl.attachShader(p, shader);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw Error("Unable to initialize the shader program: " + gl.getProgramInfoLog(p));
    }
    return p;
  }
  
  this.use = function() {
    context.gl.useProgram(this.handle);
  }
  
  this.getAttribute = function(name, size) {
    return new ProgramAttribute(this, name, size);
  }
  
  this.getUniform = function(name, size) {
    return new ProgramUniform(this, name, size);
  }
  
}

function ProgramAttribute(program, name, size) {

  this.program = program;
  this.attributeName = name;
  this.attributeSize = size;
  this.handle = makeAttribute(program.context.gl);
  
  function makeAttribute(gl) {
    var a = gl.getAttribLocation(program.handle, name);
    gl.enableVertexAttribArray(a);
    return a;
  }
  
  this.bindTo = function(buffer, offset, stride) {
    var gl = program.context.gl;
    buffer.bind();
    gl.vertexAttribPointer(this.handle, size, gl.FLOAT, false, stride * 4, offset * 4);
  }
  
}

function VertexBuffer(context, buffer) {

  this.context = context;
  this.bufferArray = new Float32Array(buffer);
  this.handle = context.gl.createBuffer();
  this.dirty = true;
  
  this.bind = function() {
    var gl = context.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.handle);
    if (this.dirty) {
      gl.bufferData(gl.ARRAY_BUFFER, this.bufferArray, gl.DYNAMIC_DRAW);  
      this.dirty = false;
    }
  }
  
  this.setBuffer = function(buffer) {
    this.bufferArray = new Float32Array(buffer);
    this.dirty = true;
  }
  
  this.set = function(index, value) {
    this.bufferArray[index] = value;
    this.dirty = true;
  }
  
  this.get = function(index) {
    return this.bufferArray[index];
  }
  
}

function ProgramUniform(program, name, size) {

  this.program = program;
  this.uniformName = name;
  this.uniformSize = size;
  this.handle = program.context.gl.getUniformLocation(program.handle, name);
  this.setter = getSetter(program.context.gl, this.handle, size);

  function getSetter(gl, handle, size) {
    switch (size) {
      case 1: return function(v) { gl.uniform1fv(handle, v); }; 
      case 2: return function(v) { gl.uniform2fv(handle, v); }; 
      case 3: return function(v) { gl.uniform3fv(handle, v); }; 
      case 4: return function(v) { gl.uniform4fv(handle, v); };
      default: throw Error("Uniform vectors of length '" + size + "' are not supported.");
    }
  }
  
  this.set = function(vector) {
    this.setter(vector);
  }
  
}

function Vec(v) {

  this.components = v;
  
  this.flatten = function(array) {
    if (!array) {
      array = [];
    }
    for (index in v) {
      var component = v[index];
      if (component.flatten) {
        component.flatten(array);
      } else {
        array.push(component);
      }
    }
    return array;
  }
  
  this.plus = function(vector) {
    var array = [];
    for (index in v) {
      array.push(v[index] + vector.components[index]);
    }
    return vec(array);
  }

  this.minus = function(vector) {
    var array = [];
    for (index in v) {
      array.push(v[index] - vector.components[index]);
    }
    return vec(array);
  }

  this.mix = function(vector, weight) {
    var array = [];
    for (index in v) {
      array.push((1 - weight) * v[index] + weight * vector.components[index]);
    }
    return vec(array);
  }

  this.dot = function(vector) {
    var s = 0;
    for (index in v) {
      s += v[index] * vector.components[index];
    }
    return s;
  }

}

function vec(v) {
  return new Vec(v);
}
