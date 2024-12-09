class TokenTypeImpl {
    constructor(pattern, parser, serializer) {
        this.pattern = pattern;
        this.parser = parser;
        this.serializer = serializer;
        if (pattern.automaton.isOptional) {
            throw new Error("Token types cannot have patterns that match empty strings");
        }
    }
    parse(lexeme) {
        return this.parser(lexeme);
    }
    stringify(value) {
        return this.serializer(value);
    }
    token(lexeme, position) {
        return new Token(this, lexeme, position);
    }
    parsedAs(parser) {
        return new TokenTypeImpl(this.pattern, parser, this.serializer);
    }
    serializedAs(serializer) {
        return new TokenTypeImpl(this.pattern, this.parser, serializer);
    }
}
export function textualToken(pattern) {
    return new TokenTypeImpl(pattern, s => s, s => s);
}
export function floatToken(pattern) {
    return new TokenTypeImpl(pattern, s => Number.parseFloat(s), n => n.toString());
}
export function integerToken(pattern) {
    return new TokenTypeImpl(pattern, s => Number.parseInt(s), n => n.toFixed(0));
}
export function booleanToken(pattern) {
    return new TokenTypeImpl(pattern, s => s === "true", b => b ? "true" : "false");
}
export class Token {
    constructor(tokenType, lexeme, position) {
        this.tokenType = tokenType;
        this.lexeme = lexeme;
        this.position = position;
        this.value = tokenType.parse(lexeme);
    }
}
