import { required } from "./utils/misc.js"

type Toy = {
    gitHubRepo: string
    video: string
    init: () => void
}

let currentHudId: string | null = null

export default function init(toy: Toy) {
    window.onload = () => {
        link("logo", "/")
        link("github",  "https://github.com/ghadeeras/" + (toy.gitHubRepo ?? "ghadeeras.github.io"), true)
        link("linkedin", "https://www.linkedin.com/in/ghadeer-abousaleh", true)
        link("twitter", "https://twitter.com/gee8sh", true)
        link("youtube", "https://www.youtube.com/channel/UCxeQ_6WQ7Zjth8bmCaZ4E7Q/" + (toy.video ?? ""), true)

        for (const element of document.getElementsByClassName("toy")) {
            doLink(element as HTMLElement, "/pages/" + element.id)
        }

        setupHud("about", "about-button")
        setupHud("controls", "controls-button")

        toy.init()
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
