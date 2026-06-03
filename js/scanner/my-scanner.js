import * as L from "languasaurus";
const lowerCaseChar = L.charIn("a-z");
const upperCaseChar = L.charIn("A-Z");
const alphaChar = L.choice(lowerCaseChar, upperCaseChar);
const numericChar = L.charIn("0-9");
const alphaNumericChar = L.choice(alphaChar, numericChar);
export const tokenDefs = {
    whiteSpace: L.string(L.oneOrMore(L.charFrom(" \t\r\n"))),
    comment: L.string(L.concat(L.char("#"), L.zeroOrMore(L.charOtherThan("\n")), L.char("\n"))),
    keywordIf: L.boolean(L.word("if")),
    keywordOtherwise: L.boolean(L.word("otherwise")),
    keywordWhere: L.boolean(L.word("where")),
    identifier: L.string(L.concat(alphaChar, L.zeroOrMore(alphaNumericChar))),
    literalInt: L.integer(L.oneOrMore(numericChar)),
    literalFloat: L.float(L.concat(L.zeroOrMore(numericChar), L.char("."), L.oneOrMore(numericChar))),
    literalString: L.string(L.choice(L.concat(L.char('"'), L.zeroOrMore(L.charOtherThan('"')), L.char('"')), L.concat(L.char("'"), L.zeroOrMore(L.charOtherThan("'")), L.char("'")))),
    literalBoolean: L.boolean(L.choice(L.word("true"), L.word("false"))).parsedAs(lexeme => lexeme == "true"),
    opPlus: L.boolean(L.char("+")),
    opMinus: L.boolean(L.char("-")),
    opMul: L.boolean(L.char("*")),
    opDiv: L.boolean(L.char("/")),
    opPow: L.boolean(L.char("^")),
    opNot: L.boolean(L.char("!")),
    opAnd: L.boolean(L.char("&")),
    opOr: L.boolean(L.char("|")),
    opEqual: L.op("=="),
    opNotEqual: L.op("!="),
    opGreaterThan: L.op(">"),
    opLessThan: L.op("<"),
    opGreaterThanOrEqual: L.op(">="),
    opLessThanOrEqual: L.op("<="),
    opDeclare: L.op("="),
    delCommaParen: L.delimiter(","),
    delOpenParen: L.delimiter("("),
    delCloseParen: L.delimiter(")"),
    delOpenSquare: L.delimiter("["),
    delCloseSquare: L.delimiter("]"),
    delOpenCurly: L.delimiter("{"),
    delCloseCurly: L.delimiter("}")
};
export class MyScanner extends L.Scanner {
    constructor() {
        super(tokenDefs);
    }
    tokenize(text) {
        let output = "";
        for (const token of this.iterator(new L.TextInputStream(text))) {
            if (token.tokenType == tokenDefs.whiteSpace) {
                continue;
            }
            output +=
                `${this.tokenName(token)} at [Line: ${token.position.line}, Column: ${token.position.column}]:\n` +
                    `${token.lexeme}\n` +
                    "----------\n";
        }
        return output;
    }
    tokenName(token) {
        switch (token.tokenType) {
            case L.error: return "ERROR";
            case L.eof: return "EOF";
            default: return this.tokenTypeName(token.tokenType);
        }
    }
}
//# sourceMappingURL=my-scanner.js.map