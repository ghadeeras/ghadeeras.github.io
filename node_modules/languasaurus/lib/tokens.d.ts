import * as streams from './streams.js';
import * as regex from './regex.js';
export interface TokenType<T> {
    pattern: regex.RegEx;
    parse(lexeme: string): T;
    stringify(value: T): string;
    token(lexeme: string, position: streams.StreamPosition): Token<T>;
    parsedAs(parser: (lexeme: string) => T): TokenType<T>;
    serializedAs(serializer: (value: T) => string): TokenType<T>;
}
export declare function textualToken(pattern: regex.RegEx): TokenType<string>;
export declare function floatToken(pattern: regex.RegEx): TokenType<number>;
export declare function integerToken(pattern: regex.RegEx): TokenType<number>;
export declare function booleanToken(pattern: regex.RegEx): TokenType<boolean>;
export declare class Token<T> {
    readonly tokenType: TokenType<T>;
    readonly lexeme: string;
    readonly position: streams.StreamPosition;
    readonly value: T;
    constructor(tokenType: TokenType<T>, lexeme: string, position: streams.StreamPosition);
}
