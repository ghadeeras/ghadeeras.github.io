import * as streams from './streams.js';
import * as tokens from './tokens.js';
import * as regex from './regex.js';
export declare class Scanner {
    readonly errorTokenType: tokens.TokenType<string>;
    readonly eofTokenType: tokens.TokenType<boolean>;
    private readonly tokenTypes;
    private readonly _tokenTypeNames;
    private _automaton;
    private define;
    private get automaton();
    protected tieBreak(tokensTypes: tokens.TokenType<any>[]): tokens.TokenType<any> | TokenTypeWrapper<any>;
    get tokenTypeNames(): string[];
    tokenTypeName<T>(tokenType: tokens.TokenType<T>): string | undefined;
    private initTokenNames;
    protected string(pattern: regex.RegEx): tokens.TokenType<string>;
    protected float(pattern: regex.RegEx): tokens.TokenType<number>;
    protected integer(pattern: regex.RegEx): tokens.TokenType<number>;
    protected boolean(pattern: regex.RegEx): tokens.TokenType<boolean>;
    protected keyword(word: string): tokens.TokenType<boolean>;
    protected op(op: string): tokens.TokenType<boolean>;
    protected delimiter(del: string): tokens.TokenType<boolean>;
    iterator(stream: streams.InputStream<number>): Generator<tokens.Token<any>, void, unknown>;
    nextToken(stream: streams.InputStream<number>): tokens.Token<any>;
    randomToken(shortness?: number): tokens.Token<any>;
    private next;
}
declare class TokenTypeWrapper<T> implements tokens.TokenType<T> {
    private tokenType;
    private array;
    readonly index: number;
    constructor(tokenType: tokens.TokenType<T>, array: tokens.TokenType<T>[], index?: number);
    get pattern(): regex.RegEx;
    parse(lexeme: string): T;
    stringify(value: T): string;
    token(lexeme: string, position: streams.StreamPosition): tokens.Token<T>;
    parsedAs(parser: (lexeme: string) => T): tokens.TokenType<T>;
    serializedAs(serializer: (value: T) => string): tokens.TokenType<T>;
}
export {};
