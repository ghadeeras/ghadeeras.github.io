import { Texture } from "./texture.js";
export function formatOf(formatted) {
    return typeof formatted !== 'string' ?
        formatted instanceof Texture ?
            formatted.descriptor.format :
            formatted.format :
        formatted;
}
//# sourceMappingURL=utils.js.map