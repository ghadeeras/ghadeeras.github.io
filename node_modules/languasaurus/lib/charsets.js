import * as utils from "./utils.js";
export const alphabet = {
    min: 0x0000,
    max: 0xFFFF
};
export function char(c) {
    return range(c, c);
}
export function chars(cs) {
    const sets = [];
    for (let i = 0; i < cs.length; i++) {
        sets.push(char(cs.charCodeAt(i)));
    }
    return union(...sets);
}
export function except(c) {
    return complement(char(c));
}
export function range(min, max) {
    return CharRange.of(min, max);
}
export function ranges(...ranges) {
    return union(...ranges.map(r => range(r.min, r.max)));
}
export function intersection(...sets) {
    return complement(union(...sets.map(complement)));
}
export function union(...sets) {
    return charSet(limitsOfSets(sets));
}
export function complement(set) {
    if (set.ranges.length == 0) {
        return all;
    }
    const limits = limitsOfRanges(set.ranges)
        .map(complementLimit)
        .filter(limit => all.contains(limit.value));
    const alphabetLimits = rangeLimits(alphabet);
    if (limits.length > 0) {
        const firstLimit = limits[0];
        const lastLimit = limits[limits.length - 1];
        if (firstLimit.upper) {
            limits.unshift(alphabetLimits[0]);
        }
        if (!lastLimit.upper) {
            limits.push(alphabetLimits[1]);
        }
    }
    return charSet(limits);
}
const distinctNumbers = utils.distinctFunction(utils.numberComparator);
const numbersComparator = utils.arrayComparator(utils.numberComparator);
export function computeOverlaps(...sets) {
    const result = [];
    const limits = utils.flatMap(sets, (set, i) => limitsOfRanges(set.ranges).map(limit => utils.pair(i, limit))).sort(utils.comparing(l => l.value, compareLimits));
    let ids = [];
    let lastLimit = {
        value: -1,
        upper: true
    };
    for (const limit of limits) {
        if (compareLimits(limit.value, lastLimit) > 0 && ids.length > 0) {
            result.push({
                key: distinctNumbers(ids),
                value: range(lastLimit.upper ? lastLimit.value + 1 : lastLimit.value, limit.value.upper ? limit.value.value : limit.value.value - 1)
            });
        }
        lastLimit = limit.value;
        if (limit.value.upper) {
            ids = utils.removeFirst(limit.key, ids, utils.numberComparator);
        }
        else {
            ids.push(limit.key);
        }
    }
    const aggregatedResult = utils.group(result, overlap => overlap.key, overlap => overlap.value, numbersComparator);
    return aggregatedResult.map(set => utils.pair(set.key, union(...set.value)));
}
class CharRange {
    constructor(min, max) {
        this.min = min;
        this.max = max;
        if (isInvalidChar(min) || isInvalidChar(max)) {
            throw `One or more of range limits are not valid character codes: ${min}..${max}`;
        }
        this.size = max - min + 1;
    }
    contains(char) {
        return this.min <= char && char <= this.max;
    }
    random() {
        return this.min + utils.randomInt(this.size);
    }
    get ranges() {
        return [this];
    }
    toString() {
        return `[${this.fromCharCode(this.min)} .. ${this.fromCharCode(this.max)}]`;
    }
    fromCharCode(c) {
        const result = String.fromCharCode(c).trim();
        return result.length > 0 ? result : "\\u" + c;
    }
    static of(min, max) {
        const [mn, mx] = min <= max ? [min, max] : [max, min];
        return new CharRange(mn, mx);
    }
    static from(range) {
        return range instanceof CharRange ? range : this.of(range.min, range.max);
    }
}
class Union {
    constructor(charRanges) {
        this.charRanges = charRanges;
        const sum = (a, b) => a + b;
        this.size = charRanges.map(range => range.size).reduce(sum, 0);
    }
    contains(char) {
        return !this.charRanges.every(range => !range.contains(char));
    }
    random() {
        const index = utils.randomInt(this.charRanges.length);
        return this.charRanges[index].random();
    }
    get ranges() {
        return [...this.charRanges];
    }
    toString() {
        return this.charRanges.map(range => range.toString()).reduce((r1, r2) => `${r1} ${r2}`);
    }
    static of(ranges) {
        const charRanges = ranges.map(range => CharRange.from(range));
        return charRanges.length != 1 ? new Union(charRanges) : charRanges[0];
    }
}
export const all = range(alphabet.min, alphabet.max);
export const empty = union();
function isInvalidChar(char) {
    return char < alphabet.min || char > alphabet.max || char != Math.round(char);
}
function charSet(limits) {
    const sortedLimits = limits.sort(compareLimits);
    const ranges = [];
    let nestingLevel = 0;
    let lastLowerLimit = alphabet.min;
    for (const limit of sortedLimits) {
        if (limit.upper) {
            nestingLevel--;
            if (nestingLevel == 0) {
                addRange(ranges, lastLowerLimit, limit.value);
            }
        }
        else {
            if (nestingLevel == 0) {
                lastLowerLimit = limit.value;
            }
            nestingLevel++;
        }
    }
    if (nestingLevel > 0) {
        addRange(ranges, lastLowerLimit, alphabet.max);
    }
    return Union.of(ranges);
}
function addRange(ranges, lowerLimit, upperLimit) {
    const lastRange = ranges.pop();
    if (lastRange) {
        if (lowerLimit == lastRange.max + 1) {
            ranges.push(CharRange.of(lastRange.min, upperLimit));
        }
        else {
            ranges.push(lastRange);
            ranges.push(CharRange.of(lowerLimit, upperLimit));
        }
    }
    else {
        ranges.push(CharRange.of(lowerLimit, upperLimit));
    }
}
function compareLimits(l1, l2) {
    if (l1.value < l2.value) {
        return -1;
    }
    else if (l1.value > l2.value) {
        return +1;
    }
    else if (!l1.upper && l2.upper) {
        return -1;
    }
    else if (l1.upper && !l2.upper) {
        return +1;
    }
    else {
        return 0;
    }
}
function complementLimit(limit) {
    const direction = limit.upper ? 1 : -1;
    return {
        value: limit.value + direction,
        upper: !limit.upper
    };
}
function limitsOfSets(sets) {
    const limits = [];
    for (const set of sets) {
        limits.push(...limitsOfRanges(set.ranges));
    }
    return limits;
}
function limitsOfRanges(ranges) {
    const limits = [];
    for (const range of ranges) {
        limits.push(...rangeLimits(range));
    }
    return limits;
}
function rangeLimits(range) {
    return [
        { value: range.min, upper: false },
        { value: range.max, upper: true }
    ];
}
