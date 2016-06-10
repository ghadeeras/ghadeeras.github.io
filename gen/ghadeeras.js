var Space;
(function (Space) {
    var Vector = (function () {
        function Vector(coordinates) {
            this.coordinates = coordinates;
        }
        Vector.prototype.combine = function (v, op) {
            var max = Math.max(this.coordinates.length, v.coordinates.length);
            var result = new Array(max);
            for (var i = 0; i < max; i++) {
                var c = this.coordinates[i] || 0;
                var vc = v.coordinates[i] || 0;
                result[i] = op(c, vc);
            }
            return new Vector(result);
        };
        Vector.prototype.affect = function (f) {
            var length = this.coordinates.length;
            var result = new Array(length);
            for (var i = 0; i < length; i++) {
                result[i] = f(this.coordinates[i]);
            }
            return new Vector(result);
        };
        Vector.prototype.plus = function (v) {
            return this.combine(v, function (c, cv) { return c + cv; });
        };
        Vector.prototype.minus = function (v) {
            return this.combine(v, function (c, cv) { return c - cv; });
        };
        Vector.prototype.multiply = function (v) {
            return this.combine(v, function (c, cv) { return c * cv; });
        };
        Vector.prototype.divide = function (v) {
            return this.combine(v, function (c, cv) { return c / cv; });
        };
        Vector.prototype.scale = function (factor) {
            return this.affect(function (c) { return factor * c; });
        };
        Vector.prototype.dot = function (v) {
            return this.multiply(v).coordinates.reduce(function (a, b) { return a + b; }, 0);
        };
        Vector.prototype.mix = function (v, weight) {
            return this.scale(1 - weight).plus(v.scale(weight));
        };
        Object.defineProperty(Vector.prototype, "lengthSquared", {
            get: function () {
                return this.dot(this);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Vector.prototype, "length", {
            get: function () {
                return Math.sqrt(this.lengthSquared);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Vector.prototype, "unit", {
            get: function () {
                return this.scale(1 / this.length);
            },
            enumerable: true,
            configurable: true
        });
        Vector.prototype.angle = function (v) {
            var l2 = this.lengthSquared;
            var vl2 = v.lengthSquared;
            var dot = this.dot(v);
            var cos2 = (dot * dot) / (l2 * vl2);
            var cos2x = 2 * cos2 - 1;
            var x = Math.acos(cos2x) / 2;
            return x;
        };
        Vector.prototype.c = function (indexes) {
            var result = new Array(indexes.length);
            for (var i = 0; i < indexes.length; i++) {
                result[i] = this.coordinates[indexes[i]] || 0;
            }
            return new Vector(result);
        };
        Vector.prototype.cross = function (v) {
            var v1 = this.c([0, 1, 2]).coordinates;
            var v2 = v.c([0, 1, 2]).coordinates;
            var result = new Array(3);
            result[0] = v1[1] * v2[2] - v1[2] * v2[1];
            result[1] = v1[2] * v2[0] - v1[0] * v2[2];
            result[2] = v1[0] * v2[1] - v1[1] * v2[0];
            return new Vector(result);
        };
        Vector.prototype.sameAs = function (v, precision) {
            if (precision === void 0) { precision = 0.001; }
            var cross = this.cross(v).length;
            var dot = this.dot(v);
            var tan = cross / dot;
            return tan < precision && tan > -precision;
        };
        return Vector;
    })();
    Space.Vector = Vector;
})(Space || (Space = {}));
/// <reference path="vector.ts" />
var Space;
(function (Space) {
    function vec(coordinates) {
        return new Space.Vector(coordinates);
    }
    Space.vec = vec;
})(Space || (Space = {}));
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Djee;
(function (Djee) {
    function sum(v1, v2) {
        return v1 + v2;
    }
    var AbstractFlattener = (function () {
        function AbstractFlattener(size) {
            this._size = size;
        }
        Object.defineProperty(AbstractFlattener.prototype, "size", {
            get: function () {
                return this._size;
            },
            enumerable: true,
            configurable: true
        });
        AbstractFlattener.prototype.offsetOf = function (child) {
            if (this == child) {
                return 0;
            }
            else {
                var offset = 0;
                var subFlatteners = this.subFlatteners();
                for (var i = 0; i < subFlatteners.length; i++) {
                    var subFlattener = subFlatteners[i];
                    var subOffset = subFlattener.offsetOf(child);
                    if (subOffset >= 0) {
                        return offset + subOffset;
                    }
                    else {
                        offset += subFlattener.size;
                    }
                }
                return -1;
            }
        };
        AbstractFlattener.prototype.flatten = function (structure, array, index) {
            if (array === void 0) { array = new Array(this.size); }
            if (index === void 0) { index = 0; }
            this.doFlatten(structure, array, index);
            return array;
        };
        AbstractFlattener.prototype.unflatten = function (structure, array, index) {
            if (index === void 0) { index = 0; }
            this.doUnflatten(structure, array, index);
        };
        return AbstractFlattener;
    })();
    Djee.AbstractFlattener = AbstractFlattener;
    var PrimitiveFlattener = (function (_super) {
        __extends(PrimitiveFlattener, _super);
        function PrimitiveFlattener(getter, setter) {
            _super.call(this, 1);
            this._getter = getter;
            this._setter = setter;
        }
        PrimitiveFlattener.prototype.subFlatteners = function () {
            return [];
        };
        PrimitiveFlattener.prototype.doFlatten = function (structure, array, index) {
            array[index] = this._getter(structure);
        };
        PrimitiveFlattener.prototype.doUnflatten = function (structure, array, index) {
            this._setter(structure, array[index]);
        };
        return PrimitiveFlattener;
    })(AbstractFlattener);
    Djee.PrimitiveFlattener = PrimitiveFlattener;
    var ArrayFlattener = (function (_super) {
        __extends(ArrayFlattener, _super);
        function ArrayFlattener(size, getter) {
            _super.call(this, size);
            this._getter = getter;
        }
        ArrayFlattener.prototype.copy = function (structure, array, index, copier) {
            var structureArray = this._getter(structure);
            for (var i = 0; i < this.size; i++) {
                copier(structureArray, array, i);
            }
        };
        ArrayFlattener.prototype.subFlatteners = function () {
            return [];
        };
        ArrayFlattener.prototype.doFlatten = function (structure, array, index) {
            this.copy(structure, array, index, function (sa, a, i) { return a[index + i] = sa[i]; });
        };
        ArrayFlattener.prototype.doUnflatten = function (structure, array, index) {
            this.copy(structure, array, index, function (sa, a, i) { return sa[i] = a[index + i]; });
        };
        return ArrayFlattener;
    })(AbstractFlattener);
    Djee.ArrayFlattener = ArrayFlattener;
    var ChildFlattener = (function (_super) {
        __extends(ChildFlattener, _super);
        function ChildFlattener(flattener, getter) {
            _super.call(this, flattener.size);
            this._flattener = flattener;
            this._getter = getter;
        }
        ChildFlattener.prototype.copy = function (structure, array, index, copier) {
            copier(this._getter(structure), array, index);
        };
        ChildFlattener.prototype.subFlatteners = function () {
            return [this._flattener];
        };
        ChildFlattener.prototype.doFlatten = function (structure, array, index) {
            var _this = this;
            this.copy(structure, array, index, function (s, a, i) { return _this._flattener.flatten(s, a, i); });
        };
        ChildFlattener.prototype.doUnflatten = function (structure, array, index) {
            var _this = this;
            this.copy(structure, array, index, function (s, a, i) { return _this._flattener.unflatten(s, a, i); });
        };
        return ChildFlattener;
    })(AbstractFlattener);
    Djee.ChildFlattener = ChildFlattener;
    var CompositeFlattener = (function (_super) {
        __extends(CompositeFlattener, _super);
        function CompositeFlattener(flatteners) {
            _super.call(this, flatteners.map(function (f) { return f.size; }).reduce(sum));
            this._flatteners = flatteners;
        }
        CompositeFlattener.prototype.copy = function (structure, array, index, copier) {
            for (var i = 0; i < this._flatteners.length; i++) {
                var f = this._flatteners[i];
                copier(f)(structure, array, index);
                index += f.size;
            }
        };
        CompositeFlattener.prototype.subFlatteners = function () {
            return this._flatteners;
        };
        CompositeFlattener.prototype.doFlatten = function (structure, array, index) {
            this.copy(structure, array, index, function (f) { return function (s, a, i) { return f.flatten(s, a, i); }; });
        };
        CompositeFlattener.prototype.doUnflatten = function (structure, array, index) {
            this.copy(structure, array, index, function (f) { return function (s, a, i) { return f.unflatten(s, a, i); }; });
        };
        return CompositeFlattener;
    })(AbstractFlattener);
    Djee.CompositeFlattener = CompositeFlattener;
    var FlattenerBuilder = (function () {
        function FlattenerBuilder() {
            this._flatteners = [];
        }
        FlattenerBuilder.prototype.add = function (flattener) {
            this._flatteners.push(flattener);
            return flattener;
        };
        FlattenerBuilder.prototype.primitive = function (getter, setter) {
            return this.add(new PrimitiveFlattener(getter, setter));
        };
        FlattenerBuilder.prototype.array = function (getter, size) {
            return this.add(new ArrayFlattener(size, getter));
        };
        FlattenerBuilder.prototype.child = function (getter, flattener) {
            return this.add(new ChildFlattener(flattener.build(), getter));
        };
        FlattenerBuilder.prototype.build = function () {
            return new CompositeFlattener(this._flatteners);
        };
        return FlattenerBuilder;
    })();
    Djee.FlattenerBuilder = FlattenerBuilder;
    function flatten(flattener, structures, array, index) {
        if (array === void 0) { array = new Array(flattener.size * structures.length); }
        if (index === void 0) { index = 0; }
        for (var i = 0; i < structures.length; i++) {
            flattener.flatten(structures[i], array, index);
            index += flattener.size;
        }
        return array;
    }
    Djee.flatten = flatten;
})(Djee || (Djee = {}));
var Djee;
(function (Djee) {
    var Context = (function () {
        function Context(canvasId) {
            this._canvas = this.getCanvas(canvasId);
            this._gl = this.getContext(this._canvas);
        }
        Object.defineProperty(Context.prototype, "canvas", {
            get: function () {
                return this._canvas;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Context.prototype, "gl", {
            get: function () {
                return this._gl;
            },
            enumerable: true,
            configurable: true
        });
        Context.prototype.getCanvas = function (canvasId) {
            var canvas = document.getElementById(canvasId);
            if (!canvas) {
                throw "No canvas found with ID: " + canvasId;
            }
            return canvas;
        };
        Context.prototype.getContext = function (canvas) {
            var gl;
            try {
                gl =
                    canvas.getContext("experimental-webgl") ||
                        canvas.getContext("webgl");
            }
            catch (e) {
                console.error(e);
                gl = null;
            }
            if (!gl) {
                throw "Your browser seems not to support WebGL!";
            }
            return gl;
        };
        Context.prototype.with = function (glCode) {
            return glCode(this._gl);
        };
        Context.prototype.shaderFromElement = function (scriptId) {
            return Djee.Shader.fromElement(this, scriptId);
        };
        Context.prototype.shader = function (type, code) {
            return new Djee.Shader(this, type, code);
        };
        Context.prototype.linkFromElements = function (scriptIds) {
            var _this = this;
            var shaders = scriptIds.map(function (id) { return _this.shaderFromElement(id); });
            return new Djee.Program(this, shaders);
        };
        Context.prototype.link = function (shaders) {
            return new Djee.Program(this, shaders);
        };
        Context.prototype.newBuffer = function () {
            return new Djee.Buffer(this);
        };
        return Context;
    })();
    Djee.Context = Context;
})(Djee || (Djee = {}));
var Djee;
(function (Djee) {
    var Shader = (function () {
        function Shader(context, type, code) {
            this._context = context;
            this._type = type;
            this._code = code;
            this._shader = this.makeShader(context.gl, type, code);
        }
        Object.defineProperty(Shader.prototype, "context", {
            get: function () {
                return this._context;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Shader.prototype, "type", {
            get: function () {
                return this._type;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Shader.prototype, "code", {
            get: function () {
                return this._code;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Shader.prototype, "shader", {
            get: function () {
                return this._shader;
            },
            enumerable: true,
            configurable: true
        });
        Shader.prototype.delete = function () {
            this._context.gl.deleteShader(this._shader);
        };
        Shader.fromElement = function (context, scriptId) {
            var script = this.getScript(scriptId);
            var type = this.getShaderType(script.getAttribute(type));
            var code = script.innerHTML;
            return new Shader(context, type, code);
        };
        Shader.getScript = function (scriptId) {
            var script = document.getElementById(scriptId);
            if (!script) {
                throw "No script found with ID: " + scriptId;
            }
            return script;
        };
        Shader.getShaderType = function (type) {
            if (type == "x-shader/x-vertex") {
                return ShaderType.VertexShader;
            }
            else if (type == "x-shader/x-fragment") {
                return ShaderType.FragmentShader;
            }
            else {
                throw "Unknown shader type for script type: " + type;
            }
        };
        Shader.prototype.makeShader = function (gl, type, code) {
            var shader = gl.createShader(type);
            gl.shaderSource(shader, code);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw "Error compiling shader: " + gl.getShaderInfoLog(shader);
            }
            return shader;
        };
        return Shader;
    })();
    Djee.Shader = Shader;
    (function (ShaderType) {
        ShaderType[ShaderType["VertexShader"] = WebGLRenderingContext.VERTEX_SHADER] = "VertexShader";
        ShaderType[ShaderType["FragmentShader"] = WebGLRenderingContext.FRAGMENT_SHADER] = "FragmentShader";
    })(Djee.ShaderType || (Djee.ShaderType = {}));
    var ShaderType = Djee.ShaderType;
})(Djee || (Djee = {}));
var Djee;
(function (Djee) {
    var Program = (function () {
        function Program(context, shaders) {
            this._context = context;
            this._shaders = shaders;
            this._program = this.makeProgram(context.gl, shaders);
        }
        Object.defineProperty(Program.prototype, "context", {
            get: function () {
                return this._context;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Program.prototype, "shaders", {
            get: function () {
                return this._shaders;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Program.prototype, "program", {
            get: function () {
                return this._program;
            },
            enumerable: true,
            configurable: true
        });
        Program.prototype.makeProgram = function (gl, shaders) {
            var program = gl.createProgram();
            shaders.forEach(function (s) {
                gl.attachShader(program, s.shader);
            });
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw "Unable to initialize the shader program: " + gl.getProgramInfoLog(program);
            }
            return program;
        };
        Program.prototype.delete = function () {
            var _this = this;
            var gl = this._context.gl;
            this._shaders.forEach(function (shader) { return gl.detachShader(_this._program, shader.shader); });
            gl.deleteProgram(this._program);
        };
        Program.prototype.use = function () {
            this._context.gl.useProgram(this._program);
        };
        Program.prototype.locateAttribute = function (name, size) {
            return new Djee.Attribute(this, name, size);
        };
        Program.prototype.locateUniform = function (name, size) {
            return new Djee.Uniform(this, name, size);
        };
        return Program;
    })();
    Djee.Program = Program;
})(Djee || (Djee = {}));
var Djee;
(function (Djee) {
    var Attribute = (function () {
        function Attribute(program, name, size) {
            this._program = program;
            this._name = name;
            this._size = size;
            this._location = program.context.gl.getAttribLocation(program.program, name);
        }
        Object.defineProperty(Attribute.prototype, "program", {
            get: function () {
                return this._program;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Attribute.prototype, "name", {
            get: function () {
                return this._name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Attribute.prototype, "size", {
            get: function () {
                return this._size;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Attribute.prototype, "location", {
            get: function () {
                return this._location;
            },
            enumerable: true,
            configurable: true
        });
        Attribute.prototype.pointTo = function (buffer, stride, offset) {
            var _this = this;
            if (stride === void 0) { stride = this._size; }
            if (offset === void 0) { offset = 0; }
            buffer.bind(function (gl) {
                gl.vertexAttribPointer(_this._location, _this._size, gl.FLOAT, false, stride * 4, offset * 4);
                gl.enableVertexAttribArray(_this._location);
            });
        };
        return Attribute;
    })();
    Djee.Attribute = Attribute;
})(Djee || (Djee = {}));
var Djee;
(function (Djee) {
    var Uniform = (function () {
        function Uniform(program, name, size) {
            var _this = this;
            this._program = program;
            this._name = name;
            this._size = size;
            this._data = new Array(size);
            program.context.with(function (gl) {
                _this._location = gl.getUniformLocation(program.program, name);
                _this._setter = _this.getSetter(gl, size);
            });
        }
        Object.defineProperty(Uniform.prototype, "program", {
            get: function () {
                return this._program;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Uniform.prototype, "name", {
            get: function () {
                return this._name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Uniform.prototype, "size", {
            get: function () {
                return this._size;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Uniform.prototype, "location", {
            get: function () {
                return this._location;
            },
            enumerable: true,
            configurable: true
        });
        Uniform.prototype.getSetter = function (gl, size) {
            var l = this.location;
            switch (size) {
                case 1: return function (d) { return gl.uniform1fv(l, d); };
                case 2: return function (d) { return gl.uniform2fv(l, d); };
                case 3: return function (d) { return gl.uniform3fv(l, d); };
                case 4: return function (d) { return gl.uniform4fv(l, d); };
                default: throw "Uniform vectors of length '" + size + "' are not supported.";
            }
        };
        Object.defineProperty(Uniform.prototype, "data", {
            get: function () {
                return Djee.copyOf(this._data.slice());
            },
            set: function (data) {
                if (data.length < this._size) {
                    throw "Arrays of length '" + data.length + "' cannot be assigned to uniform vector '" + this._name + "' which has size '" + this._size + "'";
                }
                this._setter(new Float32Array(data));
                this._data = Djee.copyOf(data);
            },
            enumerable: true,
            configurable: true
        });
        return Uniform;
    })();
    Djee.Uniform = Uniform;
})(Djee || (Djee = {}));
var Djee;
(function (Djee) {
    var Buffer = (function () {
        function Buffer(context) {
            this._context = context;
            this._buffer = context.gl.createBuffer();
            this._data = [];
        }
        Object.defineProperty(Buffer.prototype, "context", {
            get: function () {
                return this._context;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Buffer.prototype, "buffer", {
            get: function () {
                return this._buffer;
            },
            enumerable: true,
            configurable: true
        });
        Buffer.prototype.bind = function (glCode) {
            var _this = this;
            return this._context.with(function (gl) {
                gl.bindBuffer(gl.ARRAY_BUFFER, _this._buffer);
                return glCode(gl);
            });
        };
        Object.defineProperty(Buffer.prototype, "data", {
            get: function () {
                return Djee.copyOf(this._data.slice());
            },
            set: function (data) {
                var array = new Float32Array(data);
                this.bind(function (gl) {
                    return gl.bufferData(gl.ARRAY_BUFFER, array, gl.DYNAMIC_DRAW);
                });
                this._data = Djee.copyOf(data);
            },
            enumerable: true,
            configurable: true
        });
        return Buffer;
    })();
    Djee.Buffer = Buffer;
})(Djee || (Djee = {}));
/// <reference path="flattener.ts" />
/// <reference path="context.ts" />
/// <reference path="shader.ts" />
/// <reference path="program.ts" />
/// <reference path="attribute.ts" />
/// <reference path="uniform.ts" />
/// <reference path="buffer.ts" />
var Djee;
(function (Djee) {
    function copyOf(array) {
        return array.slice(0, array.length);
    }
    Djee.copyOf = copyOf;
})(Djee || (Djee = {}));
var Gear;
(function (Gear) {
    var Call = (function () {
        function Call(callable) {
            this._timer = null;
            this._callable = callable;
        }
        Call.prototype.now = function () {
            this.cancel();
            this._callable();
        };
        Call.prototype.later = function () {
            var _this = this;
            if (!this._timer) {
                this._timer = setTimeout(function () {
                    _this._timer = null;
                    _this._callable();
                }, 0);
            }
        };
        Call.prototype.cancel = function () {
            if (this._timer) {
                clearTimeout(this._timer);
                this._timer = null;
            }
        };
        return Call;
    })();
    Gear.Call = Call;
})(Gear || (Gear = {}));
var Gear;
(function (Gear) {
    var Pluggable = (function () {
        function Pluggable() {
            this._pluggedComponents = [];
        }
        Object.defineProperty(Pluggable.prototype, "itself", {
            get: function () {
                return this.self();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Pluggable.prototype, "pluggedComponents", {
            get: function () {
                return this._pluggedComponents.map(function (c) { return c.itself; });
            },
            enumerable: true,
            configurable: true
        });
        Pluggable.prototype.plug = function (component) {
            this.doPlug(component);
            component.doPlug(this);
        };
        Pluggable.prototype.unplug = function (component) {
            this.doUnplug(component);
            component.doUnplug(this);
        };
        Pluggable.prototype.unplugAll = function () {
            var _this = this;
            this._pluggedComponents.forEach(function (c) { return _this.unplug(c); });
        };
        Pluggable.prototype.doPlug = function (component) {
            this.prePlug();
            this._pluggedComponents.push(component);
        };
        Pluggable.prototype.doUnplug = function (component) {
            this._pluggedComponents.splice(this._pluggedComponents.indexOf(component), 1);
        };
        Pluggable.prototype.prePlug = function () {
        };
        return Pluggable;
    })();
    Gear.Pluggable = Pluggable;
    var ExclusivelyPluggable = (function (_super) {
        __extends(ExclusivelyPluggable, _super);
        function ExclusivelyPluggable() {
            _super.apply(this, arguments);
        }
        Object.defineProperty(ExclusivelyPluggable.prototype, "pluggedComponent", {
            get: function () {
                return this.pluggedComponents.length > 0 ? this.pluggedComponents[0] : null;
            },
            enumerable: true,
            configurable: true
        });
        ExclusivelyPluggable.prototype.prePlug = function () {
            this.unplugAll();
        };
        return ExclusivelyPluggable;
    })(Pluggable);
    Gear.ExclusivelyPluggable = ExclusivelyPluggable;
})(Gear || (Gear = {}));
var Gear;
(function (Gear) {
    var Actuator = (function (_super) {
        __extends(Actuator, _super);
        function Actuator() {
            _super.apply(this, arguments);
        }
        Actuator.prototype.self = function () {
            return this;
        };
        Object.defineProperty(Actuator.prototype, "controllable", {
            get: function () {
                return this.pluggedComponent;
            },
            enumerable: true,
            configurable: true
        });
        Actuator.prototype.drives = function (controllable) {
            this.plug(controllable.asControllable);
        };
        Actuator.prototype.drivesNone = function () {
            this.unplugAll();
        };
        Actuator.prototype.perform = function (action) {
            this.controllable.reactTo(action);
        };
        return Actuator;
    })(Gear.ExclusivelyPluggable);
    Gear.Actuator = Actuator;
})(Gear || (Gear = {}));
var Gear;
(function (Gear) {
    var Sensor = (function (_super) {
        __extends(Sensor, _super);
        function Sensor(consumer) {
            var _this = this;
            _super.call(this);
            this._consumer = consumer;
            this._sensing = new Gear.Call(function () { return _this.sense(_this.measurable.sample); });
        }
        Sensor.prototype.self = function () {
            return this;
        };
        Object.defineProperty(Sensor.prototype, "measurable", {
            get: function () {
                return this.pluggedComponent;
            },
            enumerable: true,
            configurable: true
        });
        Sensor.prototype.probes = function (measurable) {
            this.plug(measurable.asMeasurable);
            this._sensing.later();
        };
        Sensor.prototype.probesNone = function () {
            this.unplugAll();
        };
        Sensor.prototype.sense = function (value) {
            this._consumer(value);
        };
        Object.defineProperty(Sensor.prototype, "reading", {
            get: function () {
                return this.measurable.sample;
            },
            enumerable: true,
            configurable: true
        });
        return Sensor;
    })(Gear.ExclusivelyPluggable);
    Gear.Sensor = Sensor;
})(Gear || (Gear = {}));
var Gear;
(function (Gear) {
    var Controllable = (function (_super) {
        __extends(Controllable, _super);
        function Controllable(consumer) {
            _super.call(this);
            this._consumer = consumer;
        }
        Controllable.prototype.self = function () {
            return this;
        };
        Object.defineProperty(Controllable.prototype, "asControllable", {
            get: function () {
                return this;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Controllable.prototype, "actuator", {
            get: function () {
                return this.pluggedComponent;
            },
            enumerable: true,
            configurable: true
        });
        Controllable.prototype.reactTo = function (action) {
            this._consumer(action);
        };
        return Controllable;
    })(Gear.ExclusivelyPluggable);
    Gear.Controllable = Controllable;
})(Gear || (Gear = {}));
var Gear;
(function (Gear) {
    var Measurable = (function (_super) {
        __extends(Measurable, _super);
        function Measurable(value) {
            _super.call(this);
            this._value = value;
        }
        Measurable.prototype.self = function () {
            return this;
        };
        Object.defineProperty(Measurable.prototype, "asMeasurable", {
            get: function () {
                return this;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Measurable.prototype, "sensors", {
            get: function () {
                return this.pluggedComponents;
            },
            enumerable: true,
            configurable: true
        });
        Measurable.prototype.conduct = function (value) {
            this._value = value;
            this.sensors.forEach(function (s) { return s.sense(value); });
        };
        Object.defineProperty(Measurable.prototype, "sample", {
            get: function () {
                return this._value;
            },
            enumerable: true,
            configurable: true
        });
        return Measurable;
    })(Gear.Pluggable);
    Gear.Measurable = Measurable;
})(Gear || (Gear = {}));
var Gear;
(function (Gear) {
    var Value = (function () {
        function Value(value, reactor) {
            var _this = this;
            this._reactor = reactor;
            this._in = new Gear.Controllable(function (a) { return _this.reactTo(a); });
            this._out = new Gear.Measurable(value);
        }
        Object.defineProperty(Value.prototype, "asControllable", {
            get: function () {
                return this._in;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Value.prototype, "asMeasurable", {
            get: function () {
                return this._out;
            },
            enumerable: true,
            configurable: true
        });
        Value.prototype.reactTo = function (action) {
            var newValue = this._reactor(action, this._out.sample);
            this._out.conduct(newValue);
        };
        return Value;
    })();
    Gear.Value = Value;
    var SimpleValue = (function (_super) {
        __extends(SimpleValue, _super);
        function SimpleValue(value, reactor) {
            if (reactor === void 0) { reactor = function (a, b) { return a; }; }
            _super.call(this, value, reactor);
        }
        return SimpleValue;
    })(Value);
    Gear.SimpleValue = SimpleValue;
})(Gear || (Gear = {}));
/// <reference path="call.ts" />
/// <reference path="pluggable.ts" />
/// <reference path="actuator.ts" />
/// <reference path="sensor.ts" />
/// <reference path="controllable.ts" />
/// <reference path="measurable.ts" />
/// <reference path="value.ts" />
var GasketTwist;
(function (GasketTwist) {
    function vectorFlattener(size) {
        return new Djee.ArrayFlattener(size, function (v) { return v.coordinates; });
    }
    var Rendering = (function () {
        function Rendering() {
            this._twist = new Gear.SimpleValue(0);
            this._scale = new Gear.SimpleValue(1);
            this._showCorners = new Gear.SimpleValue(true);
            this._showCenters = new Gear.SimpleValue(true);
        }
        Object.defineProperty(Rendering.prototype, "twist", {
            get: function () {
                return this._twist;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rendering.prototype, "scale", {
            get: function () {
                return this._scale;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rendering.prototype, "showCorners", {
            get: function () {
                return this._showCorners;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rendering.prototype, "showCenters", {
            get: function () {
                return this._showCenters;
            },
            enumerable: true,
            configurable: true
        });
        return Rendering;
    })();
    GasketTwist.Rendering = Rendering;
    function vec(angleIndex) {
        var angle = Math.PI * (0.5 + 2 * angleIndex / 3);
        return Space.vec([Math.cos(angle), Math.sin(angle)]);
    }
    var Sierpinski = (function () {
        function Sierpinski(a, b, c, depth) {
            var _this = this;
            if (a === void 0) { a = vec(0); }
            if (b === void 0) { b = vec(1); }
            if (c === void 0) { c = vec(2); }
            if (depth === void 0) { depth = 5; }
            this._tesselation = new Gear.Call(function () { return _this._outArrays.conduct(_this.flattened); });
            this._inA = new Gear.Controllable(function (a) {
                _this._a = a;
                _this._tesselation.later();
            });
            this._inB = new Gear.Controllable(function (b) {
                _this._b = b;
                _this._tesselation.later();
            });
            this._inC = new Gear.Controllable(function (c) {
                _this._c = c;
                _this._tesselation.later();
            });
            this._depth = new Gear.SimpleValue(5, function (inc, oldValue) {
                var newValue = oldValue + inc;
                if (newValue > 9) {
                    newValue = 9;
                }
                else if (newValue < 0) {
                    newValue = 0;
                }
                _this._tesselation.later();
                return newValue;
            });
            this._a = a;
            this._b = b;
            this._c = c;
            this._outArrays = new Gear.Measurable(this.flattened);
        }
        Object.defineProperty(Sierpinski.prototype, "inA", {
            get: function () {
                return this._inA;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sierpinski.prototype, "inB", {
            get: function () {
                return this._inB;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sierpinski.prototype, "inC", {
            get: function () {
                return this._inC;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sierpinski.prototype, "depth", {
            get: function () {
                return this._depth;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sierpinski.prototype, "outArrays", {
            get: function () {
                return this._outArrays;
            },
            enumerable: true,
            configurable: true
        });
        Sierpinski.prototype.tesselateTriangle = function () {
            var depth = this._depth.asMeasurable.sample;
            this._corners = [];
            this._centers = [];
            this.doTesselateTriangle(this._a, this._b, this._c, depth);
        };
        Sierpinski.prototype.doTesselateTriangle = function (a, b, c, counter, selector) {
            if (selector === void 0) { selector = Sierpinski.corners; }
            if (counter == 0) {
                selector(this).push(a, b, c);
            }
            else {
                var ab = a.mix(b, 0.5);
                var bc = b.mix(c, 0.5);
                var ca = c.mix(a, 0.5);
                var newCounter = counter - 1;
                this.doTesselateTriangle(a, ab, ca, newCounter, selector);
                this.doTesselateTriangle(ab, b, bc, newCounter, selector);
                this.doTesselateTriangle(ca, bc, c, newCounter, selector);
                this.doTesselateTriangle(ab, bc, ca, newCounter, Sierpinski.centers);
            }
        };
        Object.defineProperty(Sierpinski.prototype, "flattened", {
            get: function () {
                this.tesselateTriangle();
                var stride = this._a.coordinates.length;
                var flattener = vectorFlattener(stride);
                return {
                    corners: Djee.flatten(flattener, this._corners),
                    centers: Djee.flatten(flattener, this._centers),
                    stride: stride
                };
            },
            enumerable: true,
            configurable: true
        });
        Sierpinski.corners = function (s) { return s._corners; };
        Sierpinski.centers = function (s) { return s._centers; };
        return Sierpinski;
    })();
    GasketTwist.Sierpinski = Sierpinski;
})(GasketTwist || (GasketTwist = {}));
var GasketTwist;
(function (GasketTwist) {
    var vertexShader = "\n      attribute vec2 vPosition;\n      \n      uniform float twist;\n      uniform float scale;\n      \n      void main() {\n        vec2 p = scale * vPosition;\n        float angle = twist * length(p);\n        float s = sin(angle);\n        float c = cos(angle);\n        mat2 rotation = mat2(vec2(c, s), vec2(-s, c));\n        gl_Position = vec4(rotation * p, 0.0, 1.0);\n      }\n    ";
    var fragmentShader = "\n      precision mediump float;\n      \n      void main() {\n        gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);\n      }\n    ";
    var ST = Djee.ShaderType;
    function round(value) {
        return Math.round(1000 * value) / 1000;
    }
    var View = (function () {
        function View(canvasId, depthId, twistId, scaleId) {
            var _this = this;
            this._inArrays = new Gear.Sensor(function (arrays) { return _this.sierpinski = arrays; });
            this._inTwist = new Gear.Sensor(function (twist) {
                _this.twist = twist;
                _this._twistDiv.innerText = round(twist).toString();
            });
            this._inScale = new Gear.Sensor(function (scale) {
                _this.scale = scale;
                _this._scaleDiv.innerText = round(scale).toString();
            });
            this._inShowCorners = new Gear.Sensor(function (showCorners) { return _this._rendering.later(); });
            this._inShowCenters = new Gear.Sensor(function (showCenters) { return _this._rendering.later(); });
            this._inDepth = new Gear.Sensor(function (depth) { return _this._depthDiv.innerText = depth.toString(); });
            this._rendering = new Gear.Call(function () { return _this.draw(); });
            this._depthDiv = document.getElementById(depthId);
            this._twistDiv = document.getElementById(twistId);
            this._scaleDiv = document.getElementById(scaleId);
            this._context = new Djee.Context(canvasId);
            var context = this._context;
            this._vertexShader = context.shader(ST.VertexShader, vertexShader);
            this._fragmentShader = context.shader(ST.FragmentShader, fragmentShader);
            this._program = context.link([this._vertexShader, this._fragmentShader]);
            this._program.use();
            this._position = this._program.locateAttribute("vPosition", 2);
            this._twist = this._program.locateUniform("twist", 1);
            this._scale = this._program.locateUniform("scale", 1);
            this._cornersBuffer = context.newBuffer();
            this._centersBuffer = context.newBuffer();
            context.gl.clearColor(1, 1, 1, 1);
        }
        Object.defineProperty(View.prototype, "inArrays", {
            get: function () {
                return this._inArrays;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "inTwist", {
            get: function () {
                return this._inTwist;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "inScale", {
            get: function () {
                return this._inScale;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "inShowCorners", {
            get: function () {
                return this._inShowCorners;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "inShowCenters", {
            get: function () {
                return this._inShowCenters;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "inDepth", {
            get: function () {
                return this._inDepth;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "sierpinski", {
            set: function (flattenedSierpinski) {
                this._cornersBuffer.data = flattenedSierpinski.corners;
                this._centersBuffer.data = flattenedSierpinski.centers;
                this._rendering.later();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "twist", {
            set: function (twist) {
                this._twist.data = [twist];
                this._rendering.later();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "scale", {
            set: function (scale) {
                this._scale.data = [scale];
                this._rendering.later();
            },
            enumerable: true,
            configurable: true
        });
        View.prototype.draw = function () {
            var gl = this._context.gl;
            gl.clear(gl.COLOR_BUFFER_BIT);
            if (this._inShowCorners.reading) {
                this._position.pointTo(this._cornersBuffer);
                gl.drawArrays(gl.TRIANGLES, 0, this._cornersBuffer.data.length / 2);
            }
            if (this._inShowCenters.reading) {
                this._position.pointTo(this._centersBuffer);
                gl.drawArrays(gl.TRIANGLES, 0, this._centersBuffer.data.length / 2);
            }
        };
        return View;
    })();
    GasketTwist.View = View;
})(GasketTwist || (GasketTwist = {}));
var GasketTwist;
(function (GasketTwist) {
    var Controller = (function () {
        function Controller(canvas, cornersCheckbox, centersCheckbox, twistCheckbox, scaleCheckbox, depthIncButton, depthDecButton) {
            this._outShowCorners = new Gear.Actuator();
            this._outShowCenters = new Gear.Actuator();
            this._outDepth = new Gear.Actuator();
            this._outTwist = new Gear.Actuator();
            this._outScale = new Gear.Actuator();
            this._canvas = document.getElementById(canvas);
            this._cornersCheckbox = document.getElementById(cornersCheckbox);
            this._centersCheckbox = document.getElementById(centersCheckbox);
            this._twistCheckbox = document.getElementById(twistCheckbox);
            this._scaleCheckbox = document.getElementById(scaleCheckbox);
            this._depthIncButton = document.getElementById(depthIncButton);
            this._depthDecButton = document.getElementById(depthDecButton);
            this.registerEvents();
        }
        Object.defineProperty(Controller.prototype, "outShowCorners", {
            get: function () {
                return this._outShowCorners;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Controller.prototype, "outShowCenters", {
            get: function () {
                return this._outShowCenters;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Controller.prototype, "outDepth", {
            get: function () {
                return this._outDepth;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Controller.prototype, "outTwist", {
            get: function () {
                return this._outTwist;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Controller.prototype, "outScale", {
            get: function () {
                return this._outScale;
            },
            enumerable: true,
            configurable: true
        });
        Controller.prototype.registerEvents = function () {
            var _this = this;
            var root = this._canvas.parentElement.parentElement;
            root.onmousemove = function (e) {
                if (e.buttons != 0) {
                    var targetX = _this.x(root);
                    var targetY = _this.y(root);
                    _this.doMove(e.pageX - targetX, e.pageY - targetY);
                }
                e.preventDefault();
            };
            root.onmousedown = this._canvas.onmousemove;
            root.ontouchmove = function (e) {
                if (e.changedTouches.length != 0) {
                    var t = e.changedTouches[0];
                    var targetX = _this.x(root);
                    var targetY = _this.y(root);
                    _this.doMove(t.pageX - targetX, t.pageY - targetY);
                }
                e.preventDefault();
            };
            root.ontouchstart = this._canvas.ontouchmove;
            this._cornersCheckbox.onchange = function (e) {
                _this._outShowCorners.perform(_this._cornersCheckbox.checked);
            };
            this._centersCheckbox.onchange = function (e) {
                _this._outShowCenters.perform(_this._centersCheckbox.checked);
            };
            this._depthIncButton.onclick = function (e) {
                _this._outDepth.perform(+1);
            };
            this._depthDecButton.onclick = function (e) {
                _this._outDepth.perform(-1);
            };
        };
        Controller.prototype.doMove = function (x, y) {
            if (this._scaleCheckbox.checked) {
                this._outScale.perform(2 - 4 * y / this._canvas.clientHeight);
            }
            if (this._twistCheckbox.checked) {
                this._outTwist.perform(Math.PI * (4 * x / this._canvas.clientWidth - 2));
            }
        };
        Controller.prototype.x = function (element) {
            var result = element.offsetLeft;
            var parent = element.parentElement;
            return parent ? this.x(parent) + result : result;
        };
        Controller.prototype.y = function (element) {
            var result = element.offsetTop;
            var parent = element.parentElement;
            return parent ? this.y(parent) + result : result;
        };
        return Controller;
    })();
    GasketTwist.Controller = Controller;
})(GasketTwist || (GasketTwist = {}));
/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
/// <reference path="model.ts" />
/// <reference path="view.ts" />
/// <reference path="controller.ts" />
var GasketTwist;
(function (GasketTwist) {
    window.onload = function (e) {
        var sierpinski = new GasketTwist.Sierpinski();
        var rendering = new GasketTwist.Rendering();
        var view = new GasketTwist.View("canvas-gl", "division-depth", "twist", "scale");
        var controller = new GasketTwist.Controller("canvas-gl", "input-corners", "input-centers", "input-twist", "input-scale", "division-inc", "division-dec");
        controller.outDepth.drives(sierpinski.depth);
        controller.outScale.drives(rendering.scale);
        controller.outTwist.drives(rendering.twist);
        controller.outShowCorners.drives(rendering.showCorners);
        controller.outShowCenters.drives(rendering.showCenters);
        view.inArrays.probes(sierpinski.outArrays);
        view.inScale.probes(rendering.scale);
        view.inTwist.probes(rendering.twist);
        view.inShowCorners.probes(rendering.showCorners);
        view.inShowCenters.probes(rendering.showCenters);
        view.inDepth.probes(sierpinski.depth);
    };
})(GasketTwist || (GasketTwist = {}));
//# sourceMappingURL=ghadeeras.js.map