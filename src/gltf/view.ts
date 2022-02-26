import { aether, gear } from "../libs";

export type ViewInputs = {

    matModel: gear.Value<aether.Mat<4>>

    matView: gear.Value<aether.Mat<4>>

    color: gear.Value<aether.Vec<4>>

    shininess: gear.Value<number>

    lightPosition: gear.Value<aether.Vec<3>>

    lightRadius: gear.Value<number>

    fogginess: gear.Value<number>

}