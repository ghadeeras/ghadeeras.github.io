var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var Djee;
(function (Djee) {
    function sum(v1, v2) {
        return v1 + v2;
    }
    var AbstractFlattener = /** @class */ (function () {
        function AbstractFlattener(size) {
            this.size = size;
        }
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
        AbstractFlattener.prototype.flattenAll = function (structures, array, index) {
            if (array === void 0) { array = new Array(this.size * structures.length); }
            if (index === void 0) { index = 0; }
            for (var i = 0; i < structures.length; i++) {
                this.flatten(structures[i], array, index);
                index += this.size;
            }
            return array;
        };
        AbstractFlattener.prototype.unflatten = function (structure, array, index) {
            if (index === void 0) { index = 0; }
            this.doUnflatten(structure, array, index);
        };
        return AbstractFlattener;
    }());
    var PrimitiveFlattener = /** @class */ (function (_super) {
        __extends(PrimitiveFlattener, _super);
        function PrimitiveFlattener(getter, setter) {
            var _this = _super.call(this, 1) || this;
            _this.getter = getter;
            _this.setter = setter;
            return _this;
        }
        PrimitiveFlattener.prototype.subFlatteners = function () {
            return [];
        };
        PrimitiveFlattener.prototype.doFlatten = function (structure, array, index) {
            array[index] = this.getter(structure);
        };
        PrimitiveFlattener.prototype.doUnflatten = function (structure, array, index) {
            this.setter(structure, array[index]);
        };
        return PrimitiveFlattener;
    }(AbstractFlattener));
    var ArrayFlattener = /** @class */ (function (_super) {
        __extends(ArrayFlattener, _super);
        function ArrayFlattener(size, getter) {
            var _this = _super.call(this, size) || this;
            _this.getter = getter;
            _this.getter = getter;
            return _this;
        }
        ArrayFlattener.prototype.subFlatteners = function () {
            return [];
        };
        ArrayFlattener.prototype.doFlatten = function (structure, array, index) {
            this.copy(structure, array, function (sa, a, i) { return a[index + i] = sa[i]; });
        };
        ArrayFlattener.prototype.doUnflatten = function (structure, array, index) {
            this.copy(structure, array, function (sa, a, i) { return sa[i] = a[index + i]; });
        };
        ArrayFlattener.prototype.copy = function (structure, array, copier) {
            var structureArray = this.getter(structure);
            for (var i = 0; i < this.size; i++) {
                copier(structureArray, array, i);
            }
        };
        return ArrayFlattener;
    }(AbstractFlattener));
    var ChildFlattener = /** @class */ (function (_super) {
        __extends(ChildFlattener, _super);
        function ChildFlattener(flattener, getter) {
            var _this = _super.call(this, flattener.size) || this;
            _this.flattener = flattener;
            _this.getter = getter;
            return _this;
        }
        ChildFlattener.prototype.subFlatteners = function () {
            return [this.flattener];
        };
        ChildFlattener.prototype.doFlatten = function (structure, array, index) {
            var _this = this;
            this.copy(structure, array, index, function (s, a, i) { return _this.flattener.flatten(s, a, i); });
        };
        ChildFlattener.prototype.doUnflatten = function (structure, array, index) {
            var _this = this;
            this.copy(structure, array, index, function (s, a, i) { return _this.flattener.unflatten(s, a, i); });
        };
        ChildFlattener.prototype.copy = function (structure, array, index, copier) {
            copier(this.getter(structure), array, index);
        };
        return ChildFlattener;
    }(AbstractFlattener));
    var CompositeFlattener = /** @class */ (function (_super) {
        __extends(CompositeFlattener, _super);
        function CompositeFlattener(flatteners) {
            var _this = _super.call(this, flatteners.map(function (f) { return f.size; }).reduce(sum)) || this;
            _this.flatteners = flatteners;
            return _this;
        }
        CompositeFlattener.prototype.subFlatteners = function () {
            return this.flatteners;
        };
        CompositeFlattener.prototype.doFlatten = function (structure, array, index) {
            this.copy(structure, array, index, function (f) { return function (s, a, i) { return f.flatten(s, a, i); }; });
        };
        CompositeFlattener.prototype.doUnflatten = function (structure, array, index) {
            this.copy(structure, array, index, function (f) { return function (s, a, i) { return f.unflatten(s, a, i); }; });
        };
        CompositeFlattener.prototype.copy = function (structure, array, index, copier) {
            for (var i = 0; i < this.flatteners.length; i++) {
                var f = this.flatteners[i];
                copier(f)(structure, array, index);
                index += f.size;
            }
        };
        return CompositeFlattener;
    }(AbstractFlattener));
    Djee.flatteners = {
        composite: function () {
            var flatteners = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                flatteners[_i] = arguments[_i];
            }
            return new CompositeFlattener(flatteners);
        },
        primitive: function (getter, setter) {
            return new PrimitiveFlattener(getter, setter);
        },
        array: function (getter, size) {
            return new ArrayFlattener(size, getter);
        },
        child: function (getter, flattener) {
            return new ChildFlattener(flattener, getter);
        }
    };
})(Djee || (Djee = {}));
var Djee;
(function (Djee) {
    var Context = /** @class */ (function () {
        function Context(canvasId) {
            this.canvas = this.getCanvas(canvasId);
            this.gl = this.getContext(this.canvas);
        }
        Context.prototype.getCanvas = function (canvasId) {
            var canvas = document.getElementById(canvasId);
            if (!canvas) {
                throw "No canvas found with ID: " + canvasId;
            }
            return canvas;
        };
        Context.prototype.getContext = function (canvas) {
            var gl = this.doGetContext(canvas);
            if (!gl) {
                throw "Your browser seems not to support WebGL!";
            }
            return gl;
        };
        Context.prototype.doGetContext = function (canvas) {
            try {
                return canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            }
            catch (e) {
                console.error(e);
                return null;
            }
        };
        Context.prototype.with = function (glCode) {
            return glCode(this.gl);
        };
        Context.prototype.shaderFromElement = function (scriptId) {
            return Djee.Shader.fromElement(this, scriptId);
        };
        Context.prototype.vertexShader = function (code) {
            return this.shader(Djee.ShaderType.VertexShader, code);
        };
        Context.prototype.fragmentShader = function (code) {
            return this.shader(Djee.ShaderType.FragmentShader, code);
        };
        Context.prototype.shader = function (type, code) {
            return new Djee.Shader(this, type, code);
        };
        Context.prototype.linkFromElements = function (scriptIds) {
            var _this = this;
            var shaders = scriptIds.map(function (id) { return _this.shaderFromElement(id); });
            return this.link(shaders);
        };
        Context.prototype.link = function (shaders) {
            return new Djee.Program(this, shaders);
        };
        Context.prototype.newBuffer = function () {
            return new Djee.Buffer(this);
        };
        return Context;
    }());
    Djee.Context = Context;
})(Djee || (Djee = {}));
var Djee;
(function (Djee) {
    var Shader = /** @class */ (function () {
        function Shader(context, type, code) {
            this.context = context;
            this.type = type;
            this.code = code;
            this.context = context;
            this.type = type;
            this.code = code;
            this.shader = this.makeShader(context.gl, type, code);
        }
        Shader.fromElement = function (context, scriptId) {
            var script = this.getScript(scriptId);
            var type = this.getShaderType(script.getAttribute('type'));
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
        Shader.prototype.delete = function () {
            this.context.gl.deleteShader(this.shader);
        };
        return Shader;
    }());
    Djee.Shader = Shader;
    var ShaderType;
    (function (ShaderType) {
        ShaderType[ShaderType["VertexShader"] = WebGLRenderingContext.VERTEX_SHADER] = "VertexShader";
        ShaderType[ShaderType["FragmentShader"] = WebGLRenderingContext.FRAGMENT_SHADER] = "FragmentShader";
    })(ShaderType = Djee.ShaderType || (Djee.ShaderType = {}));
})(Djee || (Djee = {}));
var Djee;
(function (Djee) {
    var Program = /** @class */ (function () {
        function Program(context, shaders) {
            this.context = context;
            this.shaders = shaders;
            this.program = this.makeProgram(context.gl, shaders);
        }
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
            var gl = this.context.gl;
            this.shaders.forEach(function (shader) {
                gl.detachShader(_this.program, shader.shader);
                gl.deleteShader(shader.shader);
            });
            gl.deleteProgram(this.program);
        };
        Program.prototype.use = function () {
            this.context.gl.useProgram(this.program);
        };
        Program.prototype.locateAttribute = function (name, size) {
            return new Djee.Attribute(this, name, size);
        };
        Program.prototype.locateUniform = function (name, size) {
            return new Djee.Uniform(this, name, size);
        };
        Object.defineProperty(Program.prototype, "uniforms", {
            get: function () {
                var _this = this;
                var gl = this.context.gl;
                return this.activeInfos(gl.ACTIVE_UNIFORMS, function (i) { return gl.getActiveUniform(_this.program, i); });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Program.prototype, "attributes", {
            get: function () {
                var _this = this;
                var gl = this.context.gl;
                return this.activeInfos(gl.ACTIVE_ATTRIBUTES, function (i) { return gl.getActiveAttrib(_this.program, i); });
            },
            enumerable: true,
            configurable: true
        });
        Program.prototype.activeInfos = function (type, getter) {
            var gl = this.context.gl;
            var count = gl.getProgramParameter(this.program, type);
            var result = [];
            for (var i = 0; i < count; i++) {
                var info = getter(i);
                result.push({
                    name: info.name,
                    type: info.type,
                    dimensions: this.dimensions(info),
                    size: info.size
                });
            }
            return result;
        };
        Program.prototype.dimensions = function (info) {
            var gl = this.context.gl;
            switch (info.type) {
                case gl.FLOAT: return 1;
                case gl.FLOAT_VEC2: return 2;
                case gl.FLOAT_VEC3: return 3;
                case gl.FLOAT_VEC4: return 4;
                default: throw "Unsupported type: " + info.type;
            }
            ;
        };
        return Program;
    }());
    Djee.Program = Program;
})(Djee || (Djee = {}));
var Djee;
(function (Djee) {
    var Attribute = /** @class */ (function () {
        function Attribute(program, name, size) {
            this.program = program;
            this.name = name;
            this.size = size;
            this.location = program.context.gl.getAttribLocation(program.program, name);
        }
        Attribute.prototype.pointTo = function (buffer, stride, offset) {
            var _this = this;
            if (stride === void 0) { stride = this.size; }
            if (offset === void 0) { offset = 0; }
            buffer.bind(function (gl) {
                gl.vertexAttribPointer(_this.location, _this.size, gl.FLOAT, false, stride * 4, offset * 4);
                gl.enableVertexAttribArray(_this.location);
            });
        };
        return Attribute;
    }());
    Djee.Attribute = Attribute;
})(Djee || (Djee = {}));
var Djee;
(function (Djee) {
    var Uniform = /** @class */ (function () {
        function Uniform(program, name, size) {
            this.program = program;
            this.name = name;
            this.size = size;
            var gl = program.context.gl;
            this.location = gl.getUniformLocation(program.program, name);
            this.setter = this.getSetter(gl, size);
            this._data = new Array(size);
        }
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
                return Djee.copyOf(this._data);
            },
            set: function (data) {
                if (data.length < this.size) {
                    throw "Arrays of length '" + data.length + "' cannot be assigned to uniform vector '" + this.name + "' which has size '" + this.size + "'";
                }
                this.setter(new Float32Array(data));
                this._data = Djee.copyOf(data);
            },
            enumerable: true,
            configurable: true
        });
        return Uniform;
    }());
    Djee.Uniform = Uniform;
})(Djee || (Djee = {}));
var Djee;
(function (Djee) {
    var Buffer = /** @class */ (function () {
        function Buffer(context) {
            this.context = context;
            this._data = [];
            this.buffer = context.gl.createBuffer();
        }
        Buffer.prototype.bind = function (glCode) {
            var _this = this;
            return this.context.with(function (gl) {
                gl.bindBuffer(gl.ARRAY_BUFFER, _this.buffer);
                return glCode(gl);
            });
        };
        Object.defineProperty(Buffer.prototype, "data", {
            get: function () {
                return Djee.copyOf(this._data);
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
    }());
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
/// <reference path="flattener.ts" />
/// <reference path="context.ts" />
/// <reference path="shader.ts" />
/// <reference path="program.ts" />
/// <reference path="attribute.ts" />
/// <reference path="uniform.ts" />
/// <reference path="buffer.ts" />
(function (Djee) {
    function copyOf(array) {
        return array.slice(0, array.length);
    }
    Djee.copyOf = copyOf;
})(Djee || (Djee = {}));
var Space;
(function (Space) {
    var Vector = /** @class */ (function () {
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
        Vector.prototype.c = function () {
            var indexes = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                indexes[_i] = arguments[_i];
            }
            var result = new Array(indexes.length);
            for (var i = 0; i < indexes.length; i++) {
                result[i] = this.coordinates[indexes[i]] || 0;
            }
            return new Vector(result);
        };
        Vector.prototype.cross = function (v) {
            var v1 = this.c(0, 1, 2).coordinates;
            var v2 = v.c(0, 1, 2).coordinates;
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
    }());
    Space.Vector = Vector;
})(Space || (Space = {}));
/// <reference path="vector.ts" />
var Space;
/// <reference path="vector.ts" />
(function (Space) {
    function vec(coordinates) {
        return new Space.Vector(coordinates);
    }
    Space.vec = vec;
})(Space || (Space = {}));
var Gear;
(function (Gear) {
    var Lazy = /** @class */ (function () {
        function Lazy(supplier) {
            this.supplier = supplier;
            this._value = null;
        }
        Lazy.prototype.get = function () {
            if (!this._value) {
                this._value = this.supplier();
            }
            return this._value;
        };
        return Lazy;
    }());
    function lazy(constructor) {
        var lazy = new Lazy(constructor);
        return function () { return lazy.get(); };
    }
    Gear.lazy = lazy;
})(Gear || (Gear = {}));
var Gear;
(function (Gear) {
    var Call = /** @class */ (function () {
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
    }());
    Gear.Call = Call;
})(Gear || (Gear = {}));
var Gear;
(function (Gear) {
    var BaseSource = /** @class */ (function () {
        function BaseSource() {
        }
        BaseSource.prototype.flow = function () {
            return Flow.from(this);
        };
        BaseSource.prototype.to = function () {
            var sinks = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                sinks[_i] = arguments[_i];
            }
            var sink = new CompositeSink(sinks);
            this.producer(sink.consumer);
        };
        return BaseSource;
    }());
    Gear.BaseSource = BaseSource;
    var CompositeSource = /** @class */ (function (_super) {
        __extends(CompositeSource, _super);
        function CompositeSource(sources) {
            var _this = _super.call(this) || this;
            _this.sources = sources;
            var producers = _this.sources.map(function (source) { return source.producer; });
            _this._producer = Gear.compositeConsumer.apply(void 0, producers);
            return _this;
        }
        Object.defineProperty(CompositeSource.prototype, "producer", {
            get: function () {
                return this._producer;
            },
            enumerable: true,
            configurable: true
        });
        return CompositeSource;
    }(BaseSource));
    Gear.CompositeSource = CompositeSource;
    var CompositeSink = /** @class */ (function () {
        function CompositeSink(sinks) {
            this.sinks = sinks;
            var consumers = this.sinks.map(function (sink) { return sink.consumer; });
            this._consumer = Gear.compositeConsumer.apply(void 0, consumers);
        }
        Object.defineProperty(CompositeSink.prototype, "consumer", {
            get: function () {
                return this._consumer;
            },
            enumerable: true,
            configurable: true
        });
        return CompositeSink;
    }());
    Gear.CompositeSink = CompositeSink;
    var Flow = /** @class */ (function (_super) {
        __extends(Flow, _super);
        function Flow(output) {
            var _this = _super.call(this) || this;
            _this.output = output;
            return _this;
        }
        Flow.prototype.filter = function (predicate) {
            return this.then(Gear.filter(predicate));
        };
        Flow.prototype.map = function (mapper) {
            return this.then(Gear.map(mapper));
        };
        Flow.prototype.reduce = function (reducer, identity) {
            return this.then(Gear.reduce(reducer, identity));
        };
        Flow.prototype.defaultsTo = function (value) {
            return this.through(Gear.defaultsTo(value));
        };
        Flow.prototype.then = function (effect, defaultValue) {
            if (defaultValue === void 0) { defaultValue = null; }
            var safeEffect = defaultValue != null ?
                function (value, resultConsumer) { return effect(value != null ? value : defaultValue, resultConsumer); } :
                function (value, resultConsumer) { return (value != null) ? effect(value, resultConsumer) : {}; };
            return this.through(safeEffect);
        };
        Flow.prototype.through = function (effect) {
            var newOutput = new Gear.Value();
            Gear.causeEffectLink(this.output, effect, newOutput.consumer);
            return new Flow(newOutput.producer);
        };
        Flow.prototype.branch = function () {
            var _this = this;
            var flowBuilders = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                flowBuilders[_i] = arguments[_i];
            }
            flowBuilders.forEach(function (builder) { return builder(_this); });
            return this;
        };
        Object.defineProperty(Flow.prototype, "producer", {
            get: function () {
                return this.output;
            },
            enumerable: true,
            configurable: true
        });
        Flow.from = function () {
            var sources = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                sources[_i] = arguments[_i];
            }
            var source = new CompositeSource(sources);
            return new Flow(source.producer);
        };
        return Flow;
    }(BaseSource));
    Gear.Flow = Flow;
    function consumerFlow(flowBuilder) {
        return sinkFlow(flowBuilder).consumer;
    }
    Gear.consumerFlow = consumerFlow;
    function sinkFlow(flowBuilder) {
        var value = new Gear.Value();
        Flow.from(value).branch(flowBuilder);
        return value;
    }
    Gear.sinkFlow = sinkFlow;
    function sink(consumer) {
        return { consumer: consumer };
    }
    Gear.sink = sink;
})(Gear || (Gear = {}));
var Gear;
(function (Gear) {
    var Value = /** @class */ (function (_super) {
        __extends(Value, _super);
        function Value(_value) {
            if (_value === void 0) { _value = null; }
            var _this = _super.call(this) || this;
            _this._value = _value;
            _this.consumers = [];
            return _this;
        }
        Object.defineProperty(Value.prototype, "value", {
            get: function () {
                return this._value;
            },
            set: function (newValue) {
                this.setValue(newValue);
            },
            enumerable: true,
            configurable: true
        });
        Value.prototype.setValue = function (newValue) {
            this._value = newValue;
            this.notify(this.consumers);
        };
        Value.prototype.supply = function () {
            var _a;
            var consumers = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                consumers[_i] = arguments[_i];
            }
            (_a = this.consumers).push.apply(_a, consumers);
            try {
                this.notify(consumers);
            }
            catch (e) {
                console.log(e);
            }
            return this;
        };
        Value.prototype.notify = function (consumers) {
            for (var _i = 0, consumers_1 = consumers; _i < consumers_1.length; _i++) {
                var consumer = consumers_1[_i];
                consumer(this._value);
            }
        };
        Object.defineProperty(Value.prototype, "consumer", {
            get: function () {
                var _this = this;
                return function (value) { return _this.setValue(value); };
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Value.prototype, "producer", {
            get: function () {
                var _this = this;
                return function (consumer) { return _this.supply(consumer); };
            },
            enumerable: true,
            configurable: true
        });
        Value.setOf = function () {
            var values = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                values[_i] = arguments[_i];
            }
            return new ValueSet(values);
        };
        return Value;
    }(Gear.BaseSource));
    Gear.Value = Value;
    var ValueSet = /** @class */ (function (_super) {
        __extends(ValueSet, _super);
        function ValueSet(values) {
            var _this = _super.call(this) || this;
            _this.source = new Gear.CompositeSource(values);
            _this.sink = new Gear.CompositeSink(values);
            return _this;
        }
        Object.defineProperty(ValueSet.prototype, "producer", {
            get: function () {
                return this.source.producer;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ValueSet.prototype, "consumer", {
            get: function () {
                return this.sink.consumer;
            },
            enumerable: true,
            configurable: true
        });
        return ValueSet;
    }(Gear.BaseSource));
    Gear.ValueSet = ValueSet;
})(Gear || (Gear = {}));
var Gear;
(function (Gear) {
    function reduce(reducer, identity) {
        var accumulator = [identity];
        return function (value, result) { return result(accumulator[0] = reducer(value, accumulator[0])); };
    }
    Gear.reduce = reduce;
    function map(mapper) {
        return function (value, result) { return result(mapper(value)); };
    }
    Gear.map = map;
    function filter(predicate) {
        return function (value, result) {
            if (predicate(value)) {
                result(value);
            }
        };
    }
    Gear.filter = filter;
    function later() {
        var consumerRef = [function () { }];
        var call = new Gear.Call(function () { return consumerRef[0](); });
        return function (value, result) {
            consumerRef[0] = function () { return result(value); };
            call.later();
        };
    }
    Gear.later = later;
    function flowSwitch(on, initialState) {
        if (initialState === void 0) { initialState = false; }
        var onRef = [initialState];
        on.to(Gear.sink(function (value) { onRef[0] = value; }));
        return filter(function (value) { return onRef[0]; });
    }
    Gear.flowSwitch = flowSwitch;
    function repeater(interval, restValue) {
        var valueRef = [restValue];
        var timerRef = [null];
        return function (newValue, consumer) {
            if (newValue != null && newValue != restValue) {
                valueRef[0] = newValue;
                timerRef[0] = setInterval(function () { return consumer(valueRef[0]); }, interval);
            }
            else {
                valueRef[0] = restValue;
                clearInterval(timerRef[0]);
            }
            consumer(newValue);
        };
    }
    Gear.repeater = repeater;
    function defaultsTo(value) {
        return map(function (v) { return v != null ? v : value; });
    }
    Gear.defaultsTo = defaultsTo;
    function choice(truwValue, falseValue) {
        return map(function (v) { return v ? truwValue : falseValue; });
    }
    Gear.choice = choice;
})(Gear || (Gear = {}));
var Gear;
(function (Gear) {
    function checkbox(elementId) {
        var element = document.getElementById(elementId);
        var value = new Gear.Value(element.checked);
        element.onchange = function (e) { return value.value = element.checked; };
        return value.flow();
    }
    Gear.checkbox = checkbox;
    function readableValue(elementId) {
        var element = document.getElementById(elementId);
        var value = new Gear.Value(element.value);
        element.onchange = function (e) { return value.value = element.value; };
        return Gear.Flow.from(value);
    }
    Gear.readableValue = readableValue;
    function elementEvents(elementId) {
        return ElementEvents.create(elementId);
    }
    Gear.elementEvents = elementEvents;
    var ElementEvents = /** @class */ (function () {
        function ElementEvents(element) {
            var _this = this;
            this.element = element;
            this.elementPos = pagePos(this.element);
            this.lazyClick = Gear.lazy(function () { return _this.newClick(); });
            this.lazyMousePos = Gear.lazy(function () { return _this.newMousePos(); });
            this.lazyTouchPos = Gear.lazy(function () { return _this.newTouchPos(); });
            this.lazyMouseButtons = Gear.lazy(function () { return _this.newMouseButtons(); });
        }
        ElementEvents.prototype.parent = function () {
            return new ElementEvents(this.element.parentElement);
        };
        ElementEvents.prototype.newClick = function () {
            var _this = this;
            var value = pointerPositionValue([0, 0]);
            this.element.onclick = function (e) {
                value.value = _this.relativePos(e);
                e.preventDefault();
            };
            return value.flow();
        };
        ElementEvents.prototype.newMousePos = function () {
            var _this = this;
            var value = pointerPositionValue([0, 0]);
            this.element.onmousemove = function (e) {
                value.value = _this.relativePos(e);
                e.preventDefault();
            };
            return value.flow();
        };
        ElementEvents.prototype.newTouchPos = function () {
            var _this = this;
            var value = new Gear.Value([]);
            this.element.ontouchmove = this.element.ontouchstart = function (e) {
                var touches = [];
                for (var i = 0; i < e.touches.length; i++) {
                    touches.push(_this.relativePos(e.touches.item(i)));
                }
                value.value = touches;
                e.preventDefault();
            };
            return value.flow();
        };
        ElementEvents.prototype.relativePos = function (p) {
            var pointerPos = pos(p.pageX, p.pageY);
            return sub(pointerPos, this.elementPos);
        };
        ElementEvents.prototype.newMouseButtons = function () {
            var _this = this;
            var value = mouseButtonsValue([false, false, false]);
            this.element.onmousedown = function (e) {
                _this.setButton(value, e.button, true);
                e.preventDefault();
            };
            this.element.onmouseup = function (e) {
                _this.setButton(value, e.button, false);
                e.preventDefault();
            };
            return value.flow();
        };
        ElementEvents.prototype.setButton = function (buttons, button, pressed) {
            buttons.value = updatedButtons(buttons.value, button, pressed);
        };
        Object.defineProperty(ElementEvents.prototype, "click", {
            get: function () {
                return this.lazyClick();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ElementEvents.prototype, "mousePos", {
            get: function () {
                return this.lazyMousePos();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ElementEvents.prototype, "touchPos", {
            get: function () {
                return this.lazyTouchPos();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ElementEvents.prototype, "mouseButons", {
            get: function () {
                return this.lazyMouseButtons();
            },
            enumerable: true,
            configurable: true
        });
        ElementEvents.create = function (elementId) {
            return new ElementEvents(document.getElementById(elementId));
        };
        return ElementEvents;
    }());
    Gear.ElementEvents = ElementEvents;
    function pagePos(element) {
        var result = pos(element.offsetLeft, element.offsetTop);
        var parent = element.parentElement;
        return parent ? add(pagePos(parent), result) : result;
    }
    function pos(x, y) {
        return [x, y];
    }
    function add(pos1, pos2) {
        var x1 = pos1[0], y1 = pos1[1];
        var x2 = pos2[0], y2 = pos2[1];
        return [x1 + x2, y1 + y2];
    }
    function sub(pos1, pos2) {
        var x1 = pos1[0], y1 = pos1[1];
        var x2 = pos2[0], y2 = pos2[1];
        return [x1 - x2, y1 - y2];
    }
    function pointerPositionValue(initialPos) {
        return new Gear.Value(initialPos);
    }
    function mouseButtonsValue(initialButtons) {
        return new Gear.Value(initialButtons);
    }
    function updatedButtons(buttons, button, pressed) {
        var result = buttons;
        result[button % 3] = pressed;
        return result;
    }
})(Gear || (Gear = {}));
var Gear;
(function (Gear) {
    function text(elementId) {
        var element = document.getElementById(elementId);
        return Gear.sink(function (text) { element.textContent = text; });
    }
    Gear.text = text;
    function writeableValue(elementId) {
        var element = document.getElementById(elementId);
        return Gear.sink(function (text) { element.value = text; });
    }
    Gear.writeableValue = writeableValue;
})(Gear || (Gear = {}));
/// <reference path="lazy.ts" />
/// <reference path="call.ts" />
/// <reference path="flow.ts" />
/// <reference path="value.ts" />
/// <reference path="value.ts" />
/// <reference path="effects.ts" />
/// <reference path="ui-input.ts" />
/// <reference path="ui-output.ts" />
var Gear;
/// <reference path="lazy.ts" />
/// <reference path="call.ts" />
/// <reference path="flow.ts" />
/// <reference path="value.ts" />
/// <reference path="value.ts" />
/// <reference path="effects.ts" />
/// <reference path="ui-input.ts" />
/// <reference path="ui-output.ts" />
(function (Gear) {
    function intact() {
        return function (value) { return value; };
    }
    Gear.intact = intact;
    function compositeConsumer() {
        var consumers = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            consumers[_i] = arguments[_i];
        }
        switch (consumers.length) {
            case 0: return function () { };
            case 1: return consumers[0];
            default: return function (value) {
                for (var _i = 0, consumers_2 = consumers; _i < consumers_2.length; _i++) {
                    var consumer = consumers_2[_i];
                    consumer(value);
                }
            };
        }
    }
    Gear.compositeConsumer = compositeConsumer;
    function causeEffectLink(causeProducer, effect, effectConsumer) {
        return causeProducer(function (cause) { return effect(cause, effectConsumer); });
    }
    Gear.causeEffectLink = causeEffectLink;
})(Gear || (Gear = {}));
var GasketTwist2;
(function (GasketTwist2) {
    var defaultSierpinski = {
        depth: 5,
        a: vec(90),
        b: vec(210),
        c: vec(330)
    };
    function sierpinski(depth, a, b, c) {
        if (depth === void 0) { depth = new Gear.Value(defaultSierpinski.depth); }
        if (a === void 0) { a = new Gear.Value(defaultSierpinski.a); }
        if (b === void 0) { b = new Gear.Value(defaultSierpinski.b); }
        if (c === void 0) { c = new Gear.Value(defaultSierpinski.c); }
        var sierpinski = __assign({}, defaultSierpinski);
        return from(from(depth).reduce(function (d, s) { return s = __assign(__assign({}, s), { depth: d }); }, sierpinski), from(a).reduce(function (a, s) { return s = __assign(__assign({}, s), { a: a }); }, sierpinski), from(b).reduce(function (b, s) { return s = __assign(__assign({}, s), { b: b }); }, sierpinski), from(c).reduce(function (c, s) { return s = __assign(__assign({}, s), { c: c }); }, sierpinski)).map(function (s) { return tesselatedTriangle(s.a, s.b, s.c, s.depth); });
    }
    GasketTwist2.sierpinski = sierpinski;
    function from() {
        var _a;
        var sources = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            sources[_i] = arguments[_i];
        }
        return (_a = Gear.Flow).from.apply(_a, sources);
    }
    function vec(angleInDegrees) {
        var angle = Math.PI * angleInDegrees / 180;
        return Space.vec([Math.cos(angle), Math.sin(angle)]);
    }
    function tesselatedTriangle(a, b, c, depth) {
        var result = {
            corners: [],
            centers: [],
            stride: a.coordinates.length
        };
        doTesselateTriangle(a, b, c, depth, result.corners, result.centers);
        return result;
    }
    GasketTwist2.tesselatedTriangle = tesselatedTriangle;
    function doTesselateTriangle(a, b, c, depth, corners, centers) {
        if (depth < 1) {
            corners.push.apply(corners, __spreadArrays(a.coordinates, b.coordinates, c.coordinates));
        }
        else {
            var ab = a.mix(b, 0.5);
            var bc = b.mix(c, 0.5);
            var ca = c.mix(a, 0.5);
            var newDepth = depth - 1;
            doTesselateTriangle(a, ab, ca, newDepth, corners, centers);
            doTesselateTriangle(ab, b, bc, newDepth, corners, centers);
            doTesselateTriangle(ca, bc, c, newDepth, corners, centers);
            doTesselateTriangle(ab, bc, ca, newDepth, centers, centers);
        }
    }
})(GasketTwist2 || (GasketTwist2 = {}));
var GasketTwist2;
(function (GasketTwist2) {
    var vertexShader = "\n      attribute vec2 vPosition;\n      \n      uniform float twist;\n      uniform float scale;\n      \n      void main() {\n        vec2 p = scale * vPosition;\n        float angle = twist * length(p);\n        float s = sin(angle);\n        float c = cos(angle);\n        mat2 rotation = mat2(vec2(c, s), vec2(-s, c));\n        gl_Position = vec4(rotation * p, 0.0, 1.0);\n      }\n    ";
    var fragmentShader = "\n      precision mediump float;\n      \n      void main() {\n        gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);\n      }\n    ";
    var ST = Djee.ShaderType;
    function round(value) {
        return Math.round(1000 * value) / 1000;
    }
    var View = /** @class */ (function () {
        function View(canvasId, depthId, twistId, scaleId) {
            var _this = this;
            this.context = new Djee.Context(canvasId);
            this.vertexShader = this.context.shader(ST.VertexShader, vertexShader);
            this.fragmentShader = this.context.shader(ST.FragmentShader, fragmentShader);
            this.program = this.context.link([this.vertexShader, this.fragmentShader]);
            this.program.use();
            this.shaderPosition = this.program.locateAttribute("vPosition", 2);
            this.shaderTwist = this.program.locateUniform("twist", 1);
            this.shaderScale = this.program.locateUniform("scale", 1);
            this.cornersBuffer = this.context.newBuffer();
            this.centersBuffer = this.context.newBuffer();
            this.context.gl.clearColor(1, 1, 1, 1);
            this.sierpinsky = Gear.sink(function (s) { return _this.setSierpinski(s); });
            this.depth = Gear.sinkFlow(function (flow) { return flow.defaultsTo(5).map(function (v) { return v + ""; }).to(Gear.text(depthId)); });
            this.twist = Gear.sinkFlow(function (flow) { return flow.defaultsTo(0).branch(function (flow) { return flow.to(Gear.sink(function (t) { return _this.setTwist(t); })); }).map(function (v) { return v + ""; }).to(Gear.text(twistId)); });
            this.scale = Gear.sinkFlow(function (flow) { return flow.defaultsTo(1).branch(function (flow) { return flow.to(Gear.sink(function (s) { return _this.setScale(s); })); }).map(function (v) { return v + ""; }).to(Gear.text(scaleId)); });
            this.showCorners = Gear.sink(function (show) { return _this.setShowCorners(show); });
            this.showCenters = Gear.sink(function (show) { return _this.setShowCenters(show); });
        }
        View.prototype.source = function (value) {
            return new Gear.Value(value);
        };
        View.prototype.setSierpinski = function (flattenedSierpinski) {
            this.cornersBuffer.data = flattenedSierpinski.corners;
            this.centersBuffer.data = flattenedSierpinski.centers;
            this.stride = flattenedSierpinski.stride;
            this.draw();
        };
        View.prototype.setTwist = function (twist) {
            this.shaderTwist.data = [twist];
            this.draw();
        };
        View.prototype.setScale = function (scale) {
            this.shaderScale.data = [scale];
            this.draw();
        };
        View.prototype.setShowCorners = function (showCorners) {
            this.mustShowCorners = showCorners;
            this.draw();
        };
        View.prototype.setShowCenters = function (showCenters) {
            this.mustShowCenters = showCenters;
            this.draw();
        };
        View.prototype.draw = function () {
            var _this = this;
            setTimeout(function () {
                var gl = _this.context.gl;
                gl.clear(gl.COLOR_BUFFER_BIT);
                if (_this.mustShowCorners) {
                    _this.shaderPosition.pointTo(_this.cornersBuffer);
                    gl.drawArrays(gl.TRIANGLES, 0, _this.cornersBuffer.data.length / _this.stride);
                }
                if (_this.mustShowCenters) {
                    _this.shaderPosition.pointTo(_this.centersBuffer);
                    gl.drawArrays(gl.TRIANGLES, 0, _this.centersBuffer.data.length / _this.stride);
                }
            });
        };
        return View;
    }());
    GasketTwist2.View = View;
})(GasketTwist2 || (GasketTwist2 = {}));
var GasketTwist2;
(function (GasketTwist2) {
    var Controller = /** @class */ (function () {
        function Controller(canvasId, cornersCheckboxId, centersCheckboxId, twistCheckboxId, scaleCheckboxId, depthIncButtonId, depthDecButtonId) {
            var canvas = Gear.ElementEvents.create(canvasId).parent().parent();
            var depthIncButton = Gear.ElementEvents.create(depthIncButtonId);
            var depthDecButton = Gear.ElementEvents.create(depthDecButtonId);
            var twistEnabled = Gear.checkbox(twistCheckboxId);
            var scaleEnabled = Gear.checkbox(scaleCheckboxId);
            this.showCorners = Gear.checkbox(cornersCheckboxId);
            this.showCenters = Gear.checkbox(centersCheckboxId);
            var dragEnabled = canvas.mouseButons.map(function (_a) {
                var l = _a[0], m = _a[1], r = _a[2];
                return l || m || r;
            });
            var mousePos = Gear.Flow.from(canvas.mousePos.then(Gear.flowSwitch(dragEnabled)), canvas.touchPos.map(function (ps) { return ps[0]; })).then(Gear.defaultsTo([canvas.element.clientWidth / 2, canvas.element.clientHeight / 4]));
            this.twist = mousePos
                .map(function (_a) {
                var x = _a[0], y = _a[1];
                return Math.PI * (4 * x / canvas.element.clientWidth - 2);
            })
                .then(Gear.flowSwitch(twistEnabled));
            this.scale = mousePos
                .map(function (_a) {
                var x = _a[0], y = _a[1];
                return 2 - 4 * y / canvas.element.clientHeight;
            })
                .then(Gear.flowSwitch(scaleEnabled));
            ;
            this.depth = Gear.Flow.from(depthDecButton.click.map(function (e) { return -1; }), depthIncButton.click.map(function (e) { return 1; })).reduce(function (delta, depth) { return Math.min(Math.max(depth + delta, 1), 8); }, 5);
        }
        return Controller;
    }());
    GasketTwist2.Controller = Controller;
})(GasketTwist2 || (GasketTwist2 = {}));
/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
/// <reference path="model.ts" />
/// <reference path="view.ts" />
/// <reference path="controller.ts" />
var GasketTwist2;
/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
/// <reference path="model.ts" />
/// <reference path="view.ts" />
/// <reference path="controller.ts" />
(function (GasketTwist2) {
    function init() {
        window.onload = function (e) {
            var view = new GasketTwist2.View("canvas-gl", "division-depth", "twist", "scale");
            var controller = new GasketTwist2.Controller("canvas-gl", "input-corners", "input-centers", "input-twist", "input-scale", "division-inc", "division-dec");
            controller.depth.to(view.depth);
            controller.twist.to(view.twist);
            controller.scale.to(view.scale);
            controller.showCorners.to(view.showCorners);
            controller.showCenters.to(view.showCenters);
            GasketTwist2.sierpinski(controller.depth).to(view.sierpinsky);
        };
    }
    GasketTwist2.init = init;
})(GasketTwist2 || (GasketTwist2 = {}));
var WebGLLab;
(function (WebGLLab) {
    WebGLLab.samples = [
        {
            name: "Basic (Almost Empty)",
            vertexShader: vertexWrapper("\n                attribute vec2 vertex;\n\n                uniform float w;\n                \n                void main() {\n                    gl_Position = vec4(vertex, 0.0, w + 2.0);\n                }\n            "),
            fragmentShader: fragmentWrapper("\n                uniform vec3 color;\n\n                const vec3 one = vec3(1.0, 1.0, 1.0);\n\n                void main() {\n                    gl_FragColor = vec4((color + one) / 2.0, 1.0);\n                }\n            ")
        },
        {
            name: "3D Sinc (Vertex Shader Lighting)",
            vertexShader: 'file:sinc-vert-lighting.vert',
            fragmentShader: 'file:sinc-vert-lighting.frag'
        },
        {
            name: "3D Sinc (Fragment Shader Lighting)",
            vertexShader: 'file:sinc-frag-lighting.vert',
            fragmentShader: 'file:sinc-frag-lighting.frag'
        }
    ];
    function loadShaders(sample, consumer) {
        fetchShader(sample.vertexShader, function (shader) {
            sample.vertexShader = shader;
            if (!isFile(sample.fragmentShader)) {
                consumer(sample);
            }
        });
        fetchShader(sample.fragmentShader, function (shader) {
            sample.fragmentShader = shader;
            if (!isFile(sample.vertexShader)) {
                consumer(sample);
            }
        });
    }
    WebGLLab.loadShaders = loadShaders;
    function vertexWrapper(shader) {
        var header = trimMargin("\n            precision highp float;\n        ");
        return header + "\n\n" + trimMargin(shader);
    }
    function fragmentWrapper(shader) {
        var header = trimMargin("\n            #ifdef GL_ES\n            #ifdef GL_FRAGMENT_PRECISION_HIGH\n            precision highp float;\n            #else\n            precision mediump float;\n            #endif\n            #endif\n        ");
        return header + "\n\n" + trimMargin(shader);
    }
    function trimMargin(code) {
        var lines = code.split("\n");
        var margin = lines
            .map(function (line) { return line.search(/[^\s]/); })
            .filter(function (index) { return index >= 0; })
            .reduce(function (a, b) { return a < b ? a : b; });
        return lines
            .map(function (line) { return line.length > margin ? line.substring(margin) : line; })
            .reduce(function (a, b) { return a + "\n" + b; })
            .trim();
    }
    function fetchShader(shader, consumer) {
        if (isFile(shader)) {
            fetchFile(locationOf(shader), consumer);
        }
        else {
            consumer(shader);
        }
    }
    function fetchFile(url, consumer) {
        fetch(url, { method: "get", mode: "no-cors" }).then(function (response) { return response.text().then(consumer); });
    }
    function locationOf(str) {
        return "../shaders/" + str.substring('file:'.length);
    }
    function isFile(str) {
        return startsWith(str, 'file:');
    }
    function startsWith(str, s) {
        return str.substring(0, s.length) == s;
    }
})(WebGLLab || (WebGLLab = {}));
var WebGLLab;
(function (WebGLLab) {
    var View = /** @class */ (function () {
        function View(convasId, samples) {
            this.lod = 50;
            this.mode = WebGLRenderingContext.TRIANGLE_STRIP;
            this.cullingEnabled = false;
            setOptions("shader-sample", options(samples));
            this.context = new Djee.Context(convasId);
            this.buffer = this.context.newBuffer();
            this.defaultSample = samples[0];
        }
        Object.defineProperty(View.prototype, "mesh", {
            get: function () {
                var _this = this;
                return Gear.lazy(function () { return Gear.sinkFlow(function (flow) { return flow
                    .defaultsTo(false)
                    .then(Gear.choice(WebGLRenderingContext.LINE_STRIP, WebGLRenderingContext.TRIANGLE_STRIP))
                    .producer(function (mode) {
                    _this.mode = mode;
                    _this.draw();
                }); }); });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "levelOfDetail", {
            get: function () {
                var _this = this;
                return Gear.lazy(function () { return Gear.sinkFlow(function (flow) { return flow
                    .defaultsTo(_this.lod)
                    .filter(function (lod) { return lod > 0 && lod <= 100; })
                    .branch(function (flow) { return flow.to(Gear.sink(function (lod) { return _this.resetBuffer(lod); })); }, function (flow) { return flow.map(function (lod) { return (lod + 1000).toString().substring(1); }).to(Gear.text("lod")); }); }); });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "compiler", {
            get: function () {
                var _this = this;
                return Gear.lazy(function () { return Gear.sinkFlow(function (flow) { return flow
                    .defaultsTo(_this.defaultSample)
                    .map(function (shaders) { return _this.recompile(shaders); })
                    .map(function (program) { return _this.reflectOn(program); })
                    .map(function (reflection) { return _this.programScalars = _this.toScalars(reflection); })
                    .branch(function (flow) { return flow.producer(function (scalars) { return _this.draw(); }); }, function (flow) { return flow.producer(function (scalars) { return setOptions("mouse-x", __spreadArrays([noneOption()], options(scalars))); }); }, function (flow) { return flow.producer(function (scalars) { return setOptions("mouse-y", __spreadArrays([noneOption()], options(scalars))); }); }); }); });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "editor", {
            get: function () {
                var _this = this;
                return Gear.lazy(function () { return Gear.sinkFlow(function (flow) { return flow
                    .defaultsTo(_this.defaultSample)
                    .branch(function (flow) { return flow.map(function (template) { return template.vertexShader; }).to(Gear.writeableValue("vertex-shader")); }, function (flow) { return flow.map(function (template) { return template.fragmentShader; }).to(Gear.writeableValue("fragment-shader")); }); }); });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "xBinding", {
            get: function () {
                var _this = this;
                return Gear.lazy(function () { return Gear.sinkFlow(function (flow) { return flow
                    .defaultsTo(0)
                    .map(function (index) { return _this.xScalar = index >= 0 ? _this.programScalars[index] : null; })
                    .map(function (scalar) { return scalar != null ? round3(scalar.uniform.data[scalar.index]).toString() : ""; })
                    .to(Gear.text("mouse-x-val")); }); });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "yBinding", {
            get: function () {
                var _this = this;
                return Gear.lazy(function () { return Gear.sinkFlow(function (flow) { return flow
                    .defaultsTo(0)
                    .map(function (index) { return _this.yScalar = index >= 0 ? _this.programScalars[index] : null; })
                    .map(function (scalar) { return scalar != null ? round3(scalar.uniform.data[scalar.index]).toString() : ""; })
                    .to(Gear.text("mouse-y-val")); }); });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "xy", {
            get: function () {
                var _this = this;
                return Gear.lazy(function () { return Gear.sinkFlow(function (flow) { return flow.defaultsTo([0, 0]).producer(function (_a) {
                    var x = _a[0], y = _a[1];
                    _this.setValue("mouse-x-val", _this.xScalar, x);
                    _this.setValue("mouse-y-val", _this.yScalar, y);
                    _this.draw();
                }); }); });
            },
            enumerable: true,
            configurable: true
        });
        View.prototype.recompile = function (shaders) {
            try {
                if (this.program != null) {
                    this.program.delete();
                }
                this.program = this.context.link([
                    this.context.vertexShader(shaders.vertexShader),
                    this.context.fragmentShader(shaders.fragmentShader),
                ]);
                this.program.use();
                return this.program;
            }
            catch (e) {
                alert(e);
            }
        };
        View.prototype.setValue = function (boundElement, scalar, value) {
            if (scalar != null) {
                var data = scalar.uniform.data;
                data[scalar.index] = value;
                scalar.uniform.data = data;
                Gear.text(boundElement).consumer(round3(value).toString());
            }
            else {
                Gear.text(boundElement).consumer("");
            }
        };
        View.prototype.reflectOn = function (program) {
            return {
                program: program,
                attributes: program.attributes.filter(function (attribute) { return attribute.size == 1; }),
                uniforms: program.uniforms.filter(function (uniform) { return uniform.size == 1; })
            };
        };
        View.prototype.toScalars = function (reflection) {
            var result = [];
            for (var _i = 0, _a = reflection.attributes; _i < _a.length; _i++) {
                var attribute = _a[_i];
                var size = attribute.dimensions;
                var glAttribute = reflection.program.locateAttribute(attribute.name, size);
                glAttribute.pointTo(this.buffer, 4);
            }
            for (var _b = 0, _c = reflection.uniforms; _b < _c.length; _b++) {
                var uniform = _c[_b];
                var dimensions = uniform.dimensions;
                var glUniform = reflection.program.locateUniform(uniform.name, dimensions);
                var data = [];
                for (var j = 0; j < dimensions; j++) {
                    var scalar = {
                        uniform: glUniform,
                        index: j,
                        name: uniform.name + (dimensions > 1 ? "[" + j + "]" : "")
                    };
                    data.push(0);
                    result.push(scalar);
                }
                glUniform.data = data;
            }
            return result.sort(function (s1, s2) {
                var sizeComparison = s1.uniform.size - s2.uniform.size;
                return sizeComparison != 0 ? sizeComparison : s1.name.localeCompare(s2.name);
            });
        };
        View.prototype.resetBuffer = function (lod) {
            var data = [];
            for (var y = 0; y < lod; y++) {
                for (var x = 0; x <= lod; x++) {
                    data.push(2 * x / lod - 1.0, 2 * (y + 1) / lod - 1.0, 0, 1);
                    data.push(2 * x / lod - 1.0, 2 * y / lod - 1.0, 0, 1);
                }
            }
            this.lod = lod;
            this.buffer.data = data;
            this.draw();
        };
        View.prototype.draw = function () {
            if (this.program) {
                var gl = this.context.gl;
                gl.frontFace(gl.CCW);
                gl.cullFace(gl.BACK);
                gl.enable(gl.DEPTH_TEST);
                if (this.cullingEnabled) {
                    gl.enable(gl.CULL_FACE);
                }
                else {
                    gl.disable(gl.CULL_FACE);
                }
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                var rowVertexCount = 2 * (this.lod + 1);
                for (var y = 0; y < this.lod; y++) {
                    gl.drawArrays(this.mode, y * rowVertexCount, rowVertexCount);
                }
            }
        };
        return View;
    }());
    WebGLLab.View = View;
    function setOptions(elementId, options) {
        var element = document.getElementById(elementId);
        element.innerHTML = "";
        options.forEach(function (option) { return element.add(option); });
    }
    function options(values) {
        return values.map(function (value, i) { return new Option(value.name, i.toString()); });
    }
    function noneOption() {
        return new Option("NONE", "-1");
    }
    function round3(n) {
        return Math.round(n * 1000) / 1000;
    }
})(WebGLLab || (WebGLLab = {}));
var WebGLLab;
(function (WebGLLab) {
    var Controller = /** @class */ (function () {
        function Controller() {
        }
        Object.defineProperty(Controller.prototype, "program", {
            get: function () {
                return Gear.lazy(function () { return programFlow(); });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Controller.prototype, "mesh", {
            get: function () {
                return Gear.lazy(function () { return Gear.checkbox("mesh"); });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Controller.prototype, "levelOfDetails", {
            get: function () {
                return Gear.lazy(function () { return levelOfDetailsFlow(); });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Controller.prototype, "programSample", {
            get: function () {
                return Gear.lazy(function () { return programSampleFlow(); });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Controller.prototype, "mouseXBinding", {
            get: function () {
                return Gear.lazy(function () { return mouseXBindingFlow(); });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Controller.prototype, "mouseYBinding", {
            get: function () {
                return Gear.lazy(function () { return mouseYBindingFlow(); });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Controller.prototype, "mouseXY", {
            get: function () {
                return Gear.lazy(function () { return mouseXYFlow(); });
            },
            enumerable: true,
            configurable: true
        });
        return Controller;
    }());
    WebGLLab.Controller = Controller;
    function programFlow() {
        var compileBtn = Gear.ElementEvents.create("compile-button");
        return compileBtn.click.map(function (pos) { return program(); });
    }
    function program() {
        var vertexShaderElement = document.getElementById("vertex-shader");
        var fragmentShaderElement = document.getElementById("fragment-shader");
        return {
            name: "Program",
            vertexShader: vertexShaderElement.value,
            fragmentShader: fragmentShaderElement.value
        };
    }
    function levelOfDetailsFlow() {
        var inc = Gear.elementEvents("lod-inc").mouseButons
            .map(function (_a) {
            var l = _a[0], m = _a[1], r = _a[2];
            return l;
        })
            .map(function (pressed) { return pressed ? +1 : 0; });
        var dec = Gear.elementEvents("lod-dec").mouseButons
            .map(function (_a) {
            var l = _a[0], m = _a[1], r = _a[2];
            return l;
        })
            .map(function (pressed) { return pressed ? -1 : 0; });
        return Gear.Flow.from(inc, dec)
            .then(Gear.repeater(128, 0))
            .reduce(function (i, lod) { return clamp(lod + i, 0, 100); }, 50);
    }
    function programSampleFlow() {
        return Gear.readableValue("shader-sample")
            .map(function (value) { return parseInt(value); });
    }
    function mouseXBindingFlow() {
        return Gear.readableValue("mouse-x")
            .map(function (value) { return parseInt(value); });
    }
    function mouseYBindingFlow() {
        return Gear.readableValue("mouse-y")
            .map(function (value) { return parseInt(value); });
    }
    function mouseXYFlow() {
        var canvas = Gear.ElementEvents.create("canvas-gl");
        var dragEnabled = canvas.mouseButons.map(function (_a) {
            var l = _a[0], m = _a[1], r = _a[2];
            return l;
        }).then(Gear.defaultsTo(false));
        return Gear.Flow.from(canvas.mousePos.then(Gear.flowSwitch(dragEnabled)), canvas.touchPos.map(function (pos) { return pos[0]; })).map(function (_a) {
            var x = _a[0], y = _a[1];
            return [2 * x / canvas.element.clientWidth - 1, 1 - 2 * y / canvas.element.clientHeight];
        });
    }
    function clamp(n, min, max) {
        return n < min ? min : (n > max ? max : n);
    }
})(WebGLLab || (WebGLLab = {}));
/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
/// <reference path="samples.ts" />
/// <reference path="view.ts" />
/// <reference path="controller.ts" />
var WebGLLab;
/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
/// <reference path="samples.ts" />
/// <reference path="view.ts" />
/// <reference path="controller.ts" />
(function (WebGLLab) {
    function init() {
        window.onload = function (e) { return doInit(); };
    }
    WebGLLab.init = init;
    function doInit() {
        var controller = new WebGLLab.Controller();
        var view = new WebGLLab.View("canvas-gl", WebGLLab.samples);
        controller.levelOfDetails().to(view.levelOfDetail());
        controller.programSample()
            .map(function (index) { return WebGLLab.samples[index]; })
            .then(function (sample, consumer) { return WebGLLab.loadShaders(sample, consumer); })
            .to(view.editor());
        controller.program().to(view.compiler());
        controller.mesh().to(view.mesh());
        controller.mouseXBinding().to(view.xBinding());
        controller.mouseYBinding().to(view.yBinding());
        controller.mouseXY().to(view.xy());
    }
})(WebGLLab || (WebGLLab = {}));
//# sourceMappingURL=ghadeeras.js.map