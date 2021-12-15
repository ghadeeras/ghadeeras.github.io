import * as L from "languasaurus"

export class MyScanner extends L.Scanner {

    private lowerCaseChar = L.charIn("a-z")
    private upperCaseChar = L.charIn("A-Z")
    private alphaChar = L.choice(this.lowerCaseChar, this.upperCaseChar)
    private numericChar = L.charIn("0-9")
    private alphaNumericChar = L.choice(this.alphaChar, this.numericChar)

    readonly whiteSpace = this.string(L.oneOrMore(L.charFrom(" \t\r\n")))
    readonly comment = this.string(L.concat(
        L.char("#"), 
        L.zeroOrMore(L.charOtherThan("\n")), 
        L.char("\n")
    ))

    readonly keywordIf = this.boolean(L.word("if"))
    readonly keywordOtherwise = this.boolean(L.word("otherwise"))
    readonly keywordWhere = this.boolean(L.word("where"))

    readonly identifier = this.string(L.concat(
        this.alphaChar,
        L.zeroOrMore(this.alphaNumericChar)
    ))

    readonly literalInt = this.integer(L.oneOrMore(this.numericChar))
    readonly literalFloat = this.float(L.concat(
        L.zeroOrMore(this.numericChar),
        L.char("."),
        L.oneOrMore(this.numericChar)
    ))
    readonly literalString = this.string(L.choice(
        L.concat(
            L.char('"'),
            L.zeroOrMore(L.charOtherThan('"')),
            L.char('"')
        ),
        L.concat(
            L.char("'"),
            L.zeroOrMore(L.charOtherThan("'")),
            L.char("'")
        )
    ))
    readonly literalBoolean = this.boolean(L.choice(
        L.word("true"),
        L.word("false"),
    )).parsedAs(lexeme => lexeme == "true")

    readonly opPlus = this.boolean(L.char("+"))
    readonly opMinus = this.boolean(L.char("-"))
    readonly opMul = this.boolean(L.char("*"))
    readonly opDiv = this.boolean(L.char("/"))
    readonly opPow = this.boolean(L.char("^"))

    readonly opNot = this.boolean(L.char("!"))
    readonly opAnd = this.boolean(L.char("&"))
    readonly opOr = this.boolean(L.char("|"))

    readonly opEqual = this.boolean(L.chars("=="))
    readonly opNotEqual = this.boolean(L.chars("!="))
    readonly opGreaterThan = this.boolean(L.char(">"))
    readonly opLessThan = this.boolean(L.char("<"))
    readonly opGreaterThanOrEqual = this.boolean(L.chars(">="))
    readonly opLessThanOrEqual = this.boolean(L.chars("<="))

    readonly opDeclare = this.boolean(L.char("="))

    readonly delCommaParen = this.boolean(L.char(","))
    readonly delOpenParen = this.boolean(L.char("("))
    readonly delCloseParen = this.boolean(L.char(")"))
    readonly delOpenSquare = this.boolean(L.char("["))
    readonly delCloseSquare = this.boolean(L.char("]"))
    readonly delOpenCurly = this.boolean(L.char("{"))
    readonly delCloseCurly = this.boolean(L.char("}"))

    tokenize(text: string): string {
        let output = ""
        for (let token of this.iterator(new L.TextInputStream(text))) {
            if (token.tokenType == this.whiteSpace) {
                continue
            }
            output += 
                `${this.tokenName(token)} at [Line: ${token.position.line}, Column: ${token.position.column}]:\n` +
                `${token.lexeme}\n` +
                "----------\n"
        }
        return output
    }
    
    private tokenName(token: L.Token<any>) {
        switch (token.tokenType) {
            case this.errorTokenType: return "ERROR"
            case this.eofTokenType: return "EOF"
            default: return this.tokenTypeName(token.tokenType)
        }
    }
}
