import * as scanner from "../../languasaurus/latest/index.js"

export class MyScanner extends scanner.Scanner {

    readonly whiteSpace: scanner.TextualTokenType
    readonly comment: scanner.TextualTokenType
    
    readonly identifier: scanner.TextualTokenType

    readonly literalInt: scanner.IntegerTokenType
    readonly literalFloat: scanner.FloatTokenType
    readonly literalString: scanner.TextualTokenType
    readonly literalBoolean: scanner.BooleanTokenType

    readonly keywordIf: scanner.BooleanTokenType
    readonly keywordOtherwise: scanner.BooleanTokenType
    readonly keywordWhere: scanner.BooleanTokenType
    
    readonly opPlus: scanner.BooleanTokenType
    readonly opMinus: scanner.BooleanTokenType
    readonly opMul: scanner.BooleanTokenType
    readonly opDiv: scanner.BooleanTokenType
    readonly opPow: scanner.BooleanTokenType

    readonly opNot: scanner.BooleanTokenType
    readonly opAnd: scanner.BooleanTokenType
    readonly opOr: scanner.BooleanTokenType

    readonly opEqual: scanner.BooleanTokenType
    readonly opNotEqual: scanner.BooleanTokenType
    readonly opGreaterThan: scanner.BooleanTokenType
    readonly opLessThan: scanner.BooleanTokenType
    readonly opGreaterThanOrEqual: scanner.BooleanTokenType
    readonly opLessThanOrEqual: scanner.BooleanTokenType

    readonly opDeclare: scanner.BooleanTokenType

    readonly delCommaParen: scanner.BooleanTokenType
    readonly delOpenParen: scanner.BooleanTokenType
    readonly delCloseParen: scanner.BooleanTokenType
    readonly delOpenSquare: scanner.BooleanTokenType
    readonly delCloseSquare: scanner.BooleanTokenType
    readonly delOpenCurly: scanner.BooleanTokenType
    readonly delCloseCurly: scanner.BooleanTokenType

    readonly tokenNames: Map<scanner.TokenType<any>, string> = new Map()

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
    
        this.opEqual = this.boolean(s.word("=="))
        this.opNotEqual = this.boolean(s.word("!="))
        this.opGreaterThan = this.boolean(s.char(">"))
        this.opLessThan = this.boolean(s.char("<"))
        this.opGreaterThanOrEqual = this.boolean(s.word(">="))
        this.opLessThanOrEqual = this.boolean(s.word("<="))
    
        this.opDeclare = this.boolean(s.char("="))
    
        this.delCommaParen = this.boolean(s.char(","))
        this.delOpenParen = this.boolean(s.char("("))
        this.delCloseParen = this.boolean(s.char(")"))
        this.delOpenSquare = this.boolean(s.char("["))
        this.delCloseSquare = this.boolean(s.char("]"))
        this.delOpenCurly = this.boolean(s.char("{"))
        this.delCloseCurly = this.boolean(s.char("}"))

        for (let key in this) {
            const value = this[key]
            if (value instanceof scanner.TokenType) {
                this.tokenNames.set(value, key)
            }
        }
        this.tokenNames.set(this.errorTokenType, "ERROR")
        this.tokenNames.set(this.eofTokenType, "EOF")
    }

    tokenize(text: string): string {
        let output = ""
        for (let token of this.iterator(new scanner.TextInputStream(text))) {
            if (token.tokenType == this.whiteSpace) {
                continue
            }
            output += this.tokenNames.get(token.tokenType) + 
                " at [Line: " + token.position.line + ", Column: " + token.position.column + "]:\n" +
                token.lexeme + "\n" +
                "----------\n"
        }
        return output
    }
    
}
