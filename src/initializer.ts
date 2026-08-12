import { required } from "gear"

export type Toy = {
    gitHubRepo: string | null
    video: string | null
    huds: Record<string, string> | null
    init: () => void
}

let currentHudId: string | null = null

export default function init(toy: Toy) {
    // window.onload = () => {
        link("logo", "/")
        link("github",  "https://github.com/ghadeeras/" + (toy.gitHubRepo ?? "ghadeeras.github.io"), true)
        link("linkedin", "https://www.linkedin.com/in/ghadeer-abousaleh", true)
        link("mastodon", "https://techhub.social/@gee8sh", true)
        link("youtube", toy.video ?? "https://www.youtube.com/@gee8sh", true)

        for (const element of document.getElementsByClassName("toy")) {
            doLink(element as HTMLElement, "/pages/" + element.id)
        }

        setupHud("about", "about-button")
        setupHud("controls", "controls-button")
        const huds = (toy.huds ?? {})
        for (const hudId of Object.keys(huds)) {
            setupHud(hudId, huds[hudId])
        }

        toy.init()
    }
// }

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

const huds = new Map<string, () => void>

function setupHud(hudId: string, buttonId: string | null) {
    const hud = document.getElementById(hudId)
    if (!hud) {
        return
    }
    const handler = () => {
        if (currentHudId !== null && currentHudId !== hudId) {
            const currentHud = required(document.getElementById(currentHudId))
            currentHud.style.visibility = ""
            currentHud.dispatchEvent(new Event("cancel"))
        }
        hud.style.visibility = currentHudId !== hudId ? "visible" : ""
        currentHudId = currentHudId !== hudId ? hudId : null
        if (currentHudId !== hudId) {
            hud.dispatchEvent(new Event("cancel"))
        }
    }
    huds.set(hudId, handler)
    if (buttonId !== null) {
        const hudButton = document.getElementById(buttonId)
        if (!hudButton) {
            return
        }
        hudButton.onclick = handler
    }
}

export function showHud(hudId: string) {
    if (hudId !== currentHudId) {
        const handler = huds.get(hudId)
        if (handler !== undefined) {
            handler()
        }
    }
}

export function hideCurrentHud() {
    if (currentHudId !== null) {
        const handler = huds.get(currentHudId)
        if (handler !== undefined) {
            handler()
        }
    }
}
