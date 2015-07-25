function GLApp() {

  // Context
  this.glc = new GLContext("canvas-gl", { preserveDrawingBuffer: true });
  this.gl = this.glc.gl;
  
  // Shaders
  this.vertexShader = this.glc.newShader("shader-vertex");
  this.fragmentShader = this.glc.newShader("shader-fragment");
  this.glProgram = this.glc.newProgram([this.vertexShader, this.fragmentShader]);
  this.glProgram.use();
  
  // Vertext Shader Attributes/Uniforms
  this.position = this.glProgram.getAttribute("vPosition", 2);
  this.color = this.glProgram.getUniform("vColor", 3);
  
  this.thicknessSpan = document.getElementById("thickness");
  this.redBox = document.getElementById("red");
  this.greenBox = document.getElementById("green");
  this.blueBox = document.getElementById("blue");
  
  this.thickness = 5;
  this.line = vec([vec([0, 0]), vec([0, 0])]);

  // Data Buffers
  this.vectors = this.glc.newBuffer(this.line.flatten());

  /* App Methods */
  
  this.draw = function() {
    this.position.bindTo(this.vectors, 0, 0);
    this.gl.drawArrays(this.gl.LINES, 0, 2);
  }
  
  this.setColor = function(r, g, b) {
    this.color.set([r, g, b]);
  }
  
  this.addPoint = function(x, y) {
    this.line.components[0] = this.line.components[1];
    this.line.components[1] = vec([x, y]);
    this.vectors.setBuffer(this.line.flatten());
  }
  
  this.incThickness = function() {
    if (this.thickness < 10) {
      this.thickness++;
      this.resetThickness();
    }
  }
  
  this.decThickness = function() {
    if (this.thickness > 1) {
      this.thickness--;
      this.resetThickness();
    }
  }
  
  this.resetThickness = function() {
      this.thicknessSpan.innerHTML = this.thickness;
      this.gl.lineWidth(this.thickness);
  }
  
  this.selectedColor = function() {
    return vec([
      this.redBox.checked ? 1.0 : 0.0,
      this.greenBox.checked ? 1.0 : 0.0,
      this.blueBox.checked ? 1.0 : 0.0,
    ]);
  }
  
  this.clear = function() {
    var c = this.selectedColor().flatten();
    this.gl.clearColor(c[0], c[1], c[2], 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  } 
  
  this.pick = function() {
    this.color.set(this.selectedColor().flatten());
  } 

  // First Frame
  this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
  this.resetThickness();
  this.setColor(0, 0, 0);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
}

var app = null;

function init() {
  app = new GLApp();
}

function mouseDown(e) {
  doMove(e, false);
  doMove(e, true);
  e.preventDefault();
}

function move(e) {
  if (e.buttons != 0) {
    doMove(e, true);
  }
  e.preventDefault();
}

function touchDown(e) {
  var t = e.changedTouches[0];
  doMove(t, false);
  doMove(t, true);
  e.preventDefault();
}

function touch(e) {
  if (e.changedTouches.length != 0) {
    var t = e.changedTouches[0];
    doMove(t, true);
  }
  e.preventDefault();
}

function doMove(e, redraw) {
  app.addPoint(
    2 * e.offsetX / e.target.width - 1, 
    1 - 2 * e.offsetY / e.target.height
  )
  if (redraw) {
    app.draw();
  }
}

function incThickness(e) {
  app.incThickness();
}

function decThickness(e) {
  app.decThickness();
}

function clearCanvas(e) {
  app.clear();
}

function pickBrush(e) {
  app.pick();
}

