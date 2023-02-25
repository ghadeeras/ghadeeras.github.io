import { Button, VirtualKey } from './gear-buttons.js';
import { Keyboard } from './gear-keyboard.js';
import { Pointer } from './gear-pointer.js';
import { FrequencyMeter } from './misc.js';
export function newLoop(loopLogic, inputDescriptor) {
    return new LoopImpl(loopLogic, inputDescriptor);
}
class LoopImpl {
    constructor(loopAutomaton, loopDescriptor) {
        var _a;
        this.loopAutomaton = loopAutomaton;
        this.loopDescriptor = loopDescriptor;
        this.pointer = new Pointer(this.loopDescriptor.input.pointer.element);
        this.keyboard = new Keyboard();
        this.frequencyMeter = this.loopDescriptor.fps
            ? FrequencyMeter.create((_a = this.loopDescriptor.fps.periodInMilliseconds) !== null && _a !== void 0 ? _a : 1000, this.loopDescriptor.fps.element)
            : new FrequencyMeter(1000, () => { });
        this._paused = false;
        if (loopDescriptor.input.keys) {
            for (const keyDescriptor of loopDescriptor.input.keys) {
                const button = this.newButton(keyDescriptor, loopDescriptor.styling);
                if (keyDescriptor.onPressed) {
                    const onPressed = keyDescriptor.onPressed;
                    button.register(b => {
                        if (b.pressed) {
                            onPressed(this, this.keyboard);
                        }
                    });
                }
                if (keyDescriptor.onReleased) {
                    const onReleased = keyDescriptor.onReleased;
                    button.register(b => {
                        if (!b.pressed) {
                            onReleased(this, this.keyboard);
                        }
                    });
                }
            }
        }
        if (loopDescriptor.input.pointer) {
            const pointer = loopDescriptor.input.pointer;
            if (pointer.onMoved) {
                const onMoved = pointer.onMoved;
                this.pointer.register(p => onMoved(this, ...p.position));
            }
            if (pointer.defaultDraggingTarget) {
                this.pointer.draggingTarget = pointer.defaultDraggingTarget;
            }
        }
    }
    get animationPaused() {
        return this._paused;
    }
    set animationPaused(p) {
        this._paused = p;
    }
    get draggingTarget() {
        return this.pointer.draggingTarget;
    }
    set draggingTarget(draggingTarget) {
        this.pointer.draggingTarget = draggingTarget;
    }
    removeDraggingTarget() {
        this.pointer.removeDraggingTarget();
    }
    run() {
        if (LoopImpl.activeLoop !== this) {
            LoopImpl.activeLoop = this;
            this.pointer.use();
            this.keyboard.use();
            this.nextFrame();
        }
    }
    nextFrame() {
        requestAnimationFrame(time => {
            const elapsed = this.frequencyMeter.tick(time);
            if (!this.animationPaused) {
                this.loopAutomaton.animate(this, time, elapsed);
            }
            this.loopAutomaton.render();
            if (this === LoopImpl.activeLoop) {
                this.nextFrame();
            }
        });
    }
    newButton(keyDescriptor, styling) {
        var _a, _b;
        const pressedClass = (_a = styling === null || styling === void 0 ? void 0 : styling.pressedButton) !== null && _a !== void 0 ? _a : "";
        const releasedClass = (_b = styling === null || styling === void 0 ? void 0 : styling.releasedButton) !== null && _b !== void 0 ? _b : "";
        const virtualButtons = keyDescriptor.virtualKey !== undefined
            ? [...document.querySelectorAll(keyDescriptor.virtualKey)].filter(e => e instanceof HTMLElement)
            : [];
        const button = Button.anyOf(...keyDescriptor.alternatives.map(ks => Button.allOf(...ks.map(k => this.keyboard.key(k))).when(b => b.pressed && this.keyboard.pressedCount == ks.length)), ...virtualButtons.map(e => new VirtualKey(e)));
        if (virtualButtons.length > 0) {
            button.register(b => {
                if (b.pressed) {
                    virtualButtons.forEach(b => {
                        b.className = `${b.className.replace(releasedClass, "")} ${pressedClass}`.trim();
                    });
                }
                else {
                    virtualButtons.forEach(b => {
                        b.className = `${b.className.replace(pressedClass, "")} ${releasedClass}`.trim();
                    });
                }
            });
        }
        return button;
    }
}
LoopImpl.activeLoop = null;
//# sourceMappingURL=gear-loop.js.map