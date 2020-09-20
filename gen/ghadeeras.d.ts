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
        locateUniform(name: string, size: number, matrix?: boolean): Uniform;
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
        readonly matrix: boolean;
        readonly location: WebGLUniformLocation;
        readonly setter: (v: Float64Array) => void;
        private _data;
        constructor(program: Program, name: string, size: number, matrix?: boolean);
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
        get data(): Float32Array;
        set data(data: Float32Array);
        set untypedData(data: number[]);
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
        through<R>(effect: Effect<T, R>, defaultValue?: R): Flow<R>;
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
    function choice<T>(truwValue: T, falseValue: T): Effect<boolean, T>;
}
declare module Gear {
    type PointerPosition = [number, number];
    type MouseButtons = [boolean, boolean, boolean];
    type Dragging = {
        startPos: PointerPosition;
        pos: PointerPosition;
        start: boolean;
        end: boolean;
        shift: boolean;
        ctrl: boolean;
        alt: boolean;
    };
    function checkbox(elementId: string): Flow<boolean>;
    function readableValue(elementId: string): Flow<string>;
    function elementEvents(elementId: string): ElementEvents;
    class ElementEvents {
        readonly element: HTMLElement;
        readonly elementPos: PointerPosition;
        private readonly lazyClick;
        private readonly lazyMouseDown;
        private readonly lazyMouseUp;
        private readonly lazyMouseMove;
        private readonly lazyTouchStart;
        private readonly lazyTouchEnd;
        private readonly lazyTouchMove;
        private readonly lazyClickPos;
        private readonly lazyTouchStartPos;
        private readonly lazyMousePos;
        private readonly lazyTouchPos;
        private readonly lazyDragging;
        private readonly lazyMouseButtons;
        constructor(element: HTMLElement);
        parent(): ElementEvents;
        get center(): PointerPosition;
        private newClick;
        private newMouseDown;
        private newMouseUp;
        private newMouseMove;
        private newTouchStart;
        private newTouchEnd;
        private newTouchMove;
        private newClickPos;
        private newTouchStartPos;
        private newMousePos;
        private newTouchPos;
        private touchesToPositions;
        private newDragging;
        private oneTouch;
        private startDragging;
        private drag;
        private endDragging;
        private doEndDragging;
        private relativePos;
        private newMouseButtons;
        get click(): Flow<MouseEvent>;
        get mouseDown(): Flow<MouseEvent>;
        get mouseUp(): Flow<MouseEvent>;
        get mouseMove(): Flow<MouseEvent>;
        get touchStart(): Flow<TouchEvent>;
        get touchEnd(): Flow<TouchEvent>;
        get touchMove(): Flow<TouchEvent>;
        get clickPos(): Flow<PointerPosition>;
        get touchStartPos(): Flow<PointerPosition[]>;
        get mousePos(): Flow<PointerPosition>;
        get touchPos(): Flow<PointerPosition[]>;
        get dragging(): Flow<Dragging>;
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
    function load(path: string, onready: Gear.Callable, ...files: [string, Consumer<string>][]): void;
}
declare module Space {
    class Vector {
        readonly coordinates: number[];
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
        withDims(n: number): Vector;
        swizzle(...indexes: number[]): Vector;
        cross(v: Vector): Vector;
        sameAs(v: Vector, precision?: number): boolean;
        prod(matrix: Matrix): Vector;
        component(i: number): Vector;
    }
}
declare module Space {
    class Matrix {
        readonly columnsCount: number;
        readonly rowsCount: number;
        readonly columns: Vector[];
        constructor(columns: Vector[]);
        get transposed(): Matrix;
        get determinant(): number;
        get inverse(): Matrix;
        private static sign;
        private sub;
        prod(vector: Vector): Vector;
        by(matrix: Matrix): Matrix;
        get asColumnMajorArray(): number[];
        get asRowMajorArray(): number[];
        static identity(): Matrix;
        static scaling(sx: number, sy: number, sz: number): Matrix;
        static translation(tx: number, ty: number, tz: number): Matrix;
        static rotation(angle: number, axis: Vector): Matrix;
        static view(direction: Vector, up: Vector): Matrix;
        static globalView(eyePos: Vector, objPos: Vector, up: Vector): Matrix;
        static project(focalRatio: number, horizon: number, aspectRatio?: number): Matrix;
    }
    class MatrixStack {
        private _matrix;
        private stack;
        apply(matrix: Matrix): Matrix;
        push(): void;
        pop(): void;
        get matrix(): Matrix;
    }
}
declare module Space {
    module WA {
        type Caster<E extends WebAssembly.Exports> = (exports: WebAssembly.Exports) => E;
        type Module<E extends WebAssembly.Exports> = {
            readonly sourceFile: string;
            readonly caster: Caster<E>;
            exports?: E;
        };
        type Modules = Readonly<Record<string, Module<WebAssembly.Exports>>>;
        type ModuleName<M extends Modules> = keyof M;
        function module<E extends WebAssembly.Exports>(sourceFile: string, caster: Caster<E>): Module<E>;
        function load<M extends Modules>(modules: M, first: ModuleName<M>, ...rest: ModuleName<M>[]): Promise<M>;
    }
}
declare module Space {
    function vec(...coordinates: number[]): Vector;
    function mat(...columns: Vector[]): Matrix;
    type Reference = number;
    type StackExports = {
        stack: WebAssembly.Memory;
        enter: () => void;
        leave: () => void;
        allocate8: (size: number) => Reference;
        allocate16: (size: number) => Reference;
        allocate32: (size: number) => Reference;
        allocate64: (size: number) => Reference;
    };
    type SpaceExports = {
        vec2: (x: number, y: number) => Reference;
        vec3: (x: number, y: number, z: number) => Reference;
        vec4: (x: number, y: number, z: number, w: number) => Reference;
        vec2Clone: (v: Reference) => Reference;
        vec3Clone: (v: Reference) => Reference;
        vec4Clone: (v: Reference) => Reference;
        vec2Swizzle: (v: Reference, x: number, y: number) => Reference;
        vec3Swizzle: (v: Reference, x: number, y: number, z: number) => Reference;
        vec4Swizzle: (v: Reference, x: number, y: number, z: number, w: number) => Reference;
        vecX: (v: Reference) => number;
        vecY: (v: Reference) => number;
        vecZ: (v: Reference) => number;
        vecW: (v: Reference) => number;
        vec2Add: (v1: Reference, v2: Reference) => Reference;
        vec3Add: (v1: Reference, v2: Reference) => Reference;
        vec4Add: (v1: Reference, v2: Reference) => Reference;
        vec2Sub: (v1: Reference, v2: Reference) => Reference;
        vec3Sub: (v1: Reference, v2: Reference) => Reference;
        vec4Sub: (v1: Reference, v2: Reference) => Reference;
        vec2Scale: (v1: Reference, factor: number) => Reference;
        vec3Scale: (v1: Reference, factor: number) => Reference;
        vec4Scale: (v1: Reference, factor: number) => Reference;
        vec2Dot: (v1: Reference, v2: Reference) => number;
        vec3Dot: (v1: Reference, v2: Reference) => number;
        vec4Dot: (v1: Reference, v2: Reference) => number;
        vec2Cross: (v1: Reference, v2: Reference) => number;
        vec3Cross: (v1: Reference, v2: Reference) => Reference;
        vec2LengthSquared: (v: Reference) => number;
        vec3LengthSquared: (v: Reference) => number;
        vec4LengthSquared: (v: Reference) => number;
        vec2Length: (v: Reference) => number;
        vec3Length: (v: Reference) => number;
        vec4Length: (v: Reference) => number;
        vec2Unit: (v: Reference) => Reference;
        vec3Unit: (v: Reference) => Reference;
        vec4Unit: (v: Reference) => Reference;
    };
    type ScalarFieldExports = {
        tessellateTetrahedron: (contourValue: number, point0: Reference, point1: Reference, point2: Reference, point3: Reference) => Reference;
        tessellateCube: (contourValue: number, point0: Reference, point1: Reference, point2: Reference, point3: Reference, point4: Reference, point5: Reference, point6: Reference, point7: Reference) => Reference;
        tesselateScalarField(fieldRef: Reference, resolution: number, contourValue: number): Reference;
    };
    const modules: {
        stack: WA.Module<StackExports>;
        space: WA.Module<SpaceExports>;
        scalarField: WA.Module<ScalarFieldExports>;
    };
    function initWaModules(onready: () => void): void;
}
declare module Mandelbrot {
    function init(): void;
}
declare module ScalarField {
    function initTetrahedronDemo(): void;
}
declare module ScalarField {
    function initCubeDemo(): void;
}
declare module ScalarField {
    function init(): void;
}
declare module ScalarField {
}
declare module Sierpinski {
    interface FlattenedSierpinski {
        corners: number[];
        centers: number[];
        stride: number;
    }
    function sierpinski(depth?: Gear.Source<number>, a?: Gear.Source<Space.Vector>, b?: Gear.Source<Space.Vector>, c?: Gear.Source<Space.Vector>): Gear.Source<FlattenedSierpinski>;
    function tesselatedTriangle(a: Space.Vector, b: Space.Vector, c: Space.Vector, depth: number): FlattenedSierpinski;
}
declare module Sierpinski {
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
declare module Sierpinski {
    class Controller {
        readonly showCorners: Gear.Source<boolean>;
        readonly showCenters: Gear.Source<boolean>;
        readonly depth: Gear.Source<number>;
        readonly twist: Gear.Source<number>;
        readonly scale: Gear.Source<number>;
        constructor(canvasId: string, cornersCheckboxId: string, centersCheckboxId: string, twistCheckboxId: string, scaleCheckboxId: string, depthIncButtonId: string, depthDecButtonId: string);
    }
}
declare module Sierpinski {
    function init(): void;
}
declare module Tree {
    class MatriciesGenerator {
        private _verticalAngle;
        private _depth;
        private branch1Matrix;
        private branch2Matrix;
        private branch3Matrix;
        readonly scale: number;
        readonly branchCount = 3;
        readonly horizontalAngle: number;
        readonly axis1: Space.Vector;
        readonly axis2: Space.Vector;
        readonly axis3: Space.Vector;
        readonly scaling: Space.Matrix;
        readonly translation: Space.Matrix;
        constructor();
        private init;
        get verticalAngle(): number;
        set verticalAngle(value: number);
        get depth(): number;
        set depth(value: number);
        generateMatricies(): number[][];
        doGenerateMatricies(result: Space.Matrix[], depth: number, matrix: Space.Matrix): void;
    }
}
declare module Tree {
    class Renderer {
        private context;
        private buffer;
        private matModel;
        private matSubModel;
        private matView;
        private matProjection;
        private lightPosition;
        private color;
        private shininess;
        private fogginess;
        private twist;
        private matrices;
        constructor(vertexShaderCode: string, fragmentShaderCode: string, matrices: number[][]);
        matricesSink(): Gear.Sink<number[][]>;
        rotationSink(): Gear.Sink<Gear.PointerPosition>;
        lightPositionSink(): Gear.Sink<Gear.PointerPosition>;
        colorSink(): Gear.Sink<Gear.PointerPosition>;
        shininessSink(): Gear.Sink<number>;
        fogginessSink(): Gear.Sink<number>;
        twistSink(): Gear.Sink<number>;
        private draw;
        private vertexData;
    }
}
declare module Tree {
    function init(): void;
}
declare module WebGLLab {
    type ProgramSample = {
        name: string;
        vertexShader: string;
        fragmentShader: string;
    };
    const samples: ProgramSample[];
    function loadShaders(sample: ProgramSample, consumer: Gear.Consumer<ProgramSample>): void;
}
declare module WebGLLab {
    type Named = {
        name: string;
    };
    class View {
        private context;
        private buffer;
        private program;
        private defaultSample;
        private lod;
        private mode;
        private cullingEnabled;
        private programScalars;
        private xScalar;
        private yScalar;
        constructor(convasId: string, samples: ProgramSample[]);
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
//# sourceMappingURL=ghadeeras.d.ts.map