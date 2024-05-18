var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { appLayoutBuilder } from "./layout.js";
import { appShadersBuilder } from "./shader.js";
export class AppBuilder {
    constructor(label) {
        this.label = label;
    }
    withShaders(shaders) {
        return new AppBuilderWithShaders(this.label, shaders);
    }
}
export class AppBuilderWithShaders {
    constructor(label, shaders) {
        this.label = label;
        this.shaders = shaders;
    }
    withGroupLayouts(record) {
        return new AppBuilderWithGroupLayouts(this.label, this.shaders, record);
    }
}
export class AppBuilderWithGroupLayouts {
    constructor(label, shaders, record) {
        this.label = label;
        this.shaders = shaders;
        this.record = record;
    }
    withPipelineLayouts(record) {
        return new AppBuilderWithPipelineLayouts(this.label, this.shaders, this.record, record);
    }
}
export class AppBuilderWithPipelineLayouts {
    constructor(label, shaders, groupsRecord, pipelinesRecord) {
        this.label = label;
        this.shaders = shaders;
        this.groupsRecord = groupsRecord;
        this.pipelinesRecord = pipelinesRecord;
    }
    build(device, rootPath = ".", processor = code => code) {
        return __awaiter(this, void 0, void 0, function* () {
            const shaders = yield appShadersBuilder(`${this.label}/shaders`)
                .withShaders(this.shaders)
                .build(device, rootPath, processor);
            const layout = appLayoutBuilder(`${this.label}/layout`)
                .withGroupLayouts(this.groupsRecord)
                .withPipelineLayouts(this.pipelinesRecord)
                .build(device);
            return { device, shaders, layout };
        });
    }
}
export function appBuilder(label) {
    return new AppBuilder(label);
}
//# sourceMappingURL=app.js.map