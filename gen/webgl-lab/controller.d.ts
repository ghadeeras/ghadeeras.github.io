import * as Gear from "../gear/all.js";
import { ProgramSample } from "./samples.js";
export declare class Controller {
    get program(): Gear.Supplier<Gear.Flow<ProgramSample>>;
    get mesh(): Gear.Supplier<Gear.Flow<boolean>>;
    get levelOfDetails(): Gear.Supplier<Gear.Flow<number>>;
    get programSample(): Gear.Supplier<Gear.Flow<number>>;
    get mouseXBinding(): Gear.Supplier<Gear.Flow<number>>;
    get mouseYBinding(): Gear.Supplier<Gear.Flow<number>>;
    get mouseXY(): Gear.Supplier<Gear.Flow<number[]>>;
}
//# sourceMappingURL=controller.d.ts.map