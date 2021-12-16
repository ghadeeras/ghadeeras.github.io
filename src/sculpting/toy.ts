import * as ether from "ether"
import * as gear from "gear"
import * as djee from "../djee/all.js"
import * as v from "../scalar-field/view.js"
import * as dragging from "../utils/dragging.js"
import { save } from "../utils/misc.js"
import { Carving } from "./carving.js"

const viewMatrix = ether.mat4.lookAt([-1, 1, 4], [0, 0, 0], [0, 1, 0])
const projectionMatrix = ether.mat4.projection(4)

export function init() {
    window.onload = doInit
}

async function doInit() {
    const view = await v.newView("canvas-gl")
    view.matView = viewMatrix
    view.matProjection = projectionMatrix

    const picker = await view.picker()

    const scalarFieldModule = await ether.loadScalarFieldModule()
    const stone = scalarFieldModule.newInstance()
    stone.resolution = 64
    stone.sampler = field
    stone.contourValue = 0.5

    const toy = new Toy(stone, scalarFieldModule, view, picker)
}

class Toy {

    private meshComputer: gear.DeferredComputation<Float32Array> = new gear.DeferredComputation(() => this.stone.vertices)

    constructor(private stone: ether.ScalarFieldInstance, scalarFieldModule: ether.ScalarFieldModule, view: v.View, picker: v.Picker) {
        const canvas = gear.elementEvents("canvas-gl")
        const rotationDragging = new dragging.RotationDragging(() => view.matPositions, () => ether.mat4.mul(view.matProjection, view.matView), 4)
        const focalRatioDragging = new dragging.RatioDragging(() => view.matProjection[0][0])

        const carving = new Carving(
            () => this.stone,
            () => modelViewProjectionMatrixOf(view),
            picker,
            scalarFieldModule, 
            brush
        )    

        const cases = {
            contourValue: gear.Value.from<gear.Dragging>(),
            carving: gear.Value.from<gear.Dragging>(),
            rotation: gear.Value.from<gear.Dragging>(),
            focalRatio: gear.Value.from<gear.Dragging>(),
            shininess: gear.Value.from<gear.Dragging>(),
            fogginess: gear.Value.from<gear.Dragging>(),
            lightPosition: gear.Value.from<gear.Dragging>(),
            lightRadius: gear.Value.from<gear.Dragging>(),
        }
        
        canvas.dragging.value.switch(gear.readableValue("mouse-binding").defaultsTo("rotation"), cases) 

        const contourValue = gear.Value.from(
            cases.contourValue
                .then(gear.drag(dragging.positionDragging))
                .map(([x, y]) => this.clamp((y + 1) / 2, 0, 1))
                .defaultsTo(this.stone.contourValue),
            gear.elementEvents("reset-contour").click.value.map(() => 0.5)
        )

        const resolution = this.levelOfDetails()

        const carvedStone = cases.carving
            .then(gear.drag(carving))
            .defaultsTo(this.stone)

        v.wire(view, {
            matModel: cases.rotation
                .then(gear.drag(rotationDragging))
                .defaultsTo(rotationDragging.currentValue()),

            matView: gear.Value.from<ether.Mat<4>>()
                .defaultsTo(view.matView),
            
            matProjection: cases.focalRatio
                .then(gear.drag(focalRatioDragging))
                .defaultsTo(focalRatioDragging.currentValue())
                .map(ratio => ether.mat4.projection(ratio)),

            color: contourValue
                .map(v => this.fieldColor(v)),

            shininess: cases.shininess
                .then(gear.drag(dragging.positionDragging))
                .map(([x, y]) => (y + 1) / 2)
                .defaultsTo(view.shininess),

            fogginess: cases.fogginess
                .then(gear.drag(dragging.positionDragging))
                .map(([x, y]) => (y + 1) / 2)
                .defaultsTo(view.fogginess),
            
            lightPosition: cases.lightPosition
                .then(gear.drag(dragging.positionDragging))
                .map(p => ether.vec2.length(p) > 1 ? ether.vec2.unit(p) : p)
                .map(([x, y]) => ether.vec2.of(x * Math.PI / 2, y * Math.PI / 2))
                .map(([x, y]) => ether.vec4.of(2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y), 1))
                .defaultsTo(ether.vec4.of(0, 0, 2, 1)),
            
            lightRadius: cases.lightRadius
                .then(gear.drag(dragging.positionDragging))
                .map(([x, y]) => (y + 1) / 2)
                .defaultsTo(0.1),
            
            vertices: gear.Value.from(
                resolution.then((r, c) => this.contourSurfaceDataForResolution(r, c)),
                contourValue.then((v, c) => this.contourSurfaceDataForValue(v, c)),
                gear.Value.from(
                    carvedStone, 
                    gear.elementEvents("undo").click.value.map(() => carving.undo())
                ).then((s, c) => this.contourSurfaceDataForStone(s, c)),
            )
        })
        
