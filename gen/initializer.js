import { required } from "/gear/latest/loops/misc.js";
let currentHudId = null;
export default function init(toy) {
    window.onload = () => {
        var _a, _b, _c;
        link("logo", "/");
        link("github", "https://github.com/ghadeeras/" + ((_a = toy.gitHubRepo) !== null && _a !== void 0 ? _a : "ghadeeras.github.io"), true);
        link("linkedin", "https://www.linkedin.com/in/ghadeer-abousaleh", true);
        link("mastodon", "https://techhub.social/@gee8sh", true);
        link("youtube", (_b = toy.video) !== null && _b !== void 0 ? _b : "https://www.youtube.com/@gee8sh", true);
        for (const element of document.getElementsByClassName("toy")) {
            doLink(element, "/pages/" + element.id);
        }
        setupHud("about", "about-button");
        setupHud("controls", "controls-button");
        const huds = ((_c = toy.huds) !== null && _c !== void 0 ? _c : {});
        for (const hudId of Object.keys(huds)) {
            setupHud(hudId, huds[hudId]);
        }
        toy.init();
    };
}
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
function setupHud(hudId, buttonId) {
    const hud = required(document.getElementById(hudId));
    const hudButton = required(document.getElementById(buttonId));
    hudButton.onclick = _ => {
        if (currentHudId !== null && currentHudId !== hudId) {
            const currentHud = required(document.getElementById(currentHudId));
            currentHud.setAttribute("style", "");
        }
        hud.setAttribute("style", currentHudId !== hudId ? "visibility: visible" : "");
        currentHudId = currentHudId !== hudId ? hudId : null;
    };
}
//# sourceMappingURL=initializer.js.map