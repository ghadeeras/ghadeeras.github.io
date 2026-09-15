import { required } from "gear";
let currentHudId = null;
export default function init(toy) {
    // window.onload = () => {
    link("logo", "/");
    link("github", "https://github.com/ghadeeras/" + (toy.gitHubRepo ?? "ghadeeras.github.io"), true);
    link("linkedin", "https://www.linkedin.com/in/ghadeer-abousaleh", true);
    link("mastodon", "https://techhub.social/@gee8sh", true);
    link("youtube", toy.video ?? "https://www.youtube.com/@gee8sh", true);
    for (const element of document.getElementsByClassName("toy")) {
        doLink(element, "/pages/" + element.id);
    }
    setupHud("about", "about-button");
    setupHud("controls", "controls-button");
    const huds = (toy.huds ?? {});
    for (const hudId of Object.keys(huds)) {
        setupHud(hudId, huds[hudId]);
    }
    toy.init();
}
// }
function link(elementId, url, inNewWindow = false) {
    const element = required(document.getElementById(elementId));
    doLink(element, url, inNewWindow);
}
function doLink(element, url, inNewWindow = false) {
    element.onmouseup = e => {
        e.preventDefault();
        inNewWindow || e.button == 1
            ? window.open(url)
            : location.href = url;
    };
}
const huds = new Map;
function setupHud(hudId, buttonId) {
    const hud = document.getElementById(hudId);
    if (!hud) {
        return;
    }
    const handler = () => {
        if (currentHudId !== null && currentHudId !== hudId) {
            const currentHud = required(document.getElementById(currentHudId));
            currentHud.style.visibility = "";
            currentHud.dispatchEvent(new Event("cancel"));
        }
        hud.style.visibility = currentHudId !== hudId ? "visible" : "";
        currentHudId = currentHudId !== hudId ? hudId : null;
        if (currentHudId !== hudId) {
            hud.dispatchEvent(new Event("cancel"));
        }
    };
    huds.set(hudId, handler);
    if (buttonId !== null) {
        const hudButton = document.getElementById(buttonId);
        if (!hudButton) {
            return;
        }
        hudButton.onclick = handler;
    }
}
export function showHud(hudId) {
    if (hudId !== currentHudId) {
        const handler = huds.get(hudId);
        if (handler !== undefined) {
            handler();
        }
    }
}
export function hideHud(hudId) {
    if (currentHudId === hudId) {
        hideCurrentHud();
    }
}
export function hideCurrentHud() {
    if (currentHudId !== null) {
        const handler = huds.get(currentHudId);
        if (handler !== undefined) {
            handler();
        }
    }
}
//# sourceMappingURL=initializer.js.map