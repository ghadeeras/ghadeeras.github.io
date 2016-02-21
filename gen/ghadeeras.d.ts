declare module Space {
    class Vector {
        coordinates: number[];
        constructor(coordinates: number[]);
        combine(v: Vector, op: (c: number, vc: number) => number): Vector;
        affect(f: (c: number) => number): Vector;
        plus(v: Vector): Vector;
        minus(v: Vector): Vector;
        multiply(v: Vector): Vector;
        divide(v: Vector): Vector;
        scale(factor: number): Vector;
        dot(v: Vector): number;
        mix(v: Vector, weight: number): Vector;
        lengthSquared: number;
        length: number;
        unit: Vector;
        angle(v: Vector): number;
        c(indexes: number[]): Vector;
        cross(v: Vector): Vector;
        sameAs(v: Vector, precision?: number): boolean;
    }
}
declare module Space {
    function vec(coordinates: number[]): Vector;
}
declare module Djee {
    type Getter<S, P> = (structure: S) => P;
    type Setter<S, P> = (structure: S, primitive: P) => void;
    interface Flattener<S, P> {
        size: number;
        offsetOf<C>(child: Flattener<C, P>): number;
        flatten(structure: S, array?: P[], index?: number): P[];
        unflatten(structure: S, array: P[], index?: number): any;
    }
    abstract class AbstractFlattener<S, P> implements Flattener<S, P> {
        private _size;
        constructor(size: number);
        protected abstract subFlatteners(): Flattener<any, P>[];
        protected abstract doFlatten(structure: S, array: P[], index: number): any;
        protected abstract doUnflatten(structure: S, array: P[], index: number): any;
        size: number;
        offsetOf(child: Flattener<any, P>): number;
        flatten(structure: S, array?: P[], index?: number): P[];
        unflatten(structure: S, array: P[], index?: number): void;
    }
    class PrimitiveFlattener<S, P> extends AbstractFlattener<S, P> {
        private _getter;
        private _setter;
        constructor(getter: Getter<S, P>, setter: Setter<S, P>);
        protected subFlatteners(): Flattener<any, P>[];
        protected doFlatten(structure: S, array: P[], index: number): void;
        protected doUnflatten(structure: S, array: P[], index: number): void;
    }
    class ArrayFlattener<S, P> extends AbstractFlattener<S, P> {
        private _getter;
        constructor(size: number, getter: Getter<S, P[]>);
        private copy(structure, array, index, copier);
        protected subFlatteners(): Flattener<any, P>[];
        protected doFlatten(structure: S, array: P[], index: number): void;
        protected doUnflatten(structure: S, array: P[], index: number): void;
    }
    class ChildFlattener<S, C, P> extends AbstractFlattener<S, P> {
        private _flattener;
        private _getter;
        constructor(flattener: Flattener<C, P>, getter: Getter<S, C>);
        private copy(structure, array, index, copier);
        protected subFlatteners(): Flattener<any, P>[];
        protected doFlatten(structure: S, array: P[], index: number): void;
        protected doUnflatten(structure: S, array: P[], index: number): void;
    }
    class CompositeFlattener<S, P> extends AbstractFlattener<S, P> {
        private _flatteners;
        constructor(flatteners: Flattener<S, P>[]);
        private copy(structure, array, index, copier);
        protected subFlatteners(): Flattener<any, P>[];
        protected doFlatten(structure: S, array: P[], index: number): void;
        protected doUnflatten(structure: S, array: P[], index: number): void;
    }
    abstract class FlattenerBuilder<S, P> {
        private _flatteners;
        private add(flattener);
        protected primitive(getter: Getter<S, P>, setter: Setter<S, P>): Flattener<S, P>;
        protected array(getter: Getter<S, P[]>, size: number): Flattener<S, P>;
        protected child<C>(getter: Getter<S, C>, flattener: FlattenerBuilder<C, P>): Flattener<S, P>;
        build(): Flattener<S, P>;
    }
    function flatten<S, P>(flattener: Flattener<S, P>, structures: S[], array?: P[], index?: number): P[];
}
declare module Djee {
    class Context {
        private _canvas;
        private _gl;
        canvas: HTMLCanvasElement;
        gl: WebGLRenderingContext;
        constructor(canvasId: string);
        private getCanvas(canvasId);
        private getContext(canvas);
        with<T>(glCode: (gl: WebGLRenderingContext) => T): T;
        shaderFromElement(scriptId: string): Shader;
        shader(type: ShaderType, code: string): Shader;
        linkFromElements(scriptIds: string[]): Program;
        link(shaders: Shader[]): Program;
        newBuffer(): Buffer;
    }
}
declare module Djee {
    class Shader {
        private _context;
        private _type;
        private _code;
        private _shader;
        context: Context;
        type: ShaderType;
        code: string;
        shader: WebGLShader;
        constructor(context: Context, type: ShaderType, code: string);
        delete(): void;
        static fromElement(context: Context, scriptId: string): Shader;
        private static getScript(scriptId);
        private static getShaderType(type);
        private makeShader(gl, type, code);
    }
    enum ShaderType {
        VertexShader,
        FragmentShader,
    }
}
declare module Djee {
    class Program {
        private _context;
        private _shaders;
        private _program;
        context: Context;
        shaders: Shader[];
        program: WebGLProgram;
        constructor(context: Context, shaders: Shader[]);
        private makeProgram(gl, shaders);
        delete(): void;
        use(): void;
        locateAttribute(name: string, size: number): Attribute;
        locateUniform(name: string, size: number): Uniform;
    }
}
declare module Djee {
    class Attribute {
        private _program;
        private _name;
        private _size;
        private _location;
        program: Program;
        name: string;
        size: number;
        location: number;
        constructor(program: Program, name: string, size: number);
        pointTo(buffer: Buffer, stride?: number, offset?: number): void;
    }
}
declare module Djee {
    class Uniform {
        private _program;
        private _name;
        private _size;
        private _location;
        private _setter;
        private _data;
        program: Program;
        name: string;
        size: number;
        location: WebGLUniformLocation;
        constructor(program: Program, name: string, size: number);
        private getSetter(gl, size);
        data: number[];
    }
}
declare module Djee {
    class Buffer {
        private _context;
        private _buffer;
        private _data;
        context: Context;
        buffer: WebGLBuffer;
        constructor(context: Context);
        bind<T>(glCode: (gl: WebGLRenderingContext) => T): T;
        data: number[];
    }
}
declare module Djee {
    function copyOf<T>(array: T[]): T[];
}
declare module Gear {
    class Call {
        private _callable;
        private _timer;
        constructor(callable: Callable);
        now(): void;
        later(): void;
        cancel(): void;
    }
}
declare module Gear {
    abstract class Pluggable<A, B> {
        private _pluggedComponents;
        protected abstract self(): A;
        protected itself: A;
        protected pluggedComponents: B[];
        protected plug(component: Pluggable<B, A>): void;
        protected unplug(component: Pluggable<B, A>): void;
        protected unplugAll(): void;
        private doPlug(component);
        private doUnplug(component);
        protected prePlug(): void;
    }
    abstract class ExclusivelyPluggable<A, B> extends Pluggable<A, B> {
        protected pluggedComponent: B;
        protected prePlug(): void;
    }
}
declare module Gear {
    class Actuator<A> extends ExclusivelyPluggable<Actuator<A>, Controllable<A>> {
        protected self(): this;
        controllable: Controllable<A>;
        drives(controllable: IsControllable<A>): void;
        drivesNone(): void;
        perform(action: A): void;
    }
}
declare module Gear {
    class Sensor<V> extends ExclusivelyPluggable<Sensor<V>, Measurable<V>> {
        private _consumer;
        private _sensing;
        constructor(consumer: Consumer<V>);
        protected self(): this;
        measurable: Measurable<V>;
        probes(measurable: IsMeasurable<V>): void;
        probesNone(): void;
        sense(value: V): void;
        reading: V;
    }
}
declare module Gear {
    interface IsControllable<A> {
        asControllable: Controllable<A>;
    }
    class Controllable<A> extends ExclusivelyPluggable<Controllable<A>, Actuator<A>> implements IsControllable<A> {
        private _consumer;
        constructor(consumer: Consumer<A>);
        protected self(): this;
        asControllable: this;
        actuator: Actuator<A>;
        reactTo(action: A): void;
    }
}
declare module Gear {
    interface IsMeasurable<V> {
        asMeasurable: Measurable<V>;
    }
    class Measurable<V> extends Pluggable<Measurable<V>, Sensor<V>> implements IsMeasurable<V> {
        private _value;
        constructor(value: V);
        protected self(): this;
        asMeasurable: this;
        sensors: Sensor<V>[];
        conduct(value: V): void;
        sample: V;
    }
}
declare module Gear {
    type Reactor<A, V> = (action: A, oldValue: V) => V;
    class Value<A, V> implements IsControllable<A>, IsMeasurable<V> {
        private _reactor;
        private _in;
        private _out;
        asControllable: Controllable<A>;
        asMeasurable: Measurable<V>;
        constructor(value: V, reactor: Reactor<A, V>);
        private reactTo(action);
    }
    class SimpleValue<V> extends Value<V, V> {
        constructor(value: V, reactor?: Reactor<V, V>);
    }
}
declare module Gear {
    type Callable = () => void;
    type Consumer<T> = (input: T) => void;
}
declare module GasketTwist {
    class Rendering {
        private _twist;
        private _scale;
        private _showCorners;
        private _showCenters;
        twist: Gear.SimpleValue<number>;
        scale: Gear.SimpleValue<number>;
        showCorners: Gear.SimpleValue<boolean>;
        showCenters: Gear.SimpleValue<boolean>;
    }
    interface FlattenedSierpinski {
        corners: number[];
        centers: number[];
        stride: number;
    }
    class Sierpinski {
        private _a;
        private _b;
        private _c;
        private _corners;
        private _centers;
        private _tesselation;
        private _inA;
        private _inB;
        private _inC;
        private _depth;
        private _outArrays;
        inA: Gear.Controllable<Space.Vector>;
        inB: Gear.Controllable<Space.Vector>;
        inC: Gear.Controllable<Space.Vector>;
        depth: Gear.SimpleValue<number>;
        outArrays: any;
        constructor(a?: Space.Vector, b?: Space.Vector, c?: Space.Vector, depth?: number);
        private tesselateTriangle();
        private static corners;
        private static centers;
        private doTesselateTriangle(a, b, c, counter, selector?);
        private flattened;
    }
}
declare module GasketTwist {
    class View {
        private _depthDiv;
        private _twistDiv;
        private _scaleDiv;
        private _context;
        private _vertexShader;
        private _fragmentShader;
        private _program;
        private _position;
        private _twist;
        private _scale;
        private _cornersBuffer;
        private _centersBuffer;
        private _inArrays;
        private _inTwist;
        private _inScale;
        private _inShowCorners;
        private _inShowCenters;
        private _inDepth;
        private _rendering;
        inArrays: Gear.Sensor<FlattenedSierpinski>;
        inTwist: Gear.Sensor<number>;
        inScale: Gear.Sensor<number>;
        inShowCorners: Gear.Sensor<boolean>;
        inShowCenters: Gear.Sensor<boolean>;
        inDepth: Gear.Sensor<number>;
        constructor(canvasId: string, depthId: string, twistId: string, scaleId: string);
        private sierpinski;
        private twist;
        private scale;
        private draw();
    }
}
declare module GasketTwist {
    class Controller {
        private _canvas;
        private _cornersCheckbox;
        private _centersCheckbox;
        private _twistCheckbox;
        private _scaleCheckbox;
        private _depthIncButton;
        private _depthDecButton;
        private _outShowCorners;
        private _outShowCenters;
        private _outDepth;
        private _outTwist;
        private _outScale;
        outShowCorners: Gear.Actuator<boolean>;
        outShowCenters: Gear.Actuator<boolean>;
        outDepth: Gear.Actuator<number>;
        outTwist: Gear.Actuator<number>;
        outScale: Gear.Actuator<number>;
        constructor(canvas: string, cornersCheckbox: string, centersCheckbox: string, twistCheckbox: string, scaleCheckbox: string, depthIncButton: string, depthDecButton: string);
        private registerEvents();
        private doMove(x, y);
        private x(element);
        private y(element);
    }
}
declare module GasketTwist {
}
