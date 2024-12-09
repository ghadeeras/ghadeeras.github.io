import * as charsets from './charsets.js';
import * as utils from './utils.js';
type StateMapper<R1, R2> = utils.Mapper<State<R1>, State<R2>>;
type StateCloner<R> = StateMapper<R, R>;
export interface Matcher<R> {
    lastRecognized: R[];
    recognized: R[];
    match(char: number): boolean;
    randomMatch(): number | null;
    reset(): void;
}
export declare function state<R>(...recognizables: R[]): State<R>;
export declare function automaton<R>(start: State<R>): Automaton<R>;
export declare function choice<R>(automaton: Automaton<R>, ...automata: Automaton<R>[]): Automaton<R>;
export declare function concat<R>(automaton: Automaton<R>, ...automata: Automaton<R>[]): Automaton<R>;
export declare class Automaton<R> {
    private _states;
    private _transientStates;
    private _finalStates;
    readonly startState: State<R>;
    private constructor();
    get isOptional(): boolean;
    get states(): State<R>[];
    get transientStates(): State<R>[];
    get finalStates(): State<R>[];
    newMatcher(): Matcher<R>;
    toString(): string;
    deterministic(): Automaton<R>;
    optional(): Automaton<R>;
    repeated(): Automaton<R>;
    clone(stateCloner?: StateCloner<R>): Automaton<R>;
    map<RR>(mapper: utils.Mapper<R, RR>): Automaton<RR>;
    mapStates<RR>(stateMapper: StateMapper<R, RR>): Automaton<RR>;
    static choice<R>(automaton: Automaton<R>, ...automata: Automaton<R>[]): Automaton<R>;
    static concat<R>(automaton: Automaton<R>, ...automata: Automaton<R>[]): Automaton<R>;
    static create<R>(start: State<R>): Automaton<R>;
    private static append;
    private static allStatesFrom;
    private static traverse;
    private static doTraverse;
    private cloneNoDuplicates;
    private reorganizeTriggerOverlaps;
    private cloneNoShallowDuplicates;
    private static state;
    private static unionState;
}
export declare class State<R> {
    private _recognizables;
    private _transitions;
    protected constructor(recognizables: R[]);
    get recognizables(): R[];
    get transitions(): Transition<R>[];
    get isFinal(): boolean;
    get isTransient(): boolean;
    reorganizeTriggerOverlaps(): void;
    onCharFrom(chars: string, target: State<R>): State<R>;
    onCharIn(range: string, target: State<R>): State<R>;
    onCharNotFrom(chars: string, target: State<R>): State<R>;
    onCharOutOf(range: string, target: State<R>): State<R>;
    on(trigger: charsets.CharSet, target: State<R>, optimized?: boolean): State<R>;
    identicalTo(that: State<R>): boolean;
    static create<R>(...recognizables: R[]): State<R>;
}
declare class Transition<R> {
    readonly trigger: charsets.CharSet;
    readonly target: State<R>;
    constructor(trigger: charsets.CharSet, target: State<R>);
    apply(char: number): State<R> | null;
    identicalTo(that: Transition<R>): boolean;
}
export {};
