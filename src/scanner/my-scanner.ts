import * as scanner from "../../languasaurus/js/index.js"

export class MyScanner extends scanner.Scanner {

    readonly whiteSpace: scanner.TokenType<string>
    readonly comment: scanner.TokenType<string>
    
    readonly identifier: scanner.TokenType<string>

    readonly literalInt: scanner.TokenType<number>
    readonly literalFloat: scanner.TokenType<number>
    readonly literalString: scanner.TokenType<string>
    readonly literalBoolean: scanner.TokenType<boolean>

    readonly keywordIf: scanner.TokenType<boolean>
    readonly keywordOtherwise: scanner.TokenType<boolean>
    readonly keywordWhere: scanner.TokenType<boolean>
    
    readonly opPlus: scanner.TokenType<boolean>
    readonly opMinus: scanner.TokenType<boolean>
    readonly opMul: scanner.TokenType<boolean>
    readonly opDiv: scanner.TokenType<boolean>
    readonly opPow: scanner.TokenType<boolean>

    readonly opNot: scanner.TokenType<boolean>
    readonly opAnd: scanner.TokenType<boolean>
    readonly opOr: scanner.TokenType<boolean>

    readonly opEqual: scanner.TokenType<boolean>
    readonly opNotEqual: scanner.TokenType<boolean>
    readonly opGreaterThan: scanner.TokenType<boolean>
    readonly opLessThan: scanner.TokenType<boolean>
    readonly opGreaterThanOrEqual: scanner.TokenType<boolean>
    readonly opLessThanOrEqual: scanner.TokenType<boolean>

    readonly opDeclare: scanner.TokenType<boolean>

    readonly delCommaParen: scanner.TokenType<boolean>
    readonly delOpenParen: scanner.TokenType<boolean>
    readonly delCloseParen: scanner.TokenType<boolean>
    readonly delOpenSquare: scanner.TokenType<boolean>
    readonly delCloseSquare: scanner.TokenType<boolean>
    readonly delOpenCurly: scanner.TokenType<boolean>
    readonly delCloseCurly: scanner.TokenType<boolean>

    constructor() {
        super()

        const s = scanner
        const lowerCaseChar = s.charIn("a-z")
        const upperCaseChar = s.charIn("A-Z")
        const alphaChar = s.choice(lowerCaseChar, upperCaseChar)
        const numericChar = s.charIn("0-9")
        const alphaNumericChar = s.choice(alphaChar, numericChar)

        this.whiteSpace = this.string(s.oneOrMore(s.charFrom(" \t\r\n")))
        this.comment = this.string(s.concat(
            s.char("#"), 
            s.zeroOrMore(s.charOtherThan("\n")), 
            s.char("\n")
        ))

        this.keywordIf = this.boolean(s.word("if"))
        this.keywordOtherwise = this.boolean(s.word("otherwise"))
        this.keywordWhere = this.boolean(s.word("where"))

        this.identifier = this.string(s.concat(
            alphaChar,
            s.zeroOrMore(alphaNumericChar)
        ))
    
        this.literalInt = this.integer(s.oneOrMore(numericChar))
        this.literalFloat = this.float(s.concat(
            s.zeroOrMore(numericChar),
            s.char("."),
            s.oneOrMore(numericChar)
        ))
        this.literalString = this.string(s.choice(
            s.concat(
                s.char('"'),
                s.zeroOrMore(s.charOtherThan('"')),
                s.char('"')
            ),
            s.concat(
                s.char("'"),
                s.zeroOrMore(s.charOtherThan("'")),
                s.char("'")
            )
        ))
        this.literalBoolean = this.boolean(s.choice(
            s.word("true"),
            s.word("false"),
        )).parsedAs(lexeme => lexeme == "true")
    
        this.opPlus = this.boolean(s.char("+"))
        this.opMinus = this.boolean(s.char("-"))
        this.opMul = this.boolean(s.char("*"))
        this.opDiv = this.boolean(s.char("/"))
        this.opPow = this.boolean(s.char("^"))
    
        this.opNot = this.boolean(s.char("!"))
        this.opAnd = this.boolean(s.char("&"))
        this.opOr = this.boolean(s.char("|"))
    
        this.opEqual = this.boolean(s.chars("=="))
        this.opNotEqual = this.boolean(s.chars("!="))
        this.opGreaterThan = this.boolean(s.char(">"))
        this.opLessThan = this.boolean(s.char("<"))
        this.opGreaterThanOrEqual = this.boolean(s.chars(">="))
        this.opLessThanOrEqual = this.boolean(s.chars("<="))
    
        this.opDeclare = this.boolean(s.char("="))
    
        this.delCommaParen = this.boolean(s.char(","))
        this.delOpenParen = this.boolean(s.char("("))
        this.delCloseParen = this.boolean(s.char(")"))
        this.delOpenSquare = this.boolean(s.char("["))
        this.delCloseSquare = this.boolean(s.char("]"))
        this.delOpenCurly = this.boolean(s.char("{"))
        this.delCloseCurly = this.boolean(s.char("}"))
    }

    tokenize(text: string): string {
        let output = ""
        for (let token of this.iterator(new scanner.TextInputStream(text))) {
            if (token.tokenType == this.whiteSpace) {
                continue
            }
            output += this.tokenName(token) + 
                " at [Line: " + token.position.line + ", Column: " + token.position.column + "]:\n" +
                token.lexeme + "\n" +
                "----------\n"
        }
        return output
    }
    
    private tokenName(token: scanner.Token<any>) {
        switch (token.tokenType) {
            case this.errorTokenType: return "ERROR"
            case this.eofTokenType: return "EOF"
            default: return this.tokenTypeName(token.tokenType)
        }
    }
}
