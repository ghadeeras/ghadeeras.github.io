import { Callable } from "./utils.js";
export declare class Call {
    private _callable;
    private _timer;
    constructor(callable: Callable);
    now(): void;
    later(): void;
    cancel(): void;
}
//# sourceMappingURL=call.d.ts.map