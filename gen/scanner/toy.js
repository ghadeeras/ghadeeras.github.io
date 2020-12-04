import * as scanner from "../../languasaurus/latest/index.js";
class MyScanner extends scanner.Scanner {
    constructor() {
        super();
        const s = scanner;
        const lowerCaseChar = s.charIn("a-z");
        const upperCaseChar = s.charIn("A-Z");
        const alphaChar = s.choice(lowerCaseChar, upperCaseChar);
        const numericChar = s.charIn("0-9");
        const alphaNumericChar = s.choice(alphaChar, numericChar);
        this.whiteSpace = this.string(s.oneOrMore(s.charFrom(" \t\r\n")));
        this.comment = this.string(s.concat(s.char("#"), s.zeroOrMore(s.charOtherThan("\n")), s.char("\n")));
        this.keywordIf = this.boolean(s.word("if"));
        this.keywordOtherwise = this.boolean(s.word("otherwise"));
        this.keywordWhere = this.boolean(s.word("where"));
        this.identifier = this.string(s.concat(alphaChar, s.zeroOrMore(alphaNumericChar)));
        this.literalInt = this.integer(s.oneOrMore(numericChar));
        this.literalFloat = this.float(s.concat(s.zeroOrMore(numericChar), s.char("."), s.oneOrMore(numericChar)));
        this.literalString = this.string(s.choice(s.concat(s.char('"'), s.zeroOrMore(s.charOtherThan('"')), s.char('"')), s.concat(s.char("'"), s.zeroOrMore(s.charOtherThan("'")), s.char("'"))));
        this.literalBoolean = this.boolean(s.choice(s.word("true"), s.word("false"))).parsedAs(lexeme => lexeme == "true");
        this.opPlus = this.boolean(s.char("+"));
        this.opMinus = this.boolean(s.char("-"));
        this.opMul = this.boolean(s.char("*"));
        this.opDiv = this.boolean(s.char("/"));
        this.opPow = this.boolean(s.char("^"));
        this.opNot = this.boolean(s.char("!"));
        this.opAnd = this.boolean(s.char("&"));
        this.opOr = this.boolean(s.char("|"));
        this.opEqual = this.boolean(s.word("=="));
        this.opNotEqual = this.boolean(s.word("!="));
        this.opGreaterThan = this.boolean(s.char(">"));
        this.opLessThan = this.boolean(s.char("<"));
        this.opGreaterThanOrEqual = this.boolean(s.word(">="));
        this.opLessThanOrEqual = this.boolean(s.word("<="));
        this.opDeclare = this.boolean(s.char("="));
        this.delCommaParen = this.boolean(s.char(","));
        this.delOpenParen = this.boolean(s.char("("));
        this.delCloseParen = this.boolean(s.char(")"));
        this.delOpenSquare = this.boolean(s.char("["));
        this.delCloseSquare = this.boolean(s.char("]"));
        this.delOpenCurly = this.boolean(s.char("{"));
        this.delCloseCurly = this.boolean(s.char("}"));
    }
}
export function init() {
    const myScanner = new MyScanner();
    const tokenNames = new Map();
    for (let key in myScanner) {
        const value = myScanner[key];
        if (value instanceof scanner.TokenType) {
            tokenNames.set(value, key);
        }
    }
    tokenNames.set(myScanner.errorTokenType, "ERROR");
    tokenNames.set(myScanner.eofTokenType, "EOF");
    const inputElement = document.getElementById("input");
    const outputElement = document.getElementById("output");
    document.getElementById("tokenize").onclick = () => {
        const textToTokenize = new scanner.TextInputStream(inputElement.value);
        let output = "";
        for (let token of myScanner.iterator(textToTokenize)) {
            if (token.tokenType == myScanner.whiteSpace) {
                continue;
            }
            output += tokenNames.get(token.tokenType) +
                " at [Line: " + token.position.line + ", Column: " + token.position.column + "]:\n" +
                token.lexeme + "\n" +
                "----------\n";
        }
        outputElement.innerText = output;
    };
}
//# sourceMappingURL=toy.js.map