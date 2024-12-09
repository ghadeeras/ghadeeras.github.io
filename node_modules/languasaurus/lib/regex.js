import * as automata from './automata.js';
import * as charsets from './charsets.js';
export function state() {
    return automata.State.create();
}
export function endState() {
    return automata.State.create(true);
}
export function from(state) {
    return RegEx.create(automata.Automaton.create(state));
}
export function word(w) {
    return chars(w);
}
export function chars(cs) {
    const regexes = [];
    for (let i = 0; i < cs.length; i++) {
        const c = cs.charAt(i);
        regexes.push(charIn(c));
    }
    return concat(regexes[0], ...regexes.slice(1));
}
export function char(c) {
    return charFrom(c);
}
export function charOtherThan(c) {
    return charNotFrom(c);
}
export function charFrom(chars) {
    const [range, ...ranges] = splitChars(chars);
    return charIn(range, ...ranges);
}
export function charNotFrom(chars) {
    const [range, ...ranges] = splitChars(chars);
    return charOutOf(range, ...ranges);
}
export function charIn(range, ...ranges) {
    return charRanges(false, [range, ...ranges]);
}
export function charOutOf(range, ...ranges) {
    return charRanges(true, [range, ...ranges]);
}
function charRanges(complement, rs) {
    const start = newState();
    const end = newEndState();
    const trigger = charsets.union(...rs.map(r => charsets.range(r.charCodeAt(0), r.charCodeAt(r.length - 1))));
    start.on(complement ? charsets.complement(trigger) : trigger, end);
    return RegEx.create(automata.Automaton.create(start));
}
export function concat(regex, ...regexes) {
    const allAutomata = regexes.map(regex => regex.automaton);
    return RegEx.create(automata.Automaton.concat(regex.automaton, ...allAutomata));
}
export function choice(regex, ...regexes) {
    const allAutomata = regexes.map(regex => regex.automaton);
    return RegEx.create(automata.Automaton.choice(regex.automaton, ...allAutomata));
}
export function oneOrMore(regex) {
    return regex.repeated();
}
export function zeroOrMore(regex) {
    return regex.repeated().optional();
}
export class RegEx {
    constructor(_automaton) {
        this._automaton = _automaton;
    }
    get automaton() {
        return this._automaton.clone();
    }
    contains(s) {
        return this.matches(s);
    }
    random() {
        return this.randomString(0.5);
    }
    shortestRandom() {
        return this.randomString(1);
    }
    randomString(shortness) {
        const matcher = this._automaton.newMatcher();
        const result = [];
        while (true) {
            if (matcher.recognized.length > 0) {
                if (Math.random() <= shortness) {
                    return String.fromCharCode(...result);
                }
            }
            const nextChar = matcher.randomMatch();
            if (nextChar == null) {
                return String.fromCharCode(...result);
            }
            result.push(nextChar);
        }
    }
    matches(s) {
        return this.longestMatch(s) == s.length;
    }
    find(s, from = 0) {
        for (let i = from; i < s.length; i++) {
            const to = this.longestMatch(s, i);
            if (to != null) {
                return [i, to];
            }
        }
        return null;
    }
    longestMatch(s, from = 0) {
        let lastTo = null;
        for (const to of this.matchIndexes(s, from)) {
            lastTo = to;
        }
        return lastTo;
    }
    shortestMatch(s, from = 0) {
        for (const to of this.matchIndexes(s, from)) {
            return to;
        }
        return null;
    }
    *matchIndexes(s, from = 0) {
        const matcher = this._automaton.newMatcher();
        for (let i = from; i < s.length; i++) {
            if (matcher.recognized.length > 0) {
                yield i;
            }
            if (!matcher.match(s.charCodeAt(i))) {
                return;
            }
        }
        if (matcher.recognized.length > 0) {
            yield s.length;
        }
    }
    optional() {
        return RegEx.create(this._automaton.optional());
    }
    repeated() {
        return RegEx.create(this._automaton.repeated());
    }
    then(r) {
        return concat(this, r);
    }
    or(r) {
        return choice(this, r);
    }
    static create(automaton) {
        return new RegEx(automaton.deterministic());
    }
}
function newState() {
    return automata.State.create();
}
function newEndState() {
    return automata.State.create(true);
}
function splitChars(chars) {
    const ranges = [];
    for (let i = 0; i < chars.length; i++) {
        ranges.push(chars.charAt(i));
    }
    return ranges;
}
