import * as L from "languasaurus"
import * as aether from "aether"
import { Expression } from "aether"

export type XYZExpression = Expression<"x" | "y" | "z">

export type Field = (x: number, y: number, z: number) => aether.Vec<4>

export function parse(e: string): [Field, string, string, string, string] {
    const field = parser(new L.TextInputStream(e)).simplified
    const dF_dX = field.partialDerivative("x").simplified
    const dF_dY = field.partialDerivative("y").simplified
    const dF_dZ = field.partialDerivative("z").simplified

    console.log("field", field.toString())
    console.log("dF_dX", dF_dX.toString())
    console.log("dF_dY", dF_dY.toString())
    console.log("dF_dZ", dF_dZ.toString())

    return [(x, y, z) => [
        dF_dX.evaluate({ x, y, z }),
        dF_dY.evaluate({ x, y, z }),
        dF_dZ.evaluate({ x, y, z }),
        field.evaluate({ x, y, z }),
    ], field.toString(), dF_dX.toString(), dF_dY.toString(), dF_dZ.toString()]
} 

const digit = L.charIn("0-9")
const int = L.oneOrMore(digit)
const tokens = {
    varName: L.keywords("x", "y", "z"),
    funName: L.keywords("neg", "inv", "sin", "cos", "exp", "log", "sqrt"),
    number: L.float(int.then(L.char('.').then(int).optional())),
    opnParen: L.delimiter("("),
    clsParen: L.delimiter(")"),
    pls: L.ops("+", "-"),
    mul: L.ops("*", "/"),
    pow: L.op("^"),
    ws: L.string(L.charFrom(" \t\n\r")),
} as const 
const terminals = L.tokenlessTerminals(tokens)


type Exp = L.Repeatable<XYZExpression>

const exp: Exp = L.production(() => ({ head: signedTerm, tail: plsTerm.zeroOrMore() })).mapped(
    n => Expression.sum(n.head, ...n.tail), 
    e => headTail(e.exp.type === "sum" ? e.exp.operands : [e])
)

const signedTerm: Exp = L.production(() => ({ op: terminals.pls.optional(), operand: term })).mapped(
    n => n.op === "-" ? n.operand.neg() : n.operand,
    e => e.exp.type === "fnCall" && e.exp.name === "neg" ? { op: "-", operand: e.exp.arg } : { op: null, operand: e }
)

const plsTerm: Exp = L.production(() => ({ op: terminals.pls, operand: term })).mapped(
    n => n.op === "-" ? n.operand.neg() : n.operand,
    e => e.exp.type === "fnCall" && e.exp.name === "neg" ? { op: "-", operand: e.exp.arg } : { op: "+", operand: e }
)

const term: Exp = L.production(() => ({ head: factor, tail: mulFactor.zeroOrMore() })).mapped(
    n => Expression.prod(n.head, ...n.tail), 
    e => headTail(factors(e))
)

const mulFactor: Exp = L.production(() => ({ op: terminals.mul, operand: factor })).mapped(
    n => n.op === "/" ? n.operand.inv() : n.operand,
    e => e.exp.type === "fnCall" && e.exp.name === "inv" ? { op: "/", operand: e.exp.arg } : { op: "*", operand: e }
)

const factor: Exp = L.production(() => ({ base: leaf, exponent: exponent.optional() })).mapped(
    n => n.exponent !== null ? n.base.pow(n.exponent) : n.base,
    e => e.exp.type === "pow" ? { base: e.exp.base, exponent: e.exp.exponent } : { base: e, exponent: null }
)

const exponent: Exp = L.production(() => ({ op: terminals.pow, operand: leaf })).mapped(
    n => n.operand,
    e => ({ op: "^", operand: e })
)

const leaf: Exp = L.union(() => ({
    constant: terminals.number,
    variable: terminals.varName,
    funCall: funCall,
    unit: unit,
})).mapped(
    n => {
        switch (n.type) {
            case "constant": return Expression.constant(n.value)
            case "variable": return Expression.variable(n.value)
            default: return n.value
        }
    },
    e => {
        switch (e.exp.type) {
            case "constant": return { type: "constant", value: e.exp.value }
            case "variable": return { type: "variable", value: e.exp.name }
            case "fnCall": return { type: "funCall", value: e }
            default: return { type: "unit", value: e }
        }
    }
)

const funCall: Exp = L.production(() => ({ funName: terminals.funName, opnParen: terminals.opnParen, arg: exp, clsParen: terminals.clsParen })).mapped(
    n => n.arg.get(n.funName),
    e => e.exp.type === "fnCall" ? { funName: e.exp.name, opnParen: "(", arg: e.exp.arg, clsParen: ")" } : { funName: "inv", opnParen: "(", arg: e.inv(), clsParen: ")" }
)

const unit: Exp = L.production(() => ({ opnParen: terminals.opnParen, wrapped: exp, clsParen: terminals.clsParen })).mapped(
    n => n.wrapped,
    e => ({ opnParen: "(", wrapped: e, clsParen: ")" })
)

const parser = L.recursiveDescentParser(tokens, exp)

function headTail<T>(array: T[]): { head: T, tail: T[] } {
    const [head, ...tail] = array
    return { head, tail }
}

function factors(e: XYZExpression): XYZExpression[] {
    switch (e.exp.type) {
        case "prod": return e.exp.operands
        case "fnCall": if (e.exp.name === "inv") return [Expression.constant(1), e]
        default: return [e]
    }
}