        gear.text("lod").value = resolution.map(lod => lod.toString())
        gear.elementEvents("save").click.value.attach(() => this.saveModel())
    }

    levelOfDetails() {
        const inc = gear.elementEvents("lod-inc").click.value.map(() => +8)
        const dec = gear.elementEvents("lod-dec").click.value.map(() => -8)
        const flow = gear.Value.from(inc, dec).reduce((i, lod) => this.clamp(lod + i, 32, 96), this.stone.resolution)
        return flow
    }

    clamp(n: number, min: number, max: number) {
        return n < min ? min : (n > max ? max : n)
    }

    fieldColor(contourValue: number = this.stone.contourValue): ether.Vec<4> {
        return [0.5, contourValue, 0.5, 1] 
    }

    contourSurfaceDataForStone(stone: ether.ScalarFieldInstance, meshConsumer: gear.Consumer<Float32Array>) {
        this.stone = stone
        this.meshComputer.perform().then(meshConsumer)
    }

    contourSurfaceDataForValue(value: number, meshConsumer: gear.Consumer<Float32Array>) {
        this.stone.contourValue = value
        this.meshComputer.perform().then(meshConsumer)
    }

    contourSurfaceDataForResolution(resolution: number, meshConsumer: gear.Consumer<Float32Array>) {
        this.stone.resolution = resolution
        this.meshComputer.perform().then(meshConsumer)
    }

    saveModel() {
        const fileName = document.getElementById("file-name") as HTMLInputElement

        const model = djee.createModel(fileName.value, this.stone.vertices)

        save(URL.createObjectURL(new Blob([JSON.stringify(model.model)])), 'text/json', `${fileName.value}.gltf`)
        save(URL.createObjectURL(new Blob([model.binary])), 'application/gltf-buffer', `${fileName.value}.bin`)
    }

}

const twoPi = 2 * Math.PI

function modelViewProjectionMatrixOf(view: v.View): ether.Mat4 {
    return ether.mat4.mul(
        view.matProjection,
        ether.mat4.mul(
            view.matView,
            view.matPositions
        )
    )
}

function field(x: number, y: number, z: number): ether.Vec<4> {
    const l = ether.vec3.length([x, y, z])
    const f = l <= 1 ? 
        l >= 0.5 ? (1 - Math.cos(twoPi * l)) / 2 : 1 : 
        0
    const g = l <= 1 ? 
        l >= 0.5 ? Math.PI * Math.sin(twoPi * l) / l : 0 : 
        0
    return [
        x * g,
        y * g,
        z * g,
        f
    ]
}

function brush(x: number, y: number, z: number): ether.Vec<4> {
    const l = ether.vec3.length([x, y, z])
    const f = l <= 1 ? (1 + Math.cos(Math.PI * l)) / 2 : 0
    const g = l <= 1 ? 
        l > Math.sqrt(Number.EPSILON) ? 
            (-Math.PI / 2) * Math.sin(Math.PI * l) / l : 
            -Math.PI * Math.PI / 2 : 
        0
    return [
        x * g,
        y * g,
        z * g,
        f
    ]
}
