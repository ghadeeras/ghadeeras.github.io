import { required } from "./utils/misc.js";
let currentHudId = null;
export class Controller {
    constructor() {
        this.ctrl = false;
        this.alt = false;
        this.shift = false;
        this._handler = e => false;
    }
    set handler(h) {
        this._handler = h;
        this.init();
    }
    init() {
        window.onkeydown = e => this.handleKeyboardEvent(e, true);
        window.onkeyup = e => this.handleKeyboardEvent(e, false);
        const elements = document.getElementsByTagName("kbd");
        for (const element of elements) {
            element.onmousedown = e => this.handleVirtualEvent(e, true);
            element.onmouseup = e => this.handleVirtualEvent(e, false);
        }
    }
    handleVirtualEvent(e, down) {
        const target = e.currentTarget;
        const key = target.innerText.trim().toLocaleLowerCase();
        if (key.length == 1) {
            const handled = this._handler({
                key: key,
                down: down,
                ctrl: this.ctrl,
                alt: this.alt,
                shift: this.shift
            });
            if (handled) {
                e.preventDefault();
            }
            if (down) {
                target.classList.add("pressed");
            }
            else {
                target.classList.remove("pressed");
            }
        }
        else if (!down) {
            this.ctrl = this.ctrl !== (key === "ctrl");
            this.alt = this.alt !== (key === "alt");
            this.shift = this.shift !== (key === "shift");
            if (target.classList.contains("pressed")) {
                target.classList.remove("pressed");
            }
            else {
                target.classList.add("pressed");
            }
        }
    }
    handleKeyboardEvent(e, down) {
        const handled = this._handler({
            key: e.key,
            down: down,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            shift: e.shiftKey
        });
        if (handled) {
            e.preventDefault();
        }
    }
}
export default function init(toy) {
    window.onload = () => {
        var _a, _b, _c;
        link("logo", "/");
        link("github", "https://github.com/ghadeeras/" + ((_a = toy.gitHubRepo) !== null && _a !== void 0 ? _a : "ghadeeras.github.io"), true);
        link("linkedin", "https://www.linkedin.com/in/ghadeer-abousaleh", true);
        link("twitter", "https://twitter.com/gee8sh", true);
        link("youtube", (_b = toy.video) !== null && _b !== void 0 ? _b : "https://www.youtube.com/channel/UCxeQ_6WQ7Zjth8bmCaZ4E7Q", true);
        for (const element of document.getElementsByClassName("toy")) {
            doLink(element, "/pages/" + element.id);
        }
        setupHud("about", "about-button");
        setupHud("controls", "controls-button");
        const huds = ((_c = toy.huds) !== null && _c !== void 0 ? _c : {});
        for (const hudId of Object.keys(huds)) {
            setupHud(hudId, huds[hudId]);
        }
        toy.init(new Controller());
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