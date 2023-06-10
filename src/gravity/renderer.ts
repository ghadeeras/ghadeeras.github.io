import { Universe } from "./universe.js"

export interface Renderer {

    resize(): void

    render(universe: Universe): void

}