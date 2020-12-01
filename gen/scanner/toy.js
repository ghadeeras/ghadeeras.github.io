import * as scanner from "../../languasaurus/latest/index.js";
class MyScanner extends scanner.Scanner {
    constructor() {
        super();
        const s = scanner;
        const lowerCaseChar = s.inRange("a-z");
        const upperCaseChar = s.inRange("A-Z");
        const alphaChar = s.choice(lowerCaseChar, upperCaseChar);
        const numericChar = s.inRange("0-9");
        this.whiteSpace = this.string(s.oneOrMore(s.oneOf(" \t\r\n")));
        this.comment = this.string(s.concat(s.oneOf("#"), s.zeroOrMore(s.noneOf("\n")), s.oneOf("\n")));
        this.keywordIf = this.boolean(s.word("if"));
        this.keywordOtherwise = this.boolean(s.word("otherwise"));
        this.keywordWhere = this.boolean(s.word("where"));
        this.identifier = this.string(s.concat(alphaChar, s.zeroOrMore(s.choice(alphaChar, numericChar))));
        this.literalInt = this.integer(s.oneOrMore(numericChar));
        this.literalFloat = this.float(s.concat(s.zeroOrMore(numericChar), s.oneOf("."), s.oneOrMore(numericChar)));
        this.literalString = this.string(s.choice(s.concat(s.oneOf('"'), s.zeroOrMore(s.noneOf('"')), s.oneOf('"')), s.concat(s.oneOf("'"), s.zeroOrMore(s.noneOf("'")), s.oneOf("'"))));
        this.literalBoolean = this.boolean(s.choice(s.word("true"), s.word("false"))).parsedAs(lexeme => lexeme == "true");
        this.opPlus = this.boolean(s.word("+"));
        this.opMinus = this.boolean(s.word("-"));
        this.opMul = this.boolean(s.word("*"));
        this.opDiv = this.boolean(s.word("/"));
        this.opPow = this.boolean(s.word("^"));
        this.opNot = this.boolean(s.word("!"));
        this.opAnd = this.boolean(s.word("&"));
        this.opOr = this.boolean(s.word("|"));
        this.opEqual = this.boolean(s.word("=="));
        this.opNotEqual = this.boolean(s.word("!="));
        this.opGreaterThan = this.boolean(s.word(">"));
        this.opLessThan = this.boolean(s.word("<"));
        this.opGreaterThanOrEqual = this.boolean(s.word(">="));
        this.opLessThanOrEqual = this.boolean(s.word("<="));
        this.opDeclare = this.boolean(s.word("="));
        this.delOpenParen = this.boolean(s.word("("));
        this.delCloseParen = this.boolean(s.word(")"));
        this.delOpenSquare = this.boolean(s.word("["));
        this.delCloseSquare = this.boolean(s.word("]"));
        this.delOpenCurly = this.boolean(s.word("{"));
        this.delCloseCurly = this.boolean(s.word("}"));
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
    tokenNames.set(myScanner.errorType, "ERROR");
    tokenNames.set(myScanner.eofType, "EOF");
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