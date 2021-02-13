import * as L from "../../languasaurus/js/index.js";
export class MyScanner extends L.Scanner {
    constructor() {
        super(...arguments);
        this.lowerCaseChar = L.charIn("a-z");
        this.upperCaseChar = L.charIn("A-Z");
        this.alphaChar = L.choice(this.lowerCaseChar, this.upperCaseChar);
        this.numericChar = L.charIn("0-9");
        this.alphaNumericChar = L.choice(this.alphaChar, this.numericChar);
        this.whiteSpace = this.string(L.oneOrMore(L.charFrom(" \t\r\n")));
        this.comment = this.string(L.concat(L.char("#"), L.zeroOrMore(L.charOtherThan("\n")), L.char("\n")));
        this.keywordIf = this.boolean(L.word("if"));
        this.keywordOtherwise = this.boolean(L.word("otherwise"));
        this.keywordWhere = this.boolean(L.word("where"));
        this.identifier = this.string(L.concat(this.alphaChar, L.zeroOrMore(this.alphaNumericChar)));
        this.literalInt = this.integer(L.oneOrMore(this.numericChar));
        this.literalFloat = this.float(L.concat(L.zeroOrMore(this.numericChar), L.char("."), L.oneOrMore(this.numericChar)));
        this.literalString = this.string(L.choice(L.concat(L.char('"'), L.zeroOrMore(L.charOtherThan('"')), L.char('"')), L.concat(L.char("'"), L.zeroOrMore(L.charOtherThan("'")), L.char("'"))));
        this.literalBoolean = this.boolean(L.choice(L.word("true"), L.word("false"))).parsedAs(lexeme => lexeme == "true");
        this.opPlus = this.boolean(L.char("+"));
        this.opMinus = this.boolean(L.char("-"));
        this.opMul = this.boolean(L.char("*"));
        this.opDiv = this.boolean(L.char("/"));
        this.opPow = this.boolean(L.char("^"));
        this.opNot = this.boolean(L.char("!"));
        this.opAnd = this.boolean(L.char("&"));
        this.opOr = this.boolean(L.char("|"));
        this.opEqual = this.boolean(L.chars("=="));
        this.opNotEqual = this.boolean(L.chars("!="));
        this.opGreaterThan = this.boolean(L.char(">"));
        this.opLessThan = this.boolean(L.char("<"));
        this.opGreaterThanOrEqual = this.boolean(L.chars(">="));
        this.opLessThanOrEqual = this.boolean(L.chars("<="));
        this.opDeclare = this.boolean(L.char("="));
        this.delCommaParen = this.boolean(L.char(","));
        this.delOpenParen = this.boolean(L.char("("));
        this.delCloseParen = this.boolean(L.char(")"));
        this.delOpenSquare = this.boolean(L.char("["));
        this.delCloseSquare = this.boolean(L.char("]"));
        this.delOpenCurly = this.boolean(L.char("{"));
        this.delCloseCurly = this.boolean(L.char("}"));
    }
    tokenize(text) {
        let output = "";
        for (let token of this.iterator(new L.TextInputStream(text))) {
            if (token.tokenType == this.whiteSpace) {
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
            case this.errorTokenType: return "ERROR";
            case this.eofTokenType: return "EOF";
            default: return this.tokenTypeName(token.tokenType);
        }
    }
}
//# sourceMappingURL=my-scanner.js.map