import { Device } from "./device"

export type Descriptor = {
    [k in string]: Definition<any> | GPUObject | Descriptor
}

export type InferObject<D extends (Definition<any> | GPUObject | Descriptor)> = 
      D extends Definition<infer O> ? O 
    : D extends GPUObject ? D
    : D extends Descriptor ? { [k in keyof D]: InferObject<D[k]> }
    : never

export class GPUObject {

    definition(): Definition<this> {
        return new Definition(() => this)
    }

}

export class Definition<O> {

    private object: Promise<O> | O | null = null

    constructor(private factory: (device: Device, label: string) => Promise<O> | O) {
    }

    async create(device: Device, label: string): Promise<O> {
        const result = this.object === null
            ? this.object = this.factory(device, label)
            : this.object
        return await result
    }

    static from<D extends Descriptor>(descriptor: D) {
        return new Definition((device, label) => create(device, label, descriptor))
    }

    static of<O>(object: O) {
        return new Definition(() => object)
    }

    static device() {
        return new Definition(device => device)
    }

}

async function create<D extends Descriptor>(device: Device, label: string, descriptor: D): Promise<InferObject<D>> {
    const result: { [k in keyof D]?: InferObject<D[k]> } = {}
    for (const k of Object.keys(descriptor)) {
        const key = k as keyof D
        const value = descriptor[k]
        const newLabel = `${label}.${k}`
        result[key] = 
              value instanceof Definition ? await value.create(device, newLabel) 
            : value instanceof GPUObject ? value
            : await create(device, newLabel, value)
    }
    return result as InferObject<D>
}