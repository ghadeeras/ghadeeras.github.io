export type StreamPosition = {
    readonly index: number;
    readonly line: number;
    readonly column: number;
};
export interface InputStream<T> {
    position(): StreamPosition;
    hasMoreSymbols(): boolean;
    readNextSymbol(): T;
    mark(): void;
    unmark(): void;
    reset(): void;
}
export declare class TextInputStream implements InputStream<number> {
    private text;
    private readonly markedPositions;
    private index;
    private line;
    private column;
    constructor(text: string);
    position(): {
        index: number;
        line: number;
        column: number;
    };
    hasMoreSymbols(): boolean;
    readNextSymbol(): number;
    private consumeNextSymbol;
    mark(): void;
    unmark(): void;
    reset(): void;
}
