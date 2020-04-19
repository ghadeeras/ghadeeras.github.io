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
        get lengthSquared(): number;
        get length(): number;
        get unit(): Vector;
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
        flattenAll(structures: S[], array?: P[], index?: number): P[];
        unflatten(structure: S, array: P[], index?: number): any;
    }
    const flatteners: {
        composite: <S, C, P>(...flatteners: Flattener<S, P>[]) => Flattener<S, P>;
        primitive: <S_1, P_1>(getter: Getter<S_1, P_1>, setter: Setter<S_1, P_1>) => Flattener<S_1, P_1>;
        array: <S_2, P_2>(getter: Getter<S_2, P_2[]>, size: number) => Flattener<S_2, P_2>;
        child: <S_3, C_1, P_3>(getter: Getter<S_3, C_1>, flattener: Flattener<C_1, P_3>) => Flattener<S_3, P_3>;
    };
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
        vertexShader(code: string): Shader;
        fragmentShader(code: string): Shader;
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
    type Variable = {
        name: string;
        type: number;
        dimensions: number;
        size: number;
    };
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
        get uniforms(): Variable[];
        get attributes(): Variable[];
        private activeInfos;
        private dimensions;
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
        get data(): number[];
        set data(data: number[]);
    }
}
declare module Djee {
    class Buffer {
        readonly context: Context;
        readonly buffer: WebGLBuffer;
        private _data;
        constructor(context: Context);
        bind<T>(glCode: (gl: WebGLRenderingContext) => T): T;
        get data(): number[];
        set data(data: number[]);
    }
}
declare module Djee {
    function copyOf<T>(array: T[]): T[];
}
declare module Gear {
    function lazy<T>(constructor: Supplier<T>): Supplier<T>;
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
    interface Source<T> {
        readonly producer: Producer<T>;
        to(...sinks: Sink<T>[]): void;
    }
    interface Sink<T> {
        readonly consumer: Consumer<T>;
    }
    abstract class BaseSource<T> implements Source<T> {
        abstract get producer(): Producer<T>;
        flow(): Flow<T>;
        to(...sinks: Sink<T>[]): void;
    }
    class CompositeSource<T> extends BaseSource<T> {
        private readonly sources;
        private readonly _producer;
        constructor(sources: Source<T>[]);
        get producer(): Producer<T>;
    }
    class CompositeSink<T> implements Sink<T> {
        private readonly sinks;
        private readonly _consumer;
        constructor(sinks: Sink<T>[]);
        get consumer(): Consumer<T>;
    }
    class Flow<T> extends BaseSource<T> {
        private readonly output;
        private constructor();
        filter(predicate: Predicate<T>): Flow<T>;
        map<R>(mapper: Mapper<T, R>): Flow<R>;
        reduce<R>(reducer: Reducer<T, R>, identity: R): Flow<R>;
        defaultsTo(value: T): Flow<T>;
        then<R>(effect: Effect<T, R>, defaultValue?: T): Flow<R>;
        through<R>(effect: Effect<T, R>): Flow<R>;
        branch(...flowBuilders: Consumer<Flow<T>>[]): this;
        get producer(): Consumer<Consumer<T>>;
        static from<T>(...sources: Source<T>[]): Flow<T>;
    }
    function consumerFlow<T>(flowBuilder: Consumer<Flow<T>>): Consumer<T>;
    function sinkFlow<T>(flowBuilder: Consumer<Flow<T>>): Sink<T>;
    function sink<T>(consumer: Consumer<T>): Sink<T>;
}
declare module Gear {
    class Value<T> extends BaseSource<T> implements Sink<T> {
        private _value;
        private readonly consumers;
        constructor(_value?: T);
        get value(): T;
        set value(newValue: T);
        private setValue;
        supply(...consumers: Consumer<T>[]): this;
        private notify;
        get consumer(): Consumer<T>;
        get producer(): Producer<T>;
        static setOf<C>(...values: Value<C>[]): ValueSet<C>;
    }
    class ValueSet<T> extends BaseSource<T> implements Sink<T> {
        private readonly source;
        private readonly sink;
        constructor(values: Value<T>[]);
        get producer(): Producer<T>;
        get consumer(): Consumer<T>;
    }
}
declare module Gear {
    function reduce<T, R>(reducer: Reducer<T, R>, identity: R): Effect<T, R>;
    function map<T, R>(mapper: Mapper<T, R>): Effect<T, R>;
    function filter<T>(predicate: Predicate<T>): Effect<T, T>;
    function later<T>(): Effect<T, T>;
    function flowSwitch<T>(on: Source<boolean>, initialState?: boolean): Effect<T, T>;
    function repeater<T>(interval: number, restValue: T): Effect<T, T>;
    function defaultsTo<T>(value: T): Effect<T, T>;
}
declare module Gear {
    type PointerPosition = [number, number];
    type MouseButtons = [boolean, boolean, boolean];
    function checkbox(elementId: string): Flow<boolean>;
    function readableValue(elementId: string): Flow<string>;
    function elementEvents(elementId: string): ElementEvents;
    class ElementEvents {
        readonly element: HTMLElement;
        readonly elementPos: PointerPosition;
        private readonly lazyClick;
        private readonly lazyMousePos;
        private readonly lazyTouchPos;
        private readonly lazyMouseButtons;
        constructor(element: HTMLElement);
        parent(): ElementEvents;
        private newClick;
        private newMousePos;
        private newTouchPos;
        private relativePos;
        private newMouseButtons;
        private setButton;
        get click(): Flow<PointerPosition>;
        get mousePos(): Flow<PointerPosition>;
        get touchPos(): Flow<PointerPosition[]>;
        get mouseButons(): Flow<MouseButtons>;
        static create(elementId: string): ElementEvents;
    }
}
declare module Gear {
    function text(elementId: string): Sink<string>;
    function writeableValue(elementId: string): Sink<string>;
}
declare module Gear {
    type Callable = () => void;
    type Supplier<T> = () => T;
    type Consumer<T> = (input: T) => void;
    type Producer<T> = Consumer<Consumer<T>>;
    type Reducer<T, R> = (value: T, accumulator: R) => R;
    type Mapper<T, R> = (value: T) => R;
    type Predicate<T> = Mapper<T, boolean>;
    type Effect<C, E> = (value: C, result: Consumer<E>) => void;
    function intact<T>(): Mapper<T, T>;
    function compositeConsumer<T>(...consumers: Consumer<T>[]): Consumer<T>;
    function causeEffectLink<C, E>(causeProducer: Producer<C>, effect: Effect<C, E>, effectConsumer: Consumer<E>): void;
}
declare module WebGLLab {
    type ProgramSample = {
        name: string;
        vertexShader: string;
        fragmentShader: string;
    };
    const samples: ProgramSample[];
}
declare module WebGLLab {
    type Named = {
        name: string;
    };
    class View {
        private defaultShaders;
        private context;
        private buffer;
        private program;
        private lod;
        private mode;
        private cullingEnabled;
        private programScalars;
        private xScalar;
        private yScalar;
        constructor(convasId: string, templates: ProgramSample[]);
        get mesh(): Gear.Supplier<Gear.Sink<boolean>>;
        get levelOfDetail(): Gear.Supplier<Gear.Sink<number>>;
        get compiler(): Gear.Supplier<Gear.Sink<ProgramSample>>;
        get editor(): Gear.Supplier<Gear.Sink<ProgramSample>>;
        get xBinding(): Gear.Supplier<Gear.Sink<number>>;
        get yBinding(): Gear.Supplier<Gear.Sink<number>>;
        get xy(): Gear.Supplier<Gear.Sink<[number, number]>>;
        private recompile;
        private setValue;
        private reflectOn;
        private toScalars;
        private resetBuffer;
        private draw;
    }
}
declare module WebGLLab {
    class Controller {
        get program(): Gear.Supplier<Gear.Flow<ProgramSample>>;
        get mesh(): Gear.Supplier<Gear.Flow<boolean>>;
        get levelOfDetails(): Gear.Supplier<Gear.Flow<number>>;
        get programSample(): Gear.Supplier<Gear.Flow<number>>;
        get mouseXBinding(): Gear.Supplier<Gear.Flow<number>>;
        get mouseYBinding(): Gear.Supplier<Gear.Flow<number>>;
        get mouseXY(): Gear.Supplier<Gear.Flow<number[]>>;
    }
}
declare module WebGLLab {
    function init(): void;
}
declare module GasketTwist2 {
    interface FlattenedSierpinski {
        corners: number[];
        centers: number[];
        stride: number;
    }
    function sierpinski(depth?: Gear.Source<number>, a?: Gear.Source<Space.Vector>, b?: Gear.Source<Space.Vector>, c?: Gear.Source<Space.Vector>): Gear.Source<FlattenedSierpinski>;
    function tesselatedTriangle(a: Space.Vector, b: Space.Vector, c: Space.Vector, depth: number): FlattenedSierpinski;
}
declare module GasketTwist2 {
    class View {
        private readonly context;
        private readonly vertexShader;
        private readonly fragmentShader;
        private readonly program;
        private readonly shaderPosition;
        private readonly shaderTwist;
        private readonly shaderScale;
        private readonly cornersBuffer;
        private readonly centersBuffer;
        private mustShowCorners;
        private mustShowCenters;
        private stride;
        readonly sierpinsky: Gear.Sink<FlattenedSierpinski>;
        readonly showCorners: Gear.Sink<boolean>;
        readonly showCenters: Gear.Sink<boolean>;
        readonly depth: Gear.Sink<number>;
        readonly twist: Gear.Sink<number>;
        readonly scale: Gear.Sink<number>;
        constructor(canvasId: string, depthId: string, twistId: string, scaleId: string);
        private source;
        private setSierpinski;
        private setTwist;
        private setScale;
        private setShowCorners;
        private setShowCenters;
        private draw;
    }
}
declare module GasketTwist2 {
    class Controller {
        readonly showCorners: Gear.Source<boolean>;
        readonly showCenters: Gear.Source<boolean>;
        readonly depth: Gear.Source<number>;
        readonly twist: Gear.Source<number>;
        readonly scale: Gear.Source<number>;
        constructor(canvasId: string, cornersCheckboxId: string, centersCheckboxId: string, twistCheckboxId: string, scaleCheckboxId: string, depthIncButtonId: string, depthDecButtonId: string);
    }
}
declare module GasketTwist2 {
    function init(): void;
}
//# sourceMappingURL=ghadeeras.d.ts.map