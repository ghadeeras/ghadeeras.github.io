import { SymbolSet } from "./sets.js";
import * as utils from "./utils.js";
export type Range = {
    min: number;
    max: number;
};
export declare const alphabet: Range;
export interface CharSet extends SymbolSet<number> {
    ranges: Range[];
    size: number;
    toString(): string;
}
export declare function char(c: number): CharSet;
export declare function chars(cs: string): CharSet;
export declare function except(c: number): CharSet;
export declare function range(min: number, max: number): CharSet;
export declare function ranges(...ranges: Range[]): CharSet;
export declare function intersection(...sets: CharSet[]): CharSet;
export declare function union(...sets: CharSet[]): CharSet;
export declare function complement(set: CharSet): CharSet;
export type Overlap = utils.Pair<number[], CharSet>;
export declare function computeOverlaps(...sets: CharSet[]): Overlap[];
export declare const all: CharSet;
export declare const empty: CharSet;
