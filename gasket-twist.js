function GLApp() {

  // Context
  this.glc = new GLContext("canvas-gl");
  this.gl = this.glc.gl;
  
  // Shaders
  this.vertexShader = this.glc.newShader("shader-vertex");
  this.fragmentShader = this.glc.newShader("shader-fragment");
  this.glProgram = this.glc.newProgram([this.vertexShader, this.fragmentShader]);
  this.glProgram.use();
  
  // Vertext Shader Attributes/Uniforms
  this.position = this.glProgram.getAttribute("vPosition", 2);
  this.twist = this.glProgram.getUniform("twist", 1);
  this.scale = this.glProgram.getUniform("scale", 1);
  
  this.corners = document.getElementById("input-corners");
  this.centers = document.getElementById("input-centers");
  this.depthSpan = document.getElementById("division-depth");
  this.twistSpan = document.getElementById("twist");
  this.scaleSpan = document.getElementById("scale");
  
  function tesselateTriangle(a, b, c, counter, corners, centers) {
    if (counter == 0) {
      corners.push(a);
      corners.push(b);
      corners.push(c);
    } else {
      var ab = a.mix(b, 0.5);
      var bc = b.mix(c, 0.5);
      var ca = c.mix(a, 0.5);
      var newCounter = counter - 1;
      tesselateTriangle(a, ab, ca, newCounter, corners, centers);
      tesselateTriangle(ab, b, bc, newCounter, corners, centers);
      tesselateTriangle(ca, bc, c, newCounter, corners, centers);
      tesselateTriangle(ab, bc, ca, newCounter, centers, centers);
    }
    return {
      'corners' : corners,
      'centers' : centers
    };
  }
  
  function getVectors(depth) { 
    return tesselateTriangle(
      vec([-0.5, -0.3]),
      vec([0.0, 0.6]),
      vec([0.5, -0.3]),
      depth, [], []
    );
  }
  
  this.depth = 7;
  this.vectors = getVectors(this.depth);
  this.depthSpan.innerHTML = this.depth;

  // Data Buffers
  this.cornersBuffer = this.glc.newBuffer(vec(this.vectors.corners).flatten());
  this.centersBuffer = this.glc.newBuffer(vec(this.vectors.centers).flatten());
  
  /* App Methods */
  
  this.draw = function() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    
    if (this.corners.checked) {
      this.position.bindTo(this.cornersBuffer, 0, 0);
      this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vectors.corners.length);
    }
    
    if (this.centers.checked) {
      this.position.bindTo(this.centersBuffer, 0, 0);
      this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vectors.centers.length);
    }
    
    this.gl.flush();
  }
  
  this.setTwist = function(value) {
    this.twist.set([value]);
    this.twistSpan.innerHTML = Math.round(value * 1000) / 1000;
  }
  
  this.setScale = function(value) {
    this.scale.set([value]);
    this.scaleSpan.innerHTML = Math.round(value * 1000) / 1000;
  }
  
  this.incDivision = function() {
    if (this.depth < 9) {
      this.depth++;
      this.refrechVectors();
    }
  }
  
  this.decDivision = function() {
    if (this.depth > 0) {
      this.depth--;
      this.refrechVectors();
    }
  }
  
  this.refrechVectors = function() {
    this.vectors = getVectors(this.depth);
    this.depthSpan.innerHTML = this.depth;
    this.cornersBuffer.setBuffer(vec(this.vectors.corners).flatten());
    this.centersBuffer.setBuffer(vec(this.vectors.centers).flatten());
  }
  
  // First Frame
  this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
  this.setTwist(0);
  this.setScale(1);
  this.draw();
}

var PI = 3.1415926;
var app = null;

function init() {
  app = new GLApp();
}

function move(e) {
  if (e.buttons != 0) {
    doMove(e);
  }
}

function touch(e) {
  if (e.changedTouches.length != 0) {
    var t = e.changedTouches[0]
    doMove(t);
  }
}

function doMove(e) {
  if (document.getElementById("input-scale").checked) {
    app.setScale(4 * (e.target.height - e.clientY + e.target.offsetTop) / e.target.height - 2);
  }
  if (document.getElementById("input-twist").checked) {
    app.setTwist(4 * PI * (e.clientX - e.target.offsetLeft) / e.target.width - 2 * PI);
  }
  app.draw();
}

function redraw(e) {
  app.draw();
}

function incDivision(e) {
  app.incDivision();
  app.draw();
}

function decDivision(e) {
  app.decDivision();
  app.draw();
}

