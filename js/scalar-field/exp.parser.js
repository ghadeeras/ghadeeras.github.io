import * as L from "languasaurus";
import { Expression } from "aether";
const constants = {
    phi: (Math.sqrt(5) + 1) / 2,
    pi: Math.PI,
    e: Math.E
};
export function parse(e) {
    const field = parser(new L.TextInputStream(e)).simplified;
    const dF_dX = field.partialDerivative("x").simplified;
    const dF_dY = field.partialDerivative("y").simplified;
    const dF_dZ = field.partialDerivative("z").simplified;
    console.log("field", field.toString());
    console.log("dF_dX", dF_dX.toString());
    console.log("dF_dY", dF_dY.toString());
    console.log("dF_dZ", dF_dZ.toString());
    return [(x, y, z) => [
            dF_dX.evaluate({ x, y, z, ...constants }),
            dF_dY.evaluate({ x, y, z, ...constants }),
            dF_dZ.evaluate({ x, y, z, ...constants }),
            field.evaluate({ x, y, z, ...constants }),
        ], field.toString(), dF_dX.toString(), dF_dY.toString(), dF_dZ.toString()];
}
const digit = L.charIn("0-9");
const int = L.oneOrMore(digit);
const tokens = {
    varName: L.keywords("x", "y", "z", "phi", "pi", "e"),
    funName: L.keywords("neg", "inv", "sin", "cos", "exp", "log", "sqrt"),
    number: L.float(int.then(L.char('.').then(int).optional())),
    opnParen: L.delimiter("("),
    clsParen: L.delimiter(")"),
    pls: L.ops("+", "-"),
    mul: L.ops("*", "/"),
    pow: L.op("^"),
    ws: L.string(L.charFrom(" \t\n\r")),
};
const terminals = L.tokenlessTerminals(tokens);
const exp = L.production(() => ({ head: signedTerm, tail: plsTerm.zeroOrMore() })).mapped(n => Expression.sum(n.head, ...n.tail), e => headTail(e.exp.type === "sum" ? e.exp.operands : [e]));
const signedTerm = L.production(() => ({ op: terminals.pls.optional(), operand: term })).mapped(n => n.op === "-" ? n.operand.neg() : n.operand, e => e.exp.type === "fnCall" && e.exp.name === "neg" ? { op: "-", operand: e.exp.arg } : { op: null, operand: e });
const plsTerm = L.production(() => ({ op: terminals.pls, operand: term })).mapped(n => n.op === "-" ? n.operand.neg() : n.operand, e => e.exp.type === "fnCall" && e.exp.name === "neg" ? { op: "-", operand: e.exp.arg } : { op: "+", operand: e });
const term = L.production(() => ({ head: factor, tail: mulFactor.zeroOrMore() })).mapped(n => Expression.prod(n.head, ...n.tail), e => headTail(factors(e)));
const mulFactor = L.production(() => ({ op: terminals.mul, operand: factor })).mapped(n => n.op === "/" ? n.operand.inv() : n.operand, e => e.exp.type === "fnCall" && e.exp.name === "inv" ? { op: "/", operand: e.exp.arg } : { op: "*", operand: e });
const factor = L.production(() => ({ base: leaf, exponent: exponent.optional() })).mapped(n => n.exponent !== null ? n.base.pow(n.exponent) : n.base, e => e.exp.type === "pow" ? { base: e.exp.base, exponent: e.exp.exponent } : { base: e, exponent: null });
const exponent = L.production(() => ({ op: terminals.pow, operand: leaf })).mapped(n => n.operand, e => ({ op: "^", operand: e }));
const leaf = L.union(() => ({
    constant: terminals.number,
    variable: terminals.varName,
    funCall: funCall,
    unit: unit,
})).mapped(n => {
    switch (n.type) {
        case "constant": return Expression.constant(n.value);
        case "variable": return Expression.variable(n.value);
        default: return n.value;
    }
}, e => {
    switch (e.exp.type) {
        case "constant": return { type: "constant", value: e.exp.value };
        case "variable": return { type: "variable", value: e.exp.name };
        case "fnCall": return { type: "funCall", value: e };
        default: return { type: "unit", value: e };
    }
});
const funCall = L.production(() => ({ funName: terminals.funName, opnParen: terminals.opnParen, arg: exp, clsParen: terminals.clsParen })).mapped(n => n.arg.get(n.funName), e => e.exp.type === "fnCall" ? { funName: e.exp.name, opnParen: "(", arg: e.exp.arg, clsParen: ")" } : { funName: "inv", opnParen: "(", arg: e.inv(), clsParen: ")" });
const unit = L.production(() => ({ opnParen: terminals.opnParen, wrapped: exp, clsParen: terminals.clsParen })).mapped(n => n.wrapped, e => ({ opnParen: "(", wrapped: e, clsParen: ")" }));
const parser = L.recursiveDescentParser(tokens, exp);
function headTail(array) {
    const [head, ...tail] = array;
    return { head, tail };
}
function factors(e) {
    switch (e.exp.type) {
        case "prod": return e.exp.operands;
        case "fnCall": if (e.exp.name === "inv")
            return [Expression.constant(1), e];
        default: return [e];
    }
}
//# sourceMappingURL=exp.parser.js.map