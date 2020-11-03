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
        Program.prototype.locateUniform = function (name, size, matrix) {
            if (matrix === void 0) { matrix = false; }
            return new Djee.Uniform(this, name, size, matrix);
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
        function Uniform(program, name, size, matrix) {
            if (matrix === void 0) { matrix = false; }
            this.program = program;
            this.name = name;
            this.size = size;
            this.matrix = matrix;
            var gl = program.context.gl;
            this.location = gl.getUniformLocation(program.program, name);
            this.setter = this.getSetter(gl, size, matrix);
            this._data = new Array(matrix ? size * size : size);
        }
        Uniform.prototype.getSetter = function (gl, size, matrix) {
            var location = this.location;
            if (matrix) {
                switch (size) {
                    case 2: return function (d) { return gl.uniformMatrix2fv(location, false, d); };
                    case 3: return function (d) { return gl.uniformMatrix3fv(location, false, d); };
                    case 4: return function (d) { return gl.uniformMatrix4fv(location, false, d); };
                    default: throw "Uniform matrices of size '" + size + "' are not supported.";
                }
            }
            else {
                switch (size) {
                    case 1: return function (d) { return gl.uniform1fv(location, d); };
                    case 2: return function (d) { return gl.uniform2fv(location, d); };
                    case 3: return function (d) { return gl.uniform3fv(location, d); };
                    case 4: return function (d) { return gl.uniform4fv(location, d); };
                    default: throw "Uniform vectors of length '" + size + "' are not supported.";
                }
            }
        };
        Object.defineProperty(Uniform.prototype, "data", {
            get: function () {
                return Djee.copyOf(this._data);
            },
            set: function (data) {
                if (data.length != this._data.length) {
                    throw "Arrays of length '" + data.length + "' cannot be assigned to uniform " + (this.matrix ? 'matrix' : 'vector') + " '" + this.name + "' which has size '" + this.size + "'";
                }
                this.setter(new Float64Array(data));
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
                return this._data;
            },
            set: function (data) {
                this.bind(function (gl) {
                    return gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
                });
                this._data = data;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Buffer.prototype, "untypedData", {
            set: function (data) {
                this.data = new Float32Array(data);
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
        return array.slice();
    }
    Djee.copyOf = copyOf;
})(Djee || (Djee = {}));
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
            return this.through(Gear.defaultsTo(value), value);
        };
        Flow.prototype.then = function (effect, defaultValue) {
            if (defaultValue === void 0) { defaultValue = null; }
            var safeEffect = defaultValue != null ?
                function (value, resultConsumer) { return effect(value != null ? value : defaultValue, resultConsumer); } :
                function (value, resultConsumer) { return (value != null) ? effect(value, resultConsumer) : {}; };
            return this.through(safeEffect);
        };
        Flow.prototype.through = function (effect, defaultValue) {
            if (defaultValue === void 0) { defaultValue = null; }
            var newOutput = new Gear.Value(defaultValue);
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
            this.lazyMouseDown = Gear.lazy(function () { return _this.newMouseDown(); });
            this.lazyMouseUp = Gear.lazy(function () { return _this.newMouseUp(); });
            this.lazyMouseMove = Gear.lazy(function () { return _this.newMouseMove(); });
            this.lazyTouchStart = Gear.lazy(function () { return _this.newTouchStart(); });
            this.lazyTouchEnd = Gear.lazy(function () { return _this.newTouchEnd(); });
            this.lazyTouchMove = Gear.lazy(function () { return _this.newTouchMove(); });
            this.lazyClickPos = Gear.lazy(function () { return _this.newClickPos(); });
            this.lazyTouchStartPos = Gear.lazy(function () { return _this.newTouchStartPos(); });
            this.lazyMousePos = Gear.lazy(function () { return _this.newMousePos(); });
            this.lazyTouchPos = Gear.lazy(function () { return _this.newTouchPos(); });
            this.lazyDragging = Gear.lazy(function () { return _this.newDragging(); });
            this.lazyMouseButtons = Gear.lazy(function () { return _this.newMouseButtons(); });
        }
        ElementEvents.prototype.parent = function () {
            return new ElementEvents(this.element.parentElement);
        };
        Object.defineProperty(ElementEvents.prototype, "center", {
            get: function () {
                return [this.element.clientWidth / 2, this.element.clientHeight / 2];
            },
            enumerable: true,
            configurable: true
        });
        ElementEvents.prototype.newClick = function () {
            var value = new Gear.Value();
            this.element.onclick = function (e) {
                value.value = e;
                e.preventDefault();
            };
            return value.flow();
        };
        ElementEvents.prototype.newMouseDown = function () {
            var value = new Gear.Value();
            this.element.onmousedown = function (e) {
                value.value = e;
                e.preventDefault();
            };
            return value.flow();
        };
        ElementEvents.prototype.newMouseUp = function () {
            var value = new Gear.Value();
            this.element.onmouseup = function (e) {
                value.value = e;
                e.preventDefault();
            };
            return value.flow();
        };
        ElementEvents.prototype.newMouseMove = function () {
            var value = new Gear.Value();
            this.element.onmousemove = function (e) {
                value.value = e;
                e.preventDefault();
            };
            return value.flow();
        };
        ElementEvents.prototype.newTouchStart = function () {
            var value = new Gear.Value();
            this.element.ontouchstart = function (e) {
                e.preventDefault();
                value.value = e;
            };
            return value.flow();
        };
        ElementEvents.prototype.newTouchEnd = function () {
            var value = new Gear.Value();
            this.element.ontouchend = this.element.ontouchcancel = function (e) {
                e.preventDefault();
                value.value = e;
            };
            return value.flow();
        };
        ElementEvents.prototype.newTouchMove = function () {
            var value = new Gear.Value();
            this.element.ontouchmove = function (e) {
                e.preventDefault();
                value.value = e;
            };
            return value.flow();
        };
        ElementEvents.prototype.newClickPos = function () {
            var _this = this;
            return this.click
                .map(function (e) { return _this.relativePos(e); })
                .defaultsTo(this.center);
        };
        ElementEvents.prototype.newTouchStartPos = function () {
            var _this = this;
            return this.touchStart
                .map(function (e) { return _this.touchesToPositions(e); })
                .defaultsTo([]);
        };
        ElementEvents.prototype.newMousePos = function () {
            var _this = this;
            return this.mouseMove
                .map(function (e) { return _this.relativePos(e); })
                .defaultsTo(this.center);
        };
        ElementEvents.prototype.newTouchPos = function () {
            var _this = this;
            return this.touchMove
                .map(function (e) { return _this.touchesToPositions(e); })
                .defaultsTo([]);
        };
        ElementEvents.prototype.touchesToPositions = function (e) {
            var touches = new Array(e.touches.length);
            for (var i = 0; i < e.touches.length; i++) {
                touches[i] = this.relativePos(e.touches.item(i));
            }
            return touches;
        };
        ElementEvents.prototype.newDragging = function () {
            var _this = this;
            var dragging = {
                startPos: [0, 0],
                pos: [0, 0],
                start: false,
                end: true,
                shift: false,
                ctrl: false,
                alt: false
            };
            return Gear.Flow.from(this.touchStart.filter(this.oneTouch()).map(function (e) { return _this.startDragging(dragging, e, e.touches[0]); }), this.mouseDown.map(function (e) { return _this.startDragging(dragging, e, e); }), this.touchMove.filter(this.oneTouch()).map(function (e) { return _this.drag(dragging, e.touches[0]); }), this.mouseMove.filter(function (e) { return (e.buttons & 1) != 0; }).map(function (e) { return _this.drag(dragging, e); }), this.touchEnd.map(function (e) { return _this.doEndDragging(dragging, dragging.pos); }), Gear.Flow.from(this.mouseUp, this.mouseMove.filter(function (e) { return (e.buttons & 1) == 0 && !dragging.end; })).map(function (e) { return _this.endDragging(dragging, e); })).defaultsTo(__assign({}, dragging));
        };
        ElementEvents.prototype.oneTouch = function () {
            return function (e) { return e.touches.length == 1; };
        };
        ElementEvents.prototype.startDragging = function (dragging, e, p) {
            dragging.startPos = dragging.pos = this.relativePos(p);
            dragging.start = true;
            dragging.end = false;
            dragging.shift = e.shiftKey;
            dragging.ctrl = e.ctrlKey;
            dragging.alt = e.altKey;
            return __assign({}, dragging);
        };
        ElementEvents.prototype.drag = function (dragging, p) {
            dragging.pos = this.relativePos(p);
            dragging.start = false;
            dragging.end = false;
            return __assign({}, dragging);
        };
        ElementEvents.prototype.endDragging = function (dragging, p) {
            return this.doEndDragging(dragging, this.relativePos(p));
        };
        ElementEvents.prototype.doEndDragging = function (dragging, pos) {
            dragging.pos = pos;
            dragging.start = false;
            dragging.end = true;
            return __assign({}, dragging);
        };
        ElementEvents.prototype.relativePos = function (p) {
            var pointerPos = pos(p.pageX, p.pageY);
            return sub(pointerPos, this.elementPos);
        };
        ElementEvents.prototype.newMouseButtons = function () {
            var initialValue = [false, false, false];
            return Gear.Flow.from(this.mouseDown.map(function (e) { return [e.button, true]; }), this.mouseUp.map(function (e) { return [e.button, false]; })).reduce(function (_a, buttons) {
                var button = _a[0], down = _a[1];
                return updatedButtons(buttons, button, down);
            }, initialValue);
        };
        Object.defineProperty(ElementEvents.prototype, "click", {
            get: function () {
                return this.lazyClick();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ElementEvents.prototype, "mouseDown", {
            get: function () {
                return this.lazyMouseDown();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ElementEvents.prototype, "mouseUp", {
            get: function () {
                return this.lazyMouseUp();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ElementEvents.prototype, "mouseMove", {
            get: function () {
                return this.lazyMouseMove();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ElementEvents.prototype, "touchStart", {
            get: function () {
                return this.lazyTouchStart();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ElementEvents.prototype, "touchEnd", {
            get: function () {
                return this.lazyTouchEnd();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ElementEvents.prototype, "touchMove", {
            get: function () {
                return this.lazyTouchMove();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ElementEvents.prototype, "clickPos", {
            get: function () {
                return this.lazyClickPos();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ElementEvents.prototype, "touchStartPos", {
            get: function () {
                return this.lazyTouchStartPos();
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
        Object.defineProperty(ElementEvents.prototype, "dragging", {
            get: function () {
                return this.lazyDragging();
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
/// <reference path="effects.ts" />
/// <reference path="ui-input.ts" />
/// <reference path="ui-output.ts" />
var Gear;
/// <reference path="lazy.ts" />
/// <reference path="call.ts" />
/// <reference path="flow.ts" />
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
    function load(path, onready) {
        var files = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            files[_i - 2] = arguments[_i];
        }
        var remaining = [files.length];
        var _loop_1 = function (file, consumer) {
            fetchFile(path + "/" + file, function (content) {
                consumer(content);
                remaining[0]--;
                if (remaining[0] <= 0) {
                    onready();
                }
            });
        };
        for (var _a = 0, files_1 = files; _a < files_1.length; _a++) {
            var _b = files_1[_a], file = _b[0], consumer = _b[1];
            _loop_1(file, consumer);
        }
    }
    Gear.load = load;
    function fetchFile(url, consumer) {
        fetch(url, { method: "get", mode: "no-cors" }).then(function (response) { return response.text().then(consumer); });
    }
})(Gear || (Gear = {}));
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
        Vector.prototype.withDims = function (n) {
            if (this.coordinates.length == n) {
                return this;
            }
            var result = new Array(n);
            for (var i = 0; i < n; i++) {
                result[i] = this.coordinates[i] || 0;
            }
            return new Vector(result);
        };
        Vector.prototype.swizzle = function () {
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
            var v1 = this.withDims(3).coordinates;
            var v2 = v.withDims(3).coordinates;
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
        Vector.prototype.prod = function (matrix) {
            var _this = this;
            return new Vector(matrix.columns.map(function (column) { return _this.dot(column); }));
        };
        Vector.prototype.component = function (i) {
            return new Vector(this.coordinates.map(function (c, j) { return i == j ? c : 0; }));
        };
        return Vector;
    }());
    Space.Vector = Vector;
})(Space || (Space = {}));
var Space;
(function (Space) {
    var Matrix = /** @class */ (function () {
        function Matrix(columns) {
            var _this = this;
            this.columnsCount = columns.length;
            this.rowsCount = columns.map(function (column) { return column.coordinates.length; }).reduce(function (a, b) { return a > b ? a : b; }, 0);
            this.columns = columns.map(function (column) { return column.withDims(_this.rowsCount); });
        }
        Object.defineProperty(Matrix.prototype, "transposed", {
            get: function () {
                var rows = new Array(this.rowsCount);
                var _loop_2 = function (i) {
                    rows[i] = new Space.Vector(this_1.columns.map(function (column) { return column.coordinates[i]; }));
                };
                var this_1 = this;
                for (var i = 0; i < this.rowsCount; i++) {
                    _loop_2(i);
                }
                return new Matrix(rows);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Matrix.prototype, "determinant", {
            get: function () {
                var _this = this;
                if (this.rowsCount != this.columnsCount) {
                    return 0;
                }
                if (this.columnsCount == 1) {
                    return this.columns[0].coordinates[0];
                }
                return this.columns[0].coordinates.map(function (v, i) { return Matrix.sign(i) * v * _this.sub(0, i).determinant; }).reduce(function (v1, v2) { return v1 + v2; });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Matrix.prototype, "inverse", {
            get: function () {
                var _this = this;
                var d = this.determinant;
                return new Matrix(this.columns.map(function (column, c) { return new Space.Vector(column.coordinates.map(function (coordinate, r) { return Matrix.sign(c + r) * _this.sub(c, r).determinant / d; })); })).transposed;
            },
            enumerable: true,
            configurable: true
        });
        Matrix.sign = function (i) {
            return (i % 2 == 0) ? 1 : -1;
        };
        Matrix.prototype.sub = function (columnIndex, rowIndex) {
            var columns = [];
            for (var c = 0; c < this.columnsCount; c++) {
                if (c == columnIndex) {
                    continue;
                }
                var coordinates = [];
                var column = this.columns[c];
                for (var r = 0; r < this.rowsCount; r++) {
                    if (r == rowIndex) {
                        continue;
                    }
                    coordinates.push(column.coordinates[r]);
                }
                columns.push(new Space.Vector(coordinates));
            }
            return new Matrix(columns);
        };
        Matrix.prototype.prod = function (vector) {
            var m = this.transposed;
            return vector.prod(m);
        };
        Matrix.prototype.by = function (matrix) {
            var m = this.transposed;
            return new Matrix(matrix.columns.map(function (column) { return column.prod(m); }));
        };
        Object.defineProperty(Matrix.prototype, "asColumnMajorArray", {
            get: function () {
                var result = new Array(this.rowsCount * this.columnsCount);
                var index = 0;
                for (var i = 0; i < this.columnsCount; i++) {
                    for (var j = 0; j < this.rowsCount; j++) {
                        result[index] = this.columns[i].coordinates[j];
                        index++;
                    }
                }
                return result;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Matrix.prototype, "asRowMajorArray", {
            get: function () {
                return this.transposed.asColumnMajorArray;
            },
            enumerable: true,
            configurable: true
        });
        Matrix.identity = function () {
            return this.scaling(1, 1, 1);
        };
        Matrix.scaling = function (sx, sy, sz) {
            return Space.mat(Space.vec(sx, 0, 0, 0), Space.vec(0, sy, 0, 0), Space.vec(0, 0, sz, 0), Space.vec(0, 0, 0, 1));
        };
        Matrix.translation = function (tx, ty, tz) {
            return Space.mat(Space.vec(1, 0, 0, 0), Space.vec(0, 1, 0, 0), Space.vec(0, 0, 1, 0), Space.vec(tx, ty, tz, 1));
        };
        Matrix.rotation = function (angle, axis) {
            var a = axis.withDims(3).unit;
            var cos = Math.cos(angle);
            var sin = Math.sin(angle);
            var oneMinusCos = 1 - cos;
            var _a = a.coordinates, x = _a[0], y = _a[1], z = _a[2];
            var _b = [x * x, y * y, z * z, x * y, y * z, z * x], xx = _b[0], yy = _b[1], zz = _b[2], xy = _b[3], yz = _b[4], zx = _b[5];
            return Space.mat(Space.vec(xx * oneMinusCos + cos, xy * oneMinusCos + z * sin, zx * oneMinusCos - y * sin, 0), Space.vec(xy * oneMinusCos - z * sin, yy * oneMinusCos + cos, yz * oneMinusCos + x * sin, 0), Space.vec(zx * oneMinusCos + y * sin, yz * oneMinusCos - x * sin, zz * oneMinusCos + cos, 0), Space.vec(0, 0, 0, 1));
        };
        Matrix.view = function (direction, up) {
            var z = direction.withDims(3).scale(-1).unit;
            var x = up.withDims(3).cross(z).unit;
            var y = z.cross(x).unit;
            return Space.mat(x, y, z, Space.vec(0, 0, 0, 1)).transposed;
        };
        Matrix.globalView = function (eyePos, objPos, up) {
            var direction = objPos.minus(eyePos);
            return Matrix.view(direction, up).by(Matrix.translation(-eyePos.coordinates[0], -eyePos.coordinates[1], -eyePos.coordinates[2]));
        };
        Matrix.project = function (focalRatio, horizon, aspectRatio) {
            if (aspectRatio === void 0) { aspectRatio = 1; }
            var focalLength = 2 * focalRatio;
            var range = focalLength - horizon;
            return Space.mat(Space.vec(focalLength / aspectRatio, 0, 0, 0), Space.vec(0, focalLength, 0, 0), Space.vec(0, 0, (focalLength + horizon) / range, -1), Space.vec(0, 0, 2 * focalLength * horizon / range, 0));
        };
        return Matrix;
    }());
    Space.Matrix = Matrix;
    var MatrixStack = /** @class */ (function () {
        function MatrixStack() {
            this._matrix = Matrix.identity();
        }
        MatrixStack.prototype.apply = function (matrix) {
            return this._matrix = this._matrix.by(matrix);
        };
        MatrixStack.prototype.push = function () {
            this.stack.push(this._matrix);
        };
        MatrixStack.prototype.pop = function () {
            this._matrix = this.stack.pop();
        };
        Object.defineProperty(MatrixStack.prototype, "matrix", {
            get: function () {
                return this._matrix;
            },
            enumerable: true,
            configurable: true
        });
        return MatrixStack;
    }());
    Space.MatrixStack = MatrixStack;
})(Space || (Space = {}));
var Space;
(function (Space) {
    var WA;
    (function (WA) {
        function module(sourceFile, caster) {
            return {
                sourceFile: sourceFile,
                caster: caster
            };
        }
        WA.module = module;
        function load(modules, first) {
            var rest = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                rest[_i - 2] = arguments[_i];
            }
            var firstModule = modules[first];
            var result = fetch("/wa/" + firstModule.sourceFile, { method: "get", mode: "no-cors" })
                .then(function (response) { return response.arrayBuffer(); })
                .then(function (buffer) { return WebAssembly.instantiate(buffer, asImports(modules)); })
                .then(function (waModule) { return firstModule.exports = firstModule.caster(waModule.instance.exports); })
                .then(function () { return modules; });
            return rest.length == 0 ? result : result.then(function (modules) { return load.apply(void 0, __spreadArrays([modules, rest[0]], rest.slice(1))); });
        }
        WA.load = load;
        function asImports(modules) {
            var imports = {};
            for (var key in modules) {
                imports[key] = modules[key].exports || {};
            }
            return imports;
        }
    })(WA = Space.WA || (Space.WA = {}));
})(Space || (Space = {}));
/// <reference path="vector.ts" />
/// <reference path="matrix.ts" />
/// <reference path="wa.ts" />
var Space;
/// <reference path="vector.ts" />
/// <reference path="matrix.ts" />
/// <reference path="wa.ts" />
(function (Space) {
    function vec() {
        var coordinates = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            coordinates[_i] = arguments[_i];
        }
        return new Space.Vector(coordinates);
    }
    Space.vec = vec;
    function mat() {
        var columns = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            columns[_i] = arguments[_i];
        }
        return new Space.Matrix(columns);
    }
    Space.mat = mat;
    Space.modules = {
        stack: Space.WA.module("stack.wasm", function (exports) { return exports; }),
        space: Space.WA.module("space.wasm", function (exports) { return exports; }),
        scalarField: Space.WA.module("scalarField.wasm", function (exports) { return exports; }),
    };
    function initWaModules(onready) {
        Space.WA.load(Space.modules, "stack", "space", "scalarField").then(function () { return onready(); });
    }
    Space.initWaModules = initWaModules;
})(Space || (Space = {}));
/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
var Mandelbrot;
/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
(function (Mandelbrot) {
    var audioContext = new window.AudioContext({ sampleRate: 9450 });
    var audioBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 3, audioContext.sampleRate);
    var center = Space.vec(-0.75, 0);
    var scale = 2;
    var vertexShaderCode;
    var fragmentShaderCode;
    var mouseBindingElement;
    var canvas;
    var mandelbrotView;
    var juliaView;
    var centerSpan;
    var scaleSpan;
    var hueSpan;
    var saturationSpan;
    var intensitySpan;
    var paletteSpan;
    var clickPosSpan;
    function init() {
        window.onload = function () { return Gear.load("/shaders", function () { return Space.initWaModules(function () { return doInit(); }); }, ["mandelbrot.vert", function (shader) { return vertexShaderCode = shader; }], ["mandelbrot.frag", function (shader) { return fragmentShaderCode = shader; }]); };
    }
    Mandelbrot.init = init;
    function doInit() {
        mouseBindingElement = document.getElementById("mouse-binding");
        mouseBindingElement.onkeypress = function (e) {
            e.preventDefault();
        };
        window.onkeypress = function (e) {
            var key = e.key.toUpperCase();
            var act = action(key);
            if (act != null) {
                mouseBindingElement.value = act;
            }
        };
        mandelbrotView = new Mandelbrot.View(false, "canvas-gl", vertexShaderCode, fragmentShaderCode, center, scale);
        juliaView = new Mandelbrot.View(true, "julia-gl", vertexShaderCode, fragmentShaderCode, Space.vec(0, 0), 4);
        centerSpan = Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(center)
            .map(function (pos) { return pos.coordinates.map(function (c) { return c.toPrecision(3); }); })
            .map(function (pos) { return "( " + pos[0] + ", " + pos[1] + ")"; })
            .to(Gear.text("center")); });
        scaleSpan = Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(scale)
            .map(function (s) { return s.toPrecision(3).toString(); })
            .to(Gear.text("scale")); });
        hueSpan = Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(mandelbrotView.hue)
            .map(function (h) { return h.toPrecision(3).toString(); })
            .to(Gear.text("hue")); });
        saturationSpan = Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(mandelbrotView.saturation)
            .map(function (s) { return s.toPrecision(3).toString(); })
            .to(Gear.text("saturation")); });
        intensitySpan = Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(mandelbrotView.intensity)
            .map(function (i) { return i.toPrecision(3).toString(); })
            .to(Gear.text("intensity")); });
        paletteSpan = Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(mandelbrotView.palette)
            .map(function (s) { return s.toPrecision(3).toString(); })
            .to(Gear.text("palette")); });
        clickPosSpan = Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(center)
            .map(function (pos) { return pos.coordinates.map(function (c) { return c.toPrecision(9); }); })
            .map(function (pos) { return "(" + pos[0] + ", " + pos[1] + ")"; })
            .to(Gear.text("clickPos")); });
        canvas = Gear.ElementEvents.create("canvas-gl");
        canvas.dragging.branch(function (flow) { return flow.filter(selected("move")).producer(function (d) { return move(d); }); }, function (flow) { return flow.filter(selected("zoom")).producer(function (d) { return zoom(d); }); }, function (flow) { return flow.filter(selected("color")).producer(function (d) { return colorize(d); }); }, function (flow) { return flow.filter(selected("intensity")).producer(function (d) { return intensity(d); }); }, function (flow) { return flow.filter(selected("palette")).producer(function (d) { return palette(d); }); }, function (flow) { return flow.filter(selected("julia")).producer(function (d) { return julia(d); }); });
        Gear.Flow.from(canvas.clickPos, canvas.touchStartPos.map(function (ps) { return ps[0]; }))
            .map(function (pos) { return toComplexNumber(pos); })
            .branch(function (flow) { return flow.to(clickPosSpan); })
            .filter(selected("music"))
            .producer(function (c) { return play(c); });
    }
    function play(c) {
        var channel1 = audioBuffer.getChannelData(0);
        var channel2 = audioBuffer.getChannelData(1);
        var sum1 = 0;
        var sum2 = 0;
        var z = Space.vec(0, 0);
        for (var i = 0; i < audioBuffer.length && z.length < 2.0; i++) {
            var _a = z.coordinates, x = _a[0], y = _a[1];
            z = Space.vec(x * x - y * y, 2 * x * y).plus(c);
            channel1[i] = z.coordinates[0] / 2;
            channel2[i] = z.coordinates[1] / 2;
            sum1 += channel1[i];
            sum2 += channel2[i];
        }
        if (z.length < 2.0) {
            var avg1 = sum1 / channel1.length;
            var avg2 = sum2 / channel2.length;
            for (var i = 0; i < audioBuffer.length; i++) {
                var attenuation = Math.pow(1 - i / audioBuffer.length, 2);
                channel1[i] = attenuation * (channel1[i] - avg1);
                channel2[i] = attenuation * (channel2[i] - avg2);
            }
            playBuffer();
        }
    }
    function playBuffer() {
        var source = audioContext.createBufferSource();
        source.channelCount = 2;
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
    }
    function toComplexNumber(pos) {
        return toVector(pos)
            .scale(scale)
            .plus(center);
    }
    function toVector(pos) {
        return Space.vec.apply(Space, pos).divide(Space.vec(canvas.element.clientWidth / 2, -canvas.element.clientHeight / 2))
            .plus(Space.vec(-1, 1));
    }
    function action(key) {
        switch (key.toUpperCase()) {
            case "M": return "move";
            case "Z": return "zoom";
            case "C": return "color";
            case "I": return "intensity";
            case "P": return "palette";
            case "J": return "julia";
            case "N": return "music";
            default: return null;
        }
    }
    function selected(value) {
        return function () { return mouseBindingElement.value == value; };
    }
    function zoom(dragging) {
        var delta = calculateDelta(dragging.startPos, dragging.pos);
        var power = -delta.coordinates[1];
        if (power != 0) {
            var centerToStart = calculateDelta(canvas.center, dragging.startPos, scale);
            var factor = Math.pow(16, power);
            var newScale = scale * factor;
            var newCenter = center.plus(centerToStart.scale(1 - factor));
            if (dragging.end) {
                scale = newScale;
                center = newCenter;
            }
            mandelbrotView.scale = newScale;
            mandelbrotView.center = newCenter;
            scaleSpan.consumer(newScale);
            centerSpan.consumer(newCenter);
        }
    }
    function move(dragging) {
        var delta = calculateDelta(dragging.startPos, dragging.pos, scale);
        if (delta.length > 0) {
            var newCenter = center.minus(delta)
                .combine(Space.vec(+4, +4), Math.min)
                .combine(Space.vec(-4, -4), Math.max);
            if (dragging.end) {
                center = newCenter;
            }
            mandelbrotView.center = newCenter;
            centerSpan.consumer(newCenter);
        }
    }
    function colorize(dragging) {
        var hue = 2 * dragging.pos[0] / canvas.element.clientWidth;
        var saturation = 1 - dragging.pos[1] / canvas.element.clientHeight;
        mandelbrotView.setColor(hue, saturation);
        juliaView.setColor(hue, saturation);
        hueSpan.consumer(hue);
        saturationSpan.consumer(saturation);
    }
    function intensity(dragging) {
        var intensity = 1 - dragging.pos[1] / canvas.element.clientWidth;
        mandelbrotView.intensity = intensity;
        juliaView.intensity = intensity;
        intensitySpan.consumer(intensity);
    }
    function palette(dragging) {
        var p = 1.5 - 2 * dragging.pos[1] / canvas.element.clientWidth;
        var palette = p > 1 ? 1 : p < 0 ? 0 : p;
        mandelbrotView.palette = palette;
        juliaView.palette = palette;
        paletteSpan.consumer(palette);
    }
    function julia(dragging) {
        var complexNumber = toComplexNumber(dragging.pos);
        juliaView.juliaNumber = complexNumber;
    }
    function calculateDelta(pos1, pos2, scale) {
        if (scale === void 0) { scale = 1; }
        return Space.vec.apply(Space, pos2).minus(Space.vec.apply(Space, pos1))
            .scale(2 * scale)
            .divide(Space.vec(canvas.element.clientWidth, -canvas.element.clientHeight));
    }
})(Mandelbrot || (Mandelbrot = {}));
var Mandelbrot;
(function (Mandelbrot) {
    var View = /** @class */ (function () {
        function View(julia, _canvasId, _vertexShaderCode, _fragmentShaderCode, _center, _scale) {
            var _this = this;
            if (_center === void 0) { _center = Space.vec(-0.75, 0); }
            if (_scale === void 0) { _scale = 2.0; }
            this.julia = julia;
            this.drawCall = new Gear.Call(function () { return _this.doDraw(); });
            this.context = new Djee.Context(_canvasId);
            var program = this.context.link([
                this.context.vertexShader(_vertexShaderCode),
                this.context.fragmentShader(_fragmentShaderCode)
            ]);
            program.use();
            var buffer = this.context.newBuffer();
            buffer.untypedData = [
                -1, -1,
                +1, -1,
                -1, +1,
                +1, +1,
            ];
            var vertex = program.locateAttribute("vertex", 2);
            vertex.pointTo(buffer);
            this.uniformColor = program.locateUniform("color", 2);
            this.uniformIntensity = program.locateUniform("intensity", 1);
            this.uniformPalette = program.locateUniform("palette", 1);
            this.uniformCenter = program.locateUniform("center", 2);
            this.uniformScale = program.locateUniform("scale", 1);
            this.uniformJuliaNumber = program.locateUniform("juliaNumber", 3);
            this.hue = 5 / 4;
            this.saturation = Math.sqrt(2) / 2;
            this.intensity = 0.5;
            this.palette = 0;
            this.center = _center;
            this.scale = _scale;
            this.juliaNumber = Space.vec(0, 0, 0);
        }
        Object.defineProperty(View.prototype, "center", {
            get: function () {
                return Space.vec.apply(Space, this.uniformCenter.data);
            },
            set: function (c) {
                this.uniformCenter.data = c.coordinates;
                this.draw();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "scale", {
            get: function () {
                return this.uniformScale.data[0];
            },
            set: function (s) {
                this.uniformScale.data = [s];
                this.draw();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "hue", {
            get: function () {
                return this.uniformColor.data[0];
            },
            set: function (h) {
                this.setColor(h, this.saturation);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "saturation", {
            get: function () {
                return this.uniformColor.data[1];
            },
            set: function (s) {
                this.setColor(this.hue, s);
            },
            enumerable: true,
            configurable: true
        });
        View.prototype.setColor = function (h, s) {
            this.uniformColor.data = [h, s];
            this.draw();
        };
        Object.defineProperty(View.prototype, "intensity", {
            get: function () {
                return this.uniformIntensity.data[0];
            },
            set: function (i) {
                this.uniformIntensity.data = [i];
                this.draw();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "palette", {
            get: function () {
                return this.uniformPalette.data[0];
            },
            set: function (p) {
                this.uniformPalette.data = [p];
                this.draw();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(View.prototype, "juliaNumber", {
            get: function () {
                return Space.vec.apply(Space, this.uniformJuliaNumber.data);
            },
            set: function (j) {
                this.uniformJuliaNumber.data = __spreadArrays(j.swizzle(0, 1).coordinates, [this.julia ? 1 : 0]);
                this.draw();
            },
            enumerable: true,
            configurable: true
        });
        View.prototype.draw = function () {
            this.drawCall.later();
        };
        View.prototype.doDraw = function () {
            var gl = this.context.gl;
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };
        return View;
    }());
    Mandelbrot.View = View;
})(Mandelbrot || (Mandelbrot = {}));
var ScalarField;
(function (ScalarField) {
    var vertexShaderCode;
    var fragmentShaderCode;
    var context;
    var position;
    var normal;
    var color;
    var matModel;
    var lightPosition;
    var shininess;
    var fogginess;
    var tetrahedronBuffer;
    var contourSurfaceBuffer;
    var contourColorBuffer;
    var tetrahedron = newTetrahedron(1, -1, -1, -1);
    var contourValue = 0;
    function initTetrahedronDemo() {
        window.onload = function () { return Gear.load("/shaders", function () { return Space.initWaModules(function () { return doInit(); }); }, ["vertexColors.vert", function (shader) { return vertexShaderCode = shader; }], ["vertexColors.frag", function (shader) { return fragmentShaderCode = shader; }]); };
    }
    ScalarField.initTetrahedronDemo = initTetrahedronDemo;
    function doInit() {
        context = new Djee.Context("canvas-gl");
        var program = context.link([
            context.vertexShader(vertexShaderCode),
            context.fragmentShader(fragmentShaderCode)
        ]);
        program.use();
        tetrahedronBuffer = context.newBuffer();
        contourSurfaceBuffer = context.newBuffer();
        contourColorBuffer = context.newBuffer();
        position = program.locateAttribute("position", 3);
        normal = program.locateAttribute("normal", 3);
        color = program.locateAttribute("color", 4);
        matModel = program.locateUniform("matModel", 4, true);
        var matView = program.locateUniform("matView", 4, true);
        var matProjection = program.locateUniform("matProjection", 4, true);
        lightPosition = program.locateUniform("lightPosition", 3);
        shininess = program.locateUniform("shininess", 1);
        fogginess = program.locateUniform("fogginess", 1);
        matModel.data = Space.Matrix.identity().asColumnMajorArray;
        matView.data = Space.Matrix.globalView(Space.vec(-2, 2, 5), Space.vec(0, 0, 0), Space.vec(0, 1, 0)).asColumnMajorArray;
        matProjection.data = Space.Matrix.project(2, 100, 1).asColumnMajorArray;
        lightPosition.data = [2, 2, 2];
        shininess.data = [1];
        fogginess.data = [0];
        var gl = context.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(1, 1, 1, 1);
        var canvas = Gear.elementEvents("canvas-gl");
        var mouseButtonPressed = canvas.mouseButons.map(function (_a) {
            var l = _a[0], m = _a[1], r = _a[2];
            return l;
        });
        Gear.Flow.from(canvas.mousePos.then(Gear.flowSwitch(mouseButtonPressed)), canvas.touchPos.map(function (positions) { return positions[0]; })).map(function (_a) {
            var x = _a[0], y = _a[1];
            return [
                2 * (x - canvas.element.clientWidth / 2) / canvas.element.clientWidth,
                2 * (canvas.element.clientHeight / 2 - y) / canvas.element.clientHeight
            ];
        }).branch(function (flow) { return flow.filter(selected("rotation")).to(rotationSink()); }, function (flow) { return flow.filter(selected("lightPosition")).to(lightPositionSink()); }, function (flow) { return flow.filter(selected("contourValue")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return y;
        }).to(contourValueSink()); }, function (flow) { return Gear.Flow.from(flow.filter(selected("value0")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return newTetrahedron(y, tetrahedron.value1, tetrahedron.value2, tetrahedron.value3);
        }), flow.filter(selected("value1")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return newTetrahedron(tetrahedron.value0, y, tetrahedron.value2, tetrahedron.value3);
        }), flow.filter(selected("value2")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return newTetrahedron(tetrahedron.value0, tetrahedron.value1, y, tetrahedron.value3);
        }), flow.filter(selected("value3")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return newTetrahedron(tetrahedron.value0, tetrahedron.value1, tetrahedron.value2, y);
        })).to(tetrahedronSink()); });
    }
    function tetrahedronSink() {
        return Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(newTetrahedron(1, -1, -1, -1))
            .producer(function (newTetrahedron) {
            tetrahedron = newTetrahedron;
            tetrahedronBuffer.untypedData = tetrahedronData(tetrahedron);
            contourSurfaceBuffer.untypedData = contourSurfaceData(tetrahedron, contourValue);
            contourColorBuffer.untypedData = contourColorData(contourValue, contourSurfaceBuffer.data.length / 6);
            draw();
        }); });
    }
    function contourValueSink() {
        return Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(0)
            .producer(function (newContourValue) {
            contourValue = newContourValue;
            contourSurfaceBuffer.untypedData = contourSurfaceData(tetrahedron, contourValue);
            contourColorBuffer.untypedData = contourColorData(contourValue, contourSurfaceBuffer.data.length / 6);
            draw();
        }); });
    }
    function rotationSink() {
        var axisX = Space.vec(1, 0, 0);
        var axisY = Space.vec(0, 1, 0);
        return Gear.sinkFlow(function (flow) { return flow.defaultsTo([0, 0]).producer(function (_a) {
            var x = _a[0], y = _a[1];
            matModel.data =
                Space.Matrix.rotation(y * Math.PI, axisX)
                    .by(Space.Matrix.rotation(x * Math.PI, axisY))
                    .asColumnMajorArray;
            draw();
        }); });
    }
    function lightPositionSink() {
        return Gear.sinkFlow(function (flow) { return flow
            .defaultsTo([0.5, 0.5])
            .map(function (_a) {
            var x = _a[0], y = _a[1];
            return [x * Math.PI / 2, y * Math.PI / 2];
        })
            .producer(function (_a) {
            var x = _a[0], y = _a[1];
            lightPosition.data = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y)];
            draw();
        }); });
    }
    function selected(value) {
        var mouseBinding = document.getElementById("mouse-binding");
        return function () { return mouseBinding.value == value; };
    }
    function contourColorData(contourValue, vertexCount) {
        var contourColorData = fieldColor(contourValue, 0.8).coordinates;
        while (contourColorData.length / 4 < vertexCount) {
            contourColorData.push.apply(contourColorData, contourColorData);
        }
        return contourColorData;
    }
    function draw() {
        var gl = context.gl;
        gl.clear(gl.COLOR_BUFFER_BIT);
        position.pointTo(tetrahedronBuffer, 10, 0);
        normal.pointTo(tetrahedronBuffer, 10, 3);
        color.pointTo(tetrahedronBuffer, 10, 6);
        gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, tetrahedronBuffer.data.length / 10);
        position.pointTo(contourSurfaceBuffer, 6, 0);
        normal.pointTo(contourSurfaceBuffer, 6, 3);
        color.pointTo(contourColorBuffer, 4, 0);
        gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, contourSurfaceBuffer.data.length / 6);
        gl.finish();
        gl.flush();
    }
    function newTetrahedron(field0, field1, field2, field3) {
        var angle = 2 * Math.PI / 3;
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);
        var points = {
            point0: Space.vec(0, 1, 0),
            point1: Space.vec(sin, cos, 0),
            point2: Space.vec(cos * sin, cos, -sin * sin),
            point3: Space.vec(cos * sin, cos, +sin * sin)
        };
        var mat = Space.mat(Space.vec.apply(Space, __spreadArrays(points.point0.coordinates, [1])), Space.vec.apply(Space, __spreadArrays(points.point1.coordinates, [1])), Space.vec.apply(Space, __spreadArrays(points.point2.coordinates, [1])), Space.vec.apply(Space, __spreadArrays(points.point3.coordinates, [1])));
        var matInv = mat.inverse;
        var gradient = Space.vec(field0, field1, field2, field3).prod(matInv).swizzle(0, 1, 2);
        var gradients = {
            gradient0: gradient,
            gradient1: gradient,
            gradient2: gradient,
            gradient3: gradient
        };
        var values = {
            value0: field0,
            value1: field1,
            value2: field2,
            value3: field3
        };
        return __assign(__assign(__assign({}, points), gradients), values);
    }
    function tetrahedronData(tetrahedron) {
        var normals = [
            normalFrom(tetrahedron.point3, tetrahedron.point2, tetrahedron.point1),
            normalFrom(tetrahedron.point2, tetrahedron.point3, tetrahedron.point0),
            normalFrom(tetrahedron.point1, tetrahedron.point0, tetrahedron.point3),
            normalFrom(tetrahedron.point0, tetrahedron.point1, tetrahedron.point2)
        ];
        var colors = [
            fieldColor(tetrahedron.value0),
            fieldColor(tetrahedron.value1),
            fieldColor(tetrahedron.value2),
            fieldColor(tetrahedron.value3)
        ];
        var tetrahedronVertexes = [
            tetrahedron.point3, normals[0], colors[3],
            tetrahedron.point2, normals[0], colors[2],
            tetrahedron.point1, normals[0], colors[1],
            tetrahedron.point2, normals[1], colors[2],
            tetrahedron.point3, normals[1], colors[3],
            tetrahedron.point0, normals[1], colors[0],
            tetrahedron.point1, normals[2], colors[1],
            tetrahedron.point0, normals[2], colors[0],
            tetrahedron.point3, normals[2], colors[3],
            tetrahedron.point0, normals[3], colors[0],
            tetrahedron.point1, normals[3], colors[1],
            tetrahedron.point2, normals[3], colors[2]
        ];
        return tetrahedronVertexes.reduce(function (array, vector) { return array.concat.apply(array, vector.coordinates); }, []);
    }
    function contourSurfaceData(tetrahedron, contourValue) {
        var stack = Space.modules.stack.exports;
        var space = Space.modules.space.exports;
        var scalarField = Space.modules.scalarField.exports;
        stack.leave();
        stack.enter();
        var p0 = space.vec4(tetrahedron.point0.coordinates[0], tetrahedron.point0.coordinates[1], tetrahedron.point0.coordinates[2], 1);
        var g0 = space.vec4(tetrahedron.gradient0.coordinates[0], tetrahedron.gradient0.coordinates[1], tetrahedron.gradient0.coordinates[2], tetrahedron.value0);
        var p1 = space.vec4(tetrahedron.point1.coordinates[0], tetrahedron.point1.coordinates[1], tetrahedron.point1.coordinates[2], 1);
        var g1 = space.vec4(tetrahedron.gradient1.coordinates[0], tetrahedron.gradient1.coordinates[1], tetrahedron.gradient1.coordinates[2], tetrahedron.value1);
        var p2 = space.vec4(tetrahedron.point2.coordinates[0], tetrahedron.point2.coordinates[1], tetrahedron.point2.coordinates[2], 1);
        var g2 = space.vec4(tetrahedron.gradient2.coordinates[0], tetrahedron.gradient2.coordinates[1], tetrahedron.gradient2.coordinates[2], tetrahedron.value2);
        var p3 = space.vec4(tetrahedron.point3.coordinates[0], tetrahedron.point3.coordinates[1], tetrahedron.point3.coordinates[2], 1);
        var g3 = space.vec4(tetrahedron.gradient3.coordinates[0], tetrahedron.gradient3.coordinates[1], tetrahedron.gradient3.coordinates[2], tetrahedron.value3);
        var begin = scalarField.tessellateTetrahedron(contourValue, p0, p1, p2, p3);
        var end = stack.allocate8(0);
        var result = array(stack, begin, end);
        return result;
    }
    function array(stack, begin, end) {
        var typedArray = new Float64Array(stack.stack.buffer.slice(begin, end));
        var result = [];
        typedArray.forEach(function (value) { return result.push(value); });
        return result;
    }
    function fieldColor(fieldValue, alpha) {
        if (alpha === void 0) { alpha = 0.4; }
        return Space.vec((1 + fieldValue) / 2, 0, (1 - fieldValue) / 2, alpha);
    }
    function normalFrom(p1, p2, p3) {
        var v12 = p2.minus(p1);
        var v23 = p3.minus(p2);
        return v12.cross(v23).unit;
    }
})(ScalarField || (ScalarField = {}));
var ScalarField;
(function (ScalarField) {
    var vertexShaderCode;
    var fragmentShaderCode;
    var context;
    var position;
    var normal;
    var color;
    var matModel;
    var lightPosition;
    var shininess;
    var fogginess;
    var cubeBuffer;
    var contourSurfaceBuffer;
    var contourColorBuffer;
    var cube = newCube(-1, -1, -1, -1, -1, -1, -1, -1);
    var contourValue = 0;
    function initCubeDemo() {
        window.onload = function () { return Gear.load("/shaders", function () { return Space.initWaModules(function () { return doInit(); }); }, ["vertexColors.vert", function (shader) { return vertexShaderCode = shader; }], ["vertexColors.frag", function (shader) { return fragmentShaderCode = shader; }]); };
    }
    ScalarField.initCubeDemo = initCubeDemo;
    function doInit() {
        context = new Djee.Context("canvas-gl");
        var program = context.link([
            context.vertexShader(vertexShaderCode),
            context.fragmentShader(fragmentShaderCode)
        ]);
        program.use();
        cubeBuffer = context.newBuffer();
        contourSurfaceBuffer = context.newBuffer();
        contourColorBuffer = context.newBuffer();
        position = program.locateAttribute("position", 3);
        normal = program.locateAttribute("normal", 3);
        color = program.locateAttribute("color", 4);
        matModel = program.locateUniform("matModel", 4, true);
        var matView = program.locateUniform("matView", 4, true);
        var matProjection = program.locateUniform("matProjection", 4, true);
        lightPosition = program.locateUniform("lightPosition", 3);
        shininess = program.locateUniform("shininess", 1);
        fogginess = program.locateUniform("fogginess", 1);
        matModel.data = Space.Matrix.identity().asColumnMajorArray;
        matView.data = Space.Matrix.globalView(Space.vec(-2, 2, 6), Space.vec(0, 0, 0), Space.vec(0, 1, 0)).asColumnMajorArray;
        matProjection.data = Space.Matrix.project(2, 100, 1).asColumnMajorArray;
        lightPosition.data = [2, 2, 2];
        shininess.data = [1];
        fogginess.data = [0];
        var gl = context.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(1, 1, 1, 1);
        var canvas = Gear.elementEvents("canvas-gl");
        var mouseButtonPressed = canvas.mouseButons.map(function (_a) {
            var l = _a[0], m = _a[1], r = _a[2];
            return l;
        });
        Gear.Flow.from(canvas.mousePos.then(Gear.flowSwitch(mouseButtonPressed)), canvas.touchPos.map(function (positions) { return positions[0]; })).map(function (_a) {
            var x = _a[0], y = _a[1];
            return [
                2 * (x - canvas.element.clientWidth / 2) / canvas.element.clientWidth,
                2 * (canvas.element.clientHeight / 2 - y) / canvas.element.clientHeight
            ];
        }).branch(function (flow) { return flow.filter(selected("rotation")).to(rotationSink()); }, function (flow) { return flow.filter(selected("lightPosition")).to(lightPositionSink()); }, function (flow) { return flow.filter(selected("contourValue")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return y;
        }).to(contourValueSink()); }, function (flow) { return Gear.Flow.from(flow.filter(selected("value0")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return newCube(y, cube.value1, cube.value2, cube.value3, cube.value4, cube.value5, cube.value6, cube.value7);
        }), flow.filter(selected("value1")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return newCube(cube.value0, y, cube.value2, cube.value3, cube.value4, cube.value5, cube.value6, cube.value7);
        }), flow.filter(selected("value2")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return newCube(cube.value0, cube.value1, y, cube.value3, cube.value4, cube.value5, cube.value6, cube.value7);
        }), flow.filter(selected("value3")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return newCube(cube.value0, cube.value1, cube.value2, y, cube.value4, cube.value5, cube.value6, cube.value7);
        }), flow.filter(selected("value4")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return newCube(cube.value0, cube.value1, cube.value2, cube.value3, y, cube.value5, cube.value6, cube.value7);
        }), flow.filter(selected("value5")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return newCube(cube.value0, cube.value1, cube.value2, cube.value3, cube.value4, y, cube.value6, cube.value7);
        }), flow.filter(selected("value6")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return newCube(cube.value0, cube.value1, cube.value2, cube.value3, cube.value4, cube.value5, y, cube.value7);
        }), flow.filter(selected("value7")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return newCube(cube.value0, cube.value1, cube.value2, cube.value3, cube.value4, cube.value5, cube.value6, y);
        })).to(cubeSink()); });
    }
    function cubeSink() {
        return Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(newCube(-1, -1, -1, -1, -1, -1, -1, -1))
            .producer(function (newCube) {
            cube = newCube;
            cubeBuffer.untypedData = cubeData(cube);
            contourSurfaceBuffer.untypedData = contourSurfaceData(cube, contourValue);
            contourColorBuffer.untypedData = contourColorData(contourValue, contourSurfaceBuffer.data.length / 6);
            draw();
        }); });
    }
    function contourValueSink() {
        return Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(0)
            .producer(function (newContourValue) {
            contourValue = newContourValue;
            contourSurfaceBuffer.untypedData = contourSurfaceData(cube, contourValue);
            contourColorBuffer.untypedData = contourColorData(contourValue, contourSurfaceBuffer.data.length / 6);
            draw();
        }); });
    }
    function rotationSink() {
        var axisX = Space.vec(1, 0, 0);
        var axisY = Space.vec(0, 1, 0);
        return Gear.sinkFlow(function (flow) { return flow.defaultsTo([0, 0]).producer(function (_a) {
            var x = _a[0], y = _a[1];
            matModel.data =
                Space.Matrix.rotation(y * Math.PI, axisX)
                    .by(Space.Matrix.rotation(x * Math.PI, axisY))
                    .asColumnMajorArray;
            draw();
        }); });
    }
    function lightPositionSink() {
        return Gear.sinkFlow(function (flow) { return flow
            .defaultsTo([0.5, 0.5])
            .map(function (_a) {
            var x = _a[0], y = _a[1];
            return [x * Math.PI / 2, y * Math.PI / 2];
        })
            .producer(function (_a) {
            var x = _a[0], y = _a[1];
            lightPosition.data = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y)];
            draw();
        }); });
    }
    function selected(value) {
        var mouseBinding = document.getElementById("mouse-binding");
        return function () { return mouseBinding.value == value; };
    }
    function contourColorData(contourValue, vertexCount) {
        var contourColorData = fieldColor(contourValue, 0.8).coordinates;
        while (contourColorData.length / 4 < vertexCount) {
            contourColorData.push.apply(contourColorData, contourColorData);
        }
        return contourColorData;
    }
    function draw() {
        var gl = context.gl;
        gl.clear(gl.COLOR_BUFFER_BIT);
        position.pointTo(cubeBuffer, 10, 0);
        normal.pointTo(cubeBuffer, 10, 3);
        color.pointTo(cubeBuffer, 10, 6);
        gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, cubeBuffer.data.length / 10);
        position.pointTo(contourSurfaceBuffer, 6, 0);
        normal.pointTo(contourSurfaceBuffer, 6, 3);
        color.pointTo(contourColorBuffer, 4, 0);
        gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, contourSurfaceBuffer.data.length / 6);
        gl.finish();
        gl.flush();
    }
    function newCube(field0, field1, field2, field3, field4, field5, field6, field7) {
        var points = {
            point0: Space.vec(-1, -1, -1),
            point1: Space.vec(-1, -1, +1),
            point2: Space.vec(-1, +1, -1),
            point3: Space.vec(-1, +1, +1),
            point4: Space.vec(+1, -1, -1),
            point5: Space.vec(+1, -1, +1),
            point6: Space.vec(+1, +1, -1),
            point7: Space.vec(+1, +1, +1),
        };
        var gradients = {
            gradient0: gradient(points.point0, field0, points.point4, field4, points.point2, field2, points.point1, field1),
            gradient1: gradient(points.point1, field1, points.point5, field5, points.point3, field3, points.point0, field0),
            gradient2: gradient(points.point2, field2, points.point6, field6, points.point0, field0, points.point3, field3),
            gradient3: gradient(points.point3, field3, points.point7, field7, points.point1, field1, points.point2, field2),
            gradient4: gradient(points.point4, field4, points.point0, field0, points.point6, field6, points.point5, field5),
            gradient5: gradient(points.point5, field5, points.point1, field1, points.point7, field7, points.point4, field4),
            gradient6: gradient(points.point6, field6, points.point2, field2, points.point4, field4, points.point7, field7),
            gradient7: gradient(points.point7, field7, points.point3, field3, points.point5, field5, points.point6, field6)
        };
        var values = {
            value0: field0,
            value1: field1,
            value2: field2,
            value3: field3,
            value4: field4,
            value5: field5,
            value6: field6,
            value7: field7,
        };
        return __assign(__assign(__assign({}, points), gradients), values);
    }
    function gradient(point, value, pointX, valueX, pointY, valueY, pointZ, valueZ) {
        return point.minus(pointX).scale(value - valueX)
            .plus(point.minus(pointY).scale(value - valueY))
            .plus(point.minus(pointZ).scale(value - valueZ));
    }
    function cubeData(cube) {
        var normals = [
            Space.vec(+0, +0, -1),
            Space.vec(+0, +0, +1),
            Space.vec(+0, -1, +0),
            Space.vec(+0, +1, +0),
            Space.vec(-1, +0, +0),
            Space.vec(+1, +0, +0),
        ];
        var colors = [
            fieldColor(cube.value0),
            fieldColor(cube.value1),
            fieldColor(cube.value2),
            fieldColor(cube.value3),
            fieldColor(cube.value4),
            fieldColor(cube.value5),
            fieldColor(cube.value6),
            fieldColor(cube.value7),
        ];
        var vertexes = [
            cube.point0, normals[0], colors[0],
            cube.point2, normals[0], colors[2],
            cube.point4, normals[0], colors[4],
            cube.point4, normals[0], colors[4],
            cube.point2, normals[0], colors[2],
            cube.point6, normals[0], colors[6],
            cube.point7, normals[1], colors[7],
            cube.point3, normals[1], colors[3],
            cube.point5, normals[1], colors[5],
            cube.point5, normals[1], colors[5],
            cube.point3, normals[1], colors[3],
            cube.point1, normals[1], colors[1],
            cube.point0, normals[2], colors[0],
            cube.point4, normals[2], colors[4],
            cube.point1, normals[2], colors[1],
            cube.point1, normals[2], colors[1],
            cube.point4, normals[2], colors[4],
            cube.point5, normals[2], colors[5],
            cube.point7, normals[3], colors[7],
            cube.point6, normals[3], colors[6],
            cube.point3, normals[3], colors[3],
            cube.point3, normals[3], colors[3],
            cube.point6, normals[3], colors[6],
            cube.point2, normals[3], colors[2],
            cube.point0, normals[4], colors[0],
            cube.point1, normals[4], colors[1],
            cube.point2, normals[4], colors[2],
            cube.point2, normals[4], colors[2],
            cube.point1, normals[4], colors[1],
            cube.point3, normals[4], colors[3],
            cube.point7, normals[5], colors[7],
            cube.point5, normals[5], colors[5],
            cube.point6, normals[5], colors[6],
            cube.point6, normals[5], colors[6],
            cube.point5, normals[5], colors[5],
            cube.point4, normals[5], colors[4],
        ];
        return vertexes.reduce(function (array, vector) { return array.concat.apply(array, vector.coordinates); }, []);
    }
    function contourSurfaceData(cube, contourValue) {
        var stack = Space.modules.stack.exports;
        var space = Space.modules.space.exports;
        var scalarField = Space.modules.scalarField.exports;
        stack.leave();
        stack.enter();
        var p0 = space.vec4(cube.point0.coordinates[0], cube.point0.coordinates[1], cube.point0.coordinates[2], 1);
        var g0 = space.vec4(cube.gradient0.coordinates[0], cube.gradient0.coordinates[1], cube.gradient0.coordinates[2], cube.value0);
        var p1 = space.vec4(cube.point1.coordinates[0], cube.point1.coordinates[1], cube.point1.coordinates[2], 1);
        var g1 = space.vec4(cube.gradient1.coordinates[0], cube.gradient1.coordinates[1], cube.gradient1.coordinates[2], cube.value1);
        var p2 = space.vec4(cube.point2.coordinates[0], cube.point2.coordinates[1], cube.point2.coordinates[2], 1);
        var g2 = space.vec4(cube.gradient2.coordinates[0], cube.gradient2.coordinates[1], cube.gradient2.coordinates[2], cube.value2);
        var p3 = space.vec4(cube.point3.coordinates[0], cube.point3.coordinates[1], cube.point3.coordinates[2], 1);
        var g3 = space.vec4(cube.gradient3.coordinates[0], cube.gradient3.coordinates[1], cube.gradient3.coordinates[2], cube.value3);
        var p4 = space.vec4(cube.point4.coordinates[0], cube.point4.coordinates[1], cube.point4.coordinates[2], 1);
        var g4 = space.vec4(cube.gradient4.coordinates[0], cube.gradient4.coordinates[1], cube.gradient4.coordinates[2], cube.value4);
        var p5 = space.vec4(cube.point5.coordinates[0], cube.point5.coordinates[1], cube.point5.coordinates[2], 1);
        var g5 = space.vec4(cube.gradient5.coordinates[0], cube.gradient5.coordinates[1], cube.gradient5.coordinates[2], cube.value5);
        var p6 = space.vec4(cube.point6.coordinates[0], cube.point6.coordinates[1], cube.point6.coordinates[2], 1);
        var g6 = space.vec4(cube.gradient6.coordinates[0], cube.gradient6.coordinates[1], cube.gradient6.coordinates[2], cube.value6);
        var p7 = space.vec4(cube.point7.coordinates[0], cube.point7.coordinates[1], cube.point7.coordinates[2], 1);
        var g7 = space.vec4(cube.gradient7.coordinates[0], cube.gradient7.coordinates[1], cube.gradient7.coordinates[2], cube.value7);
        var begin = scalarField.tessellateCube(contourValue, p0, p1, p2, p3, p4, p5, p6, p7);
        var end = stack.allocate8(0);
        var result = array(stack, begin, end);
        return result;
    }
    function array(stack, begin, end) {
        var typedArray = new Float64Array(stack.stack.buffer.slice(begin, end));
        var result = [];
        typedArray.forEach(function (value) { return result.push(value); });
        return result;
    }
    function fieldColor(fieldValue, alpha) {
        if (alpha === void 0) { alpha = 0.4; }
        return Space.vec((1 + fieldValue) / 2, 0, (1 - fieldValue) / 2, alpha);
    }
    function normalFrom(p1, p2, p3) {
        var v12 = p2.minus(p1);
        var v23 = p3.minus(p2);
        return v12.cross(v23).unit;
    }
})(ScalarField || (ScalarField = {}));
var ScalarField;
(function (ScalarField) {
    var resolution = 64;
    var fieldSampler = envelopedCosine;
    var vertexShaderCode;
    var fragmentShaderCode;
    var context;
    var position;
    var normal;
    var matModel;
    var matProjection;
    var lightPosition;
    var color;
    var shininess;
    var fogginess;
    var contourSurfaceBuffer;
    var contourValue = 0;
    var fieldRef = 0;
    function init() {
        window.onload = function () { return Gear.load("/shaders", function () { return Space.initWaModules(function () { return doInit(); }); }, ["uniformColors.vert", function (shader) { return vertexShaderCode = shader; }], ["uniformColors.frag", function (shader) { return fragmentShaderCode = shader; }]); };
    }
    ScalarField.init = init;
    function doInit() {
        fieldRef = sampleField();
        context = new Djee.Context("canvas-gl");
        var program = context.link([
            context.vertexShader(vertexShaderCode),
            context.fragmentShader(fragmentShaderCode)
        ]);
        program.use();
        contourSurfaceBuffer = context.newBuffer();
        position = program.locateAttribute("position", 3);
        normal = program.locateAttribute("normal", 3);
        matModel = program.locateUniform("matModel", 4, true);
        var matView = program.locateUniform("matView", 4, true);
        matProjection = program.locateUniform("matProjection", 4, true);
        lightPosition = program.locateUniform("lightPosition", 3);
        color = program.locateUniform("color", 4);
        shininess = program.locateUniform("shininess", 1);
        fogginess = program.locateUniform("fogginess", 1);
        matModel.data = Space.Matrix.identity().asColumnMajorArray;
        matView.data = Space.Matrix.globalView(Space.vec(-2, 2, 10), Space.vec(0, 0, 0), Space.vec(0, 1, 0)).asColumnMajorArray;
        matProjection.data = Space.Matrix.project(4, 100, 1).asColumnMajorArray;
        var gl = context.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.clearDepth(1);
        gl.clearColor(1, 1, 1, 1);
        var canvas = Gear.elementEvents("canvas-gl");
        var mouseButtonPressed = canvas.mouseButons.map(function (_a) {
            var l = _a[0], m = _a[1], r = _a[2];
            return l;
        });
        Gear.Flow.from(canvas.mousePos.then(Gear.flowSwitch(mouseButtonPressed)), canvas.touchPos.map(function (positions) { return positions[0]; })).map(function (_a) {
            var x = _a[0], y = _a[1];
            return [
                2 * (x - canvas.element.clientWidth / 2) / canvas.element.clientWidth,
                2 * (canvas.element.clientHeight / 2 - y) / canvas.element.clientHeight
            ];
        }).branch(function (flow) { return flow.filter(selected("rotation")).to(rotationSink()); }, function (flow) { return flow.filter(selected("focalRatio")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return y;
        }).to(focalRatioSink()); }, function (flow) { return flow.filter(selected("lightPosition")).to(lightPositionSink()); }, function (flow) { return flow.filter(selected("contourValue")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return y;
        }).to(contourValueSink()); }, function (flow) { return flow.filter(selected("shininess")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return y;
        }).to(shininessSink()); }, function (flow) { return flow.filter(selected("fogginess")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return y;
        }).to(fogginessSink()); });
        levelOfDetailsFlow().to(levelOfDetailsSink());
        Gear.readableValue("function").to(functionSink());
    }
    function selected(value) {
        var mouseBinding = document.getElementById("mouse-binding");
        return function () { return mouseBinding.value == value; };
    }
    function levelOfDetailsFlow() {
        var inc = Gear.elementEvents("lod-inc").mouseButons
            .map(function (_a) {
            var l = _a[0], m = _a[1], r = _a[2];
            return l;
        })
            .map(function (pressed) { return pressed ? +8 : 0; });
        var dec = Gear.elementEvents("lod-dec").mouseButons
            .map(function (_a) {
            var l = _a[0], m = _a[1], r = _a[2];
            return l;
        })
            .map(function (pressed) { return pressed ? -8 : 0; });
        var flow = Gear.Flow.from(inc, dec)
            .defaultsTo(0)
            .then(Gear.repeater(128, 0))
            .reduce(function (i, lod) { return clamp(lod + i, 32, 96); }, 64);
        flow.map(function (lod) { return lod.toString(); }).to(Gear.text("lod"));
        return flow;
    }
    function clamp(n, min, max) {
        return n < min ? min : (n > max ? max : n);
    }
    function levelOfDetailsSink() {
        return Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(64)
            .producer(function (lod) {
            resolution = lod;
            fieldRef = sampleField();
            contourSurfaceBuffer.data = contourSurfaceData(fieldRef, contourValue);
            draw();
        }); });
    }
    function contourValueSink() {
        return Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(0)
            .producer(function (newContourValue) {
            contourValue = newContourValue;
            contourSurfaceBuffer.data = contourSurfaceData(fieldRef, contourValue);
            color.data = fieldColor(contourValue, 1).coordinates;
            draw();
        }); });
    }
    function fieldColor(fieldValue, alpha) {
        if (alpha === void 0) { alpha = 0.4; }
        return Space.vec((1 + fieldValue) / 2, 0, (1 - fieldValue) / 2, alpha);
    }
    function rotationSink() {
        var axisX = Space.vec(1, 0, 0);
        var axisY = Space.vec(0, 1, 0);
        return Gear.sinkFlow(function (flow) { return flow.defaultsTo([0, 0]).producer(function (_a) {
            var x = _a[0], y = _a[1];
            matModel.data =
                Space.Matrix.rotation(y * Math.PI, axisX)
                    .by(Space.Matrix.rotation(x * Math.PI, axisY))
                    .asColumnMajorArray;
            draw();
        }); });
    }
    function focalRatioSink() {
        var axisX = Space.vec(1, 0, 0);
        var axisY = Space.vec(0, 1, 0);
        return Gear.sinkFlow(function (flow) { return flow.defaultsTo(0).map(function (ratio) { return (ratio + 1.4) * 3; }).producer(function (ratio) {
            matProjection.data = Space.Matrix.project(ratio, 100, 1).asColumnMajorArray;
            draw();
        }); });
    }
    function lightPositionSink() {
        return Gear.sinkFlow(function (flow) { return flow
            .defaultsTo([0.5, 0.5])
            .map(function (_a) {
            var x = _a[0], y = _a[1];
            return [x * Math.PI / 2, y * Math.PI / 2];
        })
            .producer(function (_a) {
            var x = _a[0], y = _a[1];
            lightPosition.data = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y)];
            draw();
        }); });
    }
    function shininessSink() {
        return Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(-1)
            .map(function (value) { return (value + 1) / 2; })
            .producer(function (value) {
            shininess.data = [value];
            draw();
        }); });
    }
    function fogginessSink() {
        return Gear.sinkFlow(function (flow) { return flow
            .defaultsTo(-1)
            .map(function (value) { return (value + 1) / 2; })
            .producer(function (value) {
            fogginess.data = [value];
            draw();
        }); });
    }
    function functionSink() {
        return Gear.sinkFlow(function (flow) { return flow
            .defaultsTo("xyz")
            .producer(function (functionName) {
            fieldSampler = getFieldFunction(functionName);
            fieldRef = sampleField();
            contourSurfaceBuffer.data = contourSurfaceData(fieldRef, contourValue);
            draw();
        }); });
    }
    function getFieldFunction(functionName) {
        switch (functionName) {
            case "xyz": return xyz;
            case "envelopedCosine": return envelopedCosine;
            default: return xyz;
        }
    }
    function sampleField() {
        var stack = Space.modules.stack.exports;
        var space = Space.modules.space.exports;
        stack.leave();
        stack.leave();
        stack.enter();
        var ref = stack.allocate8(0);
        for (var z = 0; z <= resolution; z++) {
            for (var y = 0; y <= resolution; y++) {
                for (var x = 0; x <= resolution; x++) {
                    var px = 2 * x / resolution - 1;
                    var py = 2 * y / resolution - 1;
                    var pz = 2 * z / resolution - 1;
                    var v = fieldSampler(px, py, pz).coordinates;
                    space.vec4(px, py, pz, 1);
                    space.vec4(v[0], v[1], v[2], v[3]);
                }
            }
        }
        stack.enter();
        return ref;
    }
    function contourSurfaceData(fieldRef, contourValue) {
        var stack = Space.modules.stack.exports;
        var scalarField = Space.modules.scalarField.exports;
        stack.leave();
        stack.enter();
        var begin = scalarField.tesselateScalarField(fieldRef, resolution, contourValue);
        var end = stack.allocate8(0);
        var result = new Float32Array(new Float64Array(stack.stack.buffer, begin, (end - begin) / 8));
        return result;
    }
    var twoPi = 2 * Math.PI;
    function xyz(x, y, z) {
        return Space.vec(y * z, z * x, x * y, x * y * z);
    }
    function envelopedCosine(x, y, z) {
        var x2 = x * x;
        var y2 = y * y;
        var z2 = z * z;
        if (x2 <= 1 && y2 <= 1 && z2 <= 1) {
            var piX2 = Math.PI * x2;
            var piY2 = Math.PI * y2;
            var piZ2 = Math.PI * z2;
            var envelope = (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 8;
            var piX = Math.PI * x;
            var piY = Math.PI * y;
            var piZ = Math.PI * z;
            var value = Math.cos(2 * piX) + Math.cos(2 * piY) + Math.cos(2 * piZ);
            var dEnvelopeDX = -piX * Math.sin(piX2) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 4;
            var dEnvelopeDY = -piY * Math.sin(piY2) * (Math.cos(piX2) + 1) * (Math.cos(piZ2) + 1) / 4;
            var dEnvelopeDZ = -piZ * Math.sin(piZ2) * (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) / 4;
            var dValueDX = -twoPi * Math.sin(2 * piX);
            var dValueDY = -twoPi * Math.sin(2 * piY);
            var dValueDZ = -twoPi * Math.sin(2 * piZ);
            return Space.vec(dEnvelopeDX * value + envelope * dValueDX, dEnvelopeDY * value + envelope * dValueDY, dEnvelopeDZ * value + envelope * dValueDZ, envelope * value / 3);
        }
        else {
            return Space.vec(0, 0, 0, 0);
        }
    }
    function draw() {
        var gl = context.gl;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        position.pointTo(contourSurfaceBuffer, 6, 0);
        normal.pointTo(contourSurfaceBuffer, 6, 3);
        gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, contourSurfaceBuffer.data.length / 6);
        gl.finish();
        gl.flush();
    }
})(ScalarField || (ScalarField = {}));
/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
/// <reference path="./tetrahedron.ts" />
/// <reference path="./cube.ts" />
/// <reference path="./scalarField.ts" />
var Sierpinski;
(function (Sierpinski) {
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
    Sierpinski.sierpinski = sierpinski;
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
        return Space.vec(Math.cos(angle), Math.sin(angle));
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
    Sierpinski.tesselatedTriangle = tesselatedTriangle;
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
})(Sierpinski || (Sierpinski = {}));
var Sierpinski;
(function (Sierpinski) {
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
            this.cornersBuffer.untypedData = flattenedSierpinski.corners;
            this.centersBuffer.untypedData = flattenedSierpinski.centers;
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
    Sierpinski.View = View;
})(Sierpinski || (Sierpinski = {}));
var Sierpinski;
(function (Sierpinski) {
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
            this.depth = Gear.Flow.from(depthDecButton.clickPos.map(function (e) { return -1; }), depthIncButton.clickPos.map(function (e) { return 1; })).reduce(function (delta, depth) { return Math.min(Math.max(depth + delta, 1), 8); }, 5);
        }
        return Controller;
    }());
    Sierpinski.Controller = Controller;
})(Sierpinski || (Sierpinski = {}));
/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
/// <reference path="model.ts" />
/// <reference path="view.ts" />
/// <reference path="controller.ts" />
var Sierpinski;
/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
/// <reference path="model.ts" />
/// <reference path="view.ts" />
/// <reference path="controller.ts" />
(function (Sierpinski) {
    function init() {
        window.onload = function (e) {
            var view = new Sierpinski.View("canvas-gl", "division-depth", "twist", "scale");
            var controller = new Sierpinski.Controller("canvas-gl", "input-corners", "input-centers", "input-twist", "input-scale", "division-inc", "division-dec");
            controller.depth.to(view.depth);
            controller.twist.to(view.twist);
            controller.scale.to(view.scale);
            controller.showCorners.to(view.showCorners);
            controller.showCenters.to(view.showCenters);
            Sierpinski.sierpinski(controller.depth).to(view.sierpinsky);
        };
    }
    Sierpinski.init = init;
})(Sierpinski || (Sierpinski = {}));
var Tree;
(function (Tree) {
    var MatriciesGenerator = /** @class */ (function () {
        function MatriciesGenerator() {
            this._verticalAngle = Math.PI / 4;
            this._depth = 5;
            this.scale = Math.SQRT1_2;
            this.branchCount = 3;
            this.horizontalAngle = 2 * Math.PI / this.branchCount;
            this.axis1 = Space.vec(1, 0, 0);
            this.axis2 = Space.vec(Math.cos(this.horizontalAngle), 0, +Math.sin(this.horizontalAngle));
            this.axis3 = Space.vec(Math.cos(this.horizontalAngle), 0, -Math.sin(this.horizontalAngle));
            this.scaling = Space.Matrix.scaling(this.scale, this.scale, this.scale);
            this.translation = Space.Matrix.translation(0, 2, 0);
            this.init();
        }
        MatriciesGenerator.prototype.init = function () {
            this.branch1Matrix = this.translation
                .by(Space.Matrix.rotation(this._verticalAngle, this.axis1))
                .by(this.scaling);
            this.branch2Matrix = this.translation
                .by(Space.Matrix.rotation(this._verticalAngle, this.axis2))
                .by(this.scaling);
            this.branch3Matrix = Space.Matrix.translation(0, 2, 0)
                .by(Space.Matrix.rotation(this._verticalAngle, this.axis3))
                .by(this.scaling);
        };
        Object.defineProperty(MatriciesGenerator.prototype, "verticalAngle", {
            get: function () {
                return this._verticalAngle;
            },
            set: function (value) {
                this._verticalAngle = value;
                this.init();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(MatriciesGenerator.prototype, "depth", {
            get: function () {
                return this._depth;
            },
            set: function (value) {
                this._depth = value;
            },
            enumerable: true,
            configurable: true
        });
        MatriciesGenerator.prototype.generateMatricies = function () {
            var result = [];
            this.doGenerateMatricies(result, this._depth, Space.Matrix.identity());
            return result.map(function (matrix) { return matrix.asColumnMajorArray; });
        };
        MatriciesGenerator.prototype.doGenerateMatricies = function (result, depth, matrix) {
            result.push(matrix);
            if (depth > 0) {
                this.doGenerateMatricies(result, depth - 1, matrix.by(this.branch1Matrix));
                this.doGenerateMatricies(result, depth - 1, matrix.by(this.branch2Matrix));
                this.doGenerateMatricies(result, depth - 1, matrix.by(this.branch3Matrix));
            }
        };
        return MatriciesGenerator;
    }());
    Tree.MatriciesGenerator = MatriciesGenerator;
})(Tree || (Tree = {}));
var Tree;
(function (Tree) {
    var Renderer = /** @class */ (function () {
        function Renderer(vertexShaderCode, fragmentShaderCode, matrices) {
            this.context = new Djee.Context("canvas-gl");
            this.buffer = this.context.newBuffer();
            this.buffer.untypedData = this.vertexData();
            var vertexShader = this.context.vertexShader(vertexShaderCode);
            var fragmentShader = this.context.fragmentShader(fragmentShaderCode);
            var program = this.context.link([vertexShader, fragmentShader]);
            program.use();
            var position = program.locateAttribute("position", 3);
            var normal = program.locateAttribute("normal", 3);
            position.pointTo(this.buffer, 6, 0);
            normal.pointTo(this.buffer, 6, 3);
            this.matModel = program.locateUniform("matModel", 4, true);
            this.matSubModel = program.locateUniform("matSubModel", 4, true);
            this.matView = program.locateUniform("matView", 4, true);
            this.matProjection = program.locateUniform("matProjection", 4, true);
            var model = Space.Matrix.identity();
            this.matModel.data = model.asColumnMajorArray;
            var view = Space.Matrix.globalView(Space.vec(0, 4, 9), Space.vec(0, 3, 0), Space.vec(0, 1, 0));
            this.matView.data = view.asColumnMajorArray;
            var proj = Space.Matrix.project(1, 100, 1);
            this.matProjection.data = proj.asColumnMajorArray;
            this.lightPosition = program.locateUniform("lightPosition", 3, false);
            this.color = program.locateUniform("color", 3, false);
            this.shininess = program.locateUniform("shininess", 1, false);
            this.fogginess = program.locateUniform("fogginess", 1, false);
            this.twist = program.locateUniform("twist", 1, false);
            this.lightPosition.data = [8, 8, 8];
            this.color.data = [0.3, 0.5, 0.7];
            this.shininess.data = [1];
            this.fogginess.data = [0.5];
            this.twist.data = [0.0];
            this.matrices = matrices;
            this.draw();
        }
        Renderer.prototype.matricesSink = function () {
            var _this = this;
            return Gear.sink(function (matricies) {
                if (matricies) {
                    _this.matrices = matricies;
                    _this.draw();
                }
            });
        };
        Renderer.prototype.rotationSink = function () {
            var _this = this;
            var translationUp = Space.Matrix.translation(0, +2, 0);
            var translationDown = Space.Matrix.translation(0, -2, 0);
            var axisX = Space.vec(1, 0, 0);
            var axisY = Space.vec(0, 1, 0);
            return Gear.sinkFlow(function (flow) { return flow.defaultsTo([0, 0]).producer(function (_a) {
                var x = _a[0], y = _a[1];
                _this.matModel.data = translationUp
                    .by(Space.Matrix.rotation(y * Math.PI, axisX))
                    .by(Space.Matrix.rotation(x * Math.PI, axisY))
                    .by(translationDown)
                    .asColumnMajorArray;
                _this.draw();
            }); });
        };
        Renderer.prototype.lightPositionSink = function () {
            var _this = this;
            return Gear.sinkFlow(function (flow) { return flow
                .defaultsTo([0.5, 0.5])
                .map(function (_a) {
                var x = _a[0], y = _a[1];
                return [x * Math.PI / 2, y * Math.PI / 2];
            })
                .producer(function (_a) {
                var x = _a[0], y = _a[1];
                _this.lightPosition.data = [8 * Math.sin(x) * Math.cos(y), 8 * Math.sin(y), 8 * Math.cos(x) * Math.cos(y)];
                _this.draw();
            }); });
        };
        Renderer.prototype.colorSink = function () {
            var _this = this;
            var redVec = Space.vec(1, 0);
            var greenVec = Space.vec(Math.cos(2 * Math.PI / 3), Math.sin(2 * Math.PI / 3));
            var blueVec = Space.vec(Math.cos(4 * Math.PI / 3), Math.sin(4 * Math.PI / 3));
            return Gear.sinkFlow(function (flow) { return flow
                .defaultsTo([-0.4, -0.2])
                .map(function (_a) {
                var x = _a[0], y = _a[1];
                return Space.vec(x, y);
            })
                .producer(function (vec) {
                var red = Math.min(2, 1 + vec.dot(redVec)) / 2;
                var green = Math.min(2, 1 + vec.dot(greenVec)) / 2;
                var blue = Math.min(2, 1 + vec.dot(blueVec)) / 2;
                _this.color.data = [red, green, blue];
                _this.draw();
            }); });
        };
        Renderer.prototype.shininessSink = function () {
            var _this = this;
            return Gear.sink(function (shininess) {
                _this.shininess.data = [shininess];
                _this.draw();
            });
        };
        Renderer.prototype.fogginessSink = function () {
            var _this = this;
            return Gear.sink(function (fogginess) {
                _this.fogginess.data = [fogginess];
                _this.draw();
            });
        };
        Renderer.prototype.twistSink = function () {
            var _this = this;
            return Gear.sink(function (twist) {
                _this.twist.data = [twist];
                _this.draw();
            });
        };
        Renderer.prototype.draw = function () {
            var gl = this.context.gl;
            gl.enable(gl.DEPTH_TEST);
            // gl.enable(gl.CULL_FACE);
            // gl.frontFace(gl.CCW);
            // gl.cullFace(gl.BACK);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            for (var _i = 0, _a = this.matrices; _i < _a.length; _i++) {
                var matrix = _a[_i];
                this.matSubModel.data = matrix;
                for (var y = 0; y < 16; y++) {
                    gl.drawArrays(WebGLRenderingContext.TRIANGLE_STRIP, y * 34, 34);
                }
            }
            gl.finish();
            gl.flush();
        };
        Renderer.prototype.vertexData = function () {
            var result = [];
            for (var i = 0; i < 16; i++) {
                for (var j = 0; j <= 16; j++) {
                    var y1 = i / 16;
                    var y2 = (i + 1) / 16;
                    var z = Math.cos(Math.PI * j / 8);
                    var x = Math.sin(Math.PI * j / 8);
                    var r = 1 / 8;
                    var d = 2 * (1 - Math.SQRT1_2) / (1 + Math.SQRT1_2);
                    var r1 = r * (1 - d * (y1 - 0.5));
                    var r2 = r * (1 - d * (y2 - 0.5));
                    var n = Space.vec(x, r * d, z).unit;
                    result.push.apply(result, __spreadArrays([2 * x * r2, 2 * y2, 2 * z * r2], n.coordinates, [2 * x * r1, 2 * y1, 2 * z * r1], n.coordinates));
                }
            }
            return result;
        };
        return Renderer;
    }());
    Tree.Renderer = Renderer;
})(Tree || (Tree = {}));
/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
/// <reference path="./matgen.ts" />
/// <reference path="./renderer.ts" />
var Tree;
/// <reference path="../space/_.ts" />
/// <reference path="../djee/_.ts" />
/// <reference path="../gear/_.ts" />
/// <reference path="./matgen.ts" />
/// <reference path="./renderer.ts" />
(function (Tree) {
    var vertexShaderCode = null;
    var fragmentShaderCode = null;
    function init() {
        window.onload = function () { return Gear.load("/shaders", function () { return doInit(); }, ["tree.vert", function (shader) { return vertexShaderCode = shader; }], ["tree.frag", function (shader) { return fragmentShaderCode = shader; }]); };
    }
    Tree.init = init;
    function doInit() {
        var generator = new Tree.MatriciesGenerator();
        var matrices = generator.generateMatricies();
        var renderer = new Tree.Renderer(vertexShaderCode, fragmentShaderCode, matrices);
        var matricesSink = renderer.matricesSink();
        var canvas = Gear.elementEvents("canvas-gl");
        var depthInc = Gear.elementEvents("depth-inc");
        var depthDec = Gear.elementEvents("depth-dec");
        Gear.Flow.from(depthInc.clickPos.map(function () { return +1; }), depthDec.clickPos.map(function () { return -1; })).reduce(function (inc, depth) { return Math.max(Math.min(8, inc + depth), 1); }, 5).branch(function (flow) { return flow.map(function (depth) { return depth.toString(); }).to(Gear.text("depth")); }, function (flow) { return flow.map(function (depth) {
            generator.depth = depth;
            return generator.generateMatricies();
        }).to(matricesSink); });
        var mouseButtonPressed = canvas.mouseButons.map(function (_a) {
            var l = _a[0], m = _a[1], r = _a[2];
            return l;
        });
        Gear.Flow.from(canvas.mousePos.then(Gear.flowSwitch(mouseButtonPressed)), canvas.touchPos.map(function (positions) { return positions[0]; })).map(function (_a) {
            var x = _a[0], y = _a[1];
            return [
                2 * (x - canvas.element.clientWidth / 2) / canvas.element.clientWidth,
                2 * (canvas.element.clientHeight / 2 - y) / canvas.element.clientHeight
            ];
        }).branch(function (flow) { return flow.filter(selected("rotation")).to(renderer.rotationSink()); }, function (flow) { return flow.filter(selected("lightPosition")).to(renderer.lightPositionSink()); }, function (flow) { return flow.filter(selected("color")).to(renderer.colorSink()); }, function (flow) { return flow.filter(selected("shininess")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return y;
        }).to(renderer.shininessSink()); }, function (flow) { return flow.filter(selected("fogginess")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return (1 + y) / 2;
        }).to(renderer.fogginessSink()); }, function (flow) { return flow.filter(selected("twist")).map(function (_a) {
            var x = _a[0], y = _a[1];
            return y;
        }).to(renderer.twistSink()); }, function (flow) { return flow.filter(selected("angle"))
            .map(function (_a) {
            var x = _a[0], y = _a[1];
            generator.verticalAngle = x * Math.PI;
            return generator.generateMatricies();
        })
            .to(matricesSink); });
    }
    function selected(value) {
        var mouseBinding = document.getElementById("mouse-binding");
        return function () { return mouseBinding.value == value; };
    }
})(Tree || (Tree = {}));
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
        },
        {
            name: "Complex Fractal",
            vertexShader: 'file:complex-fractal.vert',
            fragmentShader: 'file:complex-fractal.frag'
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
        fetch(url, { method: "get", mode: "no-cors", cache: "no-cache" }).then(function (response) { return response.text().then(consumer); });
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
            this.buffer.untypedData = data;
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
        return compileBtn.clickPos.map(function (pos) { return program(); });
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