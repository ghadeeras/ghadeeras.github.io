import { required } from "./utils/misc.js"

export type ControllerEvent = {
    key: string
    down: boolean
    ctrl: boolean
    alt: boolean
    shift: boolean
}

export type Toy = {
    gitHubRepo: string | null
    video: string | null
    huds: Record<string, string> | null
    init: (c: Controller) => void
}

let currentHudId: string | null = null

export class Controller {

    private _handler: (e: ControllerEvent) => boolean

    private ctrl: boolean = false
    private alt: boolean = false
    private shift: boolean = false

    constructor() {
        this._handler = e => false
    }

    set handler(h: (e: ControllerEvent) => boolean) {
        this._handler = h
        this.init()
    }

    private init() {
        window.onkeydown = e => this.handleKeyboardEvent(e, true)
        window.onkeyup = e => this.handleKeyboardEvent(e, false)
        const elements = document.getElementsByTagName("kbd")
        for (const element of elements) {
            element.onmousedown = e => this.handleVirtualEvent(e, true)
            element.onmouseup = e => this.handleVirtualEvent(e, false)
        }
    }

    private handleVirtualEvent(e: MouseEvent, down: boolean) {
        const target = e.currentTarget as HTMLElement
        const key = target.innerText.trim().toLocaleLowerCase()
        if (key.length == 1) {
            const handled = this._handler({
                key: key,
                down: down,
                ctrl: this.ctrl,
                alt: this.alt,
                shift: this.shift
            })
            if (handled) {
                e.preventDefault()
            }
            if (down) {
                target.classList.add("pressed")
            } else {
                target.classList.remove("pressed")
            }
        } else if (!down) {
            this.ctrl = this.ctrl !== (key === "ctrl")
            this.alt = this.alt !== (key === "alt")
            this.shift = this.shift !== (key === "shift")
            if (target.classList.contains("pressed")) {
                target.classList.remove("pressed")
            } else {
                target.classList.add("pressed")
            }
        }
    }

    private handleKeyboardEvent(e: KeyboardEvent, down: boolean) {
        const handled = this._handler({
            key: e.key,
            down: down,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            shift: e.shiftKey
        })
        if (handled) {
            e.preventDefault()
        }
    }
}

export default function init(toy: Toy) {
    window.onload = () => {
        link("logo", "/")
        link("github",  "https://github.com/ghadeeras/" + (toy.gitHubRepo ?? "ghadeeras.github.io"), true)
        link("linkedin", "https://www.linkedin.com/in/ghadeer-abousaleh", true)
        link("twitter", "https://twitter.com/gee8sh", true)
        link("youtube", toy.video ?? "https://www.youtube.com/channel/UCxeQ_6WQ7Zjth8bmCaZ4E7Q", true)

        for (const element of document.getElementsByClassName("toy")) {
            doLink(element as HTMLElement, "/pages/" + element.id)
        }

        setupHud("about", "about-button")
        setupHud("controls", "controls-button")
        const huds = (toy.huds ?? {})
        for (const hudId of Object.keys(huds)) {
            setupHud(hudId, huds[hudId])
        }

        toy.init(new Controller())
    }
}

function link(elementId: string, url: string, inNewWindow = false) {
    const element = required(document.getElementById(elementId))
    doLink(element, url, inNewWindow)
}

function doLink(element: HTMLElement, url: string, inNewWindow = false) {
    element.onmouseup = e => {
        e.preventDefault()
        inNewWindow || e.button == 1
            ? window.open(url)
            : location.href = url
    }
}

function setupHud(hudId: string, buttonId: string) {
    const hud = required(document.getElementById(hudId))
    const hudButton = required(document.getElementById(buttonId))
    hudButton.onclick = _ => {
        if (currentHudId !== null && currentHudId !== hudId) {
            const currentHud = required(document.getElementById(currentHudId))
            currentHud.setAttribute("style", "")
        }
        hud.setAttribute("style", currentHudId !== hudId ? "visibility: visible" : "")
        currentHudId = currentHudId !== hudId ? hudId : null
    }
}
