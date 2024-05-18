import { Device } from "./device.js";
import { AppLayout, BindGroupLayoutsRecord, RefPipelineLayoutsRecord, appLayoutBuilder } from "./layout.js";
import { AppShaders, AppShadersRecord, appShadersBuilder } from "./shader.js";

export type App<S extends AppShadersRecord, G extends BindGroupLayoutsRecord, P extends RefPipelineLayoutsRecord<G>> = {
    device: Device,
    shaders: AppShaders<S>,
    layout: AppLayout<G, P>
}

export class AppBuilder {

    constructor(private label: string) {}

    withShaders<S extends AppShadersRecord>(shaders: S): AppBuilderWithShaders<S> {
        return new AppBuilderWithShaders<S>(this.label, shaders)
    }

}

export class AppBuilderWithShaders<S extends AppShadersRecord> {

    constructor(private label: string, private shaders: S) {}

    withGroupLayouts<G extends BindGroupLayoutsRecord>(record: G): AppBuilderWithGroupLayouts<S, G> {
        return new AppBuilderWithGroupLayouts(this.label, this.shaders, record)
    }

}

export class AppBuilderWithGroupLayouts<S extends AppShadersRecord, G extends BindGroupLayoutsRecord> {

    constructor(readonly label: string, private shaders: S, private record: G) {
    }

    withPipelineLayouts<P extends RefPipelineLayoutsRecord<G>>(record: P): AppBuilderWithPipelineLayouts<S, G, P> {
        return new AppBuilderWithPipelineLayouts(this.label, this.shaders, this.record, record)
    }

}

export class AppBuilderWithPipelineLayouts<S extends AppShadersRecord, G extends BindGroupLayoutsRecord, P extends RefPipelineLayoutsRecord<G>> {

    constructor(readonly label: string, private shaders: S, private groupsRecord: G, private pipelinesRecord: P) {
    }

    async build(device: Device, rootPath: string = ".", processor: (code: string, path?: string | null) => string = code => code): Promise<App<S, G, P>> {
        const shaders = await appShadersBuilder(`${this.label}/shaders`)
            .withShaders(this.shaders)
            .build(device, rootPath, processor)
        const layout = appLayoutBuilder(`${this.label}/layout`)
            .withGroupLayouts(this.groupsRecord)
            .withPipelineLayouts(this.pipelinesRecord)
            .build(device)
        return { device, shaders, layout }
    }

}

export function appBuilder(label: string): AppBuilder {
    return new AppBuilder(label)
}