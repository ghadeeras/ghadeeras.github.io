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
        readonly lengthSquared: number;
        readonly length: number;
        readonly unit: Vector;
        angle(v: Vector): number;
        c(...indexes: number[]): Vector;
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
    const flatteners: {
        composite: <S, C, P>(...flatteners: Flattener<S, P>[]) => Flattener<S, P>;
        primitive: <S, P>(getter: Getter<S, P>, setter: Setter<S, P>) => Flattener<S, P>;
        array: <S, P>(getter: Getter<S, P[]>, size: number) => Flattener<S, P>;
        child: <S, C, P>(getter: Getter<S, C>, flattener: Flattener<C, P>) => Flattener<S, P>;
    };
    function flatten<S, P>(flattener: Flattener<S, P>, structures: S[], array?: P[], index?: number): P[];
}
declare module Djee {
    class Context {
        readonly canvas: HTMLCanvasElement;
        readonly gl: WebGLRenderingContext;
        constructor(canvasId: string);
        private getCanvas;
        private getContext;
        private doGetContext;
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
        readonly context: Context;
        readonly type: ShaderType;
        readonly code: string;
        readonly shader: WebGLShader;
        constructor(context: Context, type: ShaderType, code: string);
        static fromElement(context: Context, scriptId: string): Shader;
        private static getScript;
        private static getShaderType;
        private makeShader;
        delete(): void;
    }
    enum ShaderType {
        VertexShader,
        FragmentShader
    }
}
declare module Djee {
    class Program {
        readonly context: Context;
        readonly shaders: Shader[];
        readonly program: WebGLProgram;
        constructor(context: Context, shaders: Shader[]);
        private makeProgram;
        delete(): void;
        use(): void;
        locateAttribute(name: string, size: number): Attribute;
        locateUniform(name: string, size: number): Uniform;
    }
}
declare module Djee {
    class Attribute {
        readonly program: Program;
        readonly name: string;
        readonly size: number;
        readonly location: number;
        constructor(program: Program, name: string, size: number);
        pointTo(buffer: Buffer, stride?: number, offset?: number): void;
    }
}
declare module Djee {
    class Uniform {
        readonly program: Program;
        readonly name: string;
        readonly size: number;
        readonly location: WebGLUniformLocation;
        readonly setter: (v: Float32Array) => void;
        private _data;
        constructor(program: Program, name: string, size: number);
        private getSetter;
        data: number[];
    }
}
declare module Djee {
    class Buffer {
        readonly context: Context;
        readonly buffer: WebGLBuffer;
        private _data;
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
        protected readonly itself: A;
        protected readonly pluggedComponents: B[];
        protected plug(component: Pluggable<B, A>): void;
        protected unplug(component: Pluggable<B, A>): void;
        protected unplugAll(): void;
        private doPlug;
        private doUnplug;
        protected prePlug(): void;
    }
    abstract class ExclusivelyPluggable<A, B> extends Pluggable<A, B> {
        protected readonly pluggedComponent: any;
        protected prePlug(): void;
    }
}
declare module Gear {
    class Actuator<A> extends ExclusivelyPluggable<Actuator<A>, Controllable<A>> {
        protected self(): this;
        readonly controllable: any;
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
        readonly measurable: any;
        probes(measurable: IsMeasurable<V>): void;
        probesNone(): void;
        sense(value: V): void;
        readonly reading: any;
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
        readonly asControllable: this;
        readonly actuator: any;
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
        readonly asMeasurable: this;
        readonly sensors: any;
        conduct(value: V): void;
        readonly sample: V;
    }
}
declare module Gear {
    type Reactor<A, V> = (action: A, oldValue: V) => V;
    class Value<A, V> implements IsControllable<A>, IsMeasurable<V> {
        private _reactor;
        private _in;
        private _out;
        readonly asControllable: Controllable<A>;
        readonly asMeasurable: Measurable<V>;
        constructor(value: V, reactor: Reactor<A, V>);
        private reactTo;
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
        readonly twist: Gear.SimpleValue<number>;
        readonly scale: Gear.SimpleValue<number>;
        readonly showCorners: Gear.SimpleValue<boolean>;
        readonly showCenters: Gear.SimpleValue<boolean>;
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
        readonly inA: Gear.Controllable<Space.Vector>;
        readonly inB: Gear.Controllable<Space.Vector>;
        readonly inC: Gear.Controllable<Space.Vector>;
        readonly depth: Gear.SimpleValue<number>;
        readonly outArrays: any;
        constructor(a?: Space.Vector, b?: Space.Vector, c?: Space.Vector, depth?: number);
        private tesselateTriangle;
        private static corners;
        private static centers;
        private doTesselateTriangle;
        private readonly flattened;
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
        readonly inArrays: Gear.Sensor<FlattenedSierpinski>;
        readonly inTwist: Gear.Sensor<number>;
        readonly inScale: Gear.Sensor<number>;
        readonly inShowCorners: Gear.Sensor<boolean>;
        readonly inShowCenters: Gear.Sensor<boolean>;
        readonly inDepth: Gear.Sensor<number>;
        constructor(canvasId: string, depthId: string, twistId: string, scaleId: string);
        private sierpinski;
        private twist;
        private scale;
        private draw;
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
        readonly outShowCorners: Gear.Actuator<boolean>;
        readonly outShowCenters: Gear.Actuator<boolean>;
        readonly outDepth: Gear.Actuator<number>;
        readonly outTwist: Gear.Actuator<number>;
        readonly outScale: Gear.Actuator<number>;
        constructor(canvas: string, cornersCheckbox: string, centersCheckbox: string, twistCheckbox: string, scaleCheckbox: string, depthIncButton: string, depthDecButton: string);
        private registerEvents;
        private doMove;
        private x;
        private y;
    }
}
declare module GasketTwist {
}
//# sourceMappingURL=ghadeeras.d.ts.map