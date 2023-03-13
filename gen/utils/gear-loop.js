import { Button, VirtualKey } from './gear-buttons.js';
import { Keyboard } from './gear-keyboard.js';
import { Pointer } from './gear-pointer.js';
import { CanvasSizeManager } from './gear-canvas.js';
import { FrequencyMeter, required } from './misc.js';
export function newLoop(loopLogic, inputDescriptor) {
    return new LoopImpl(loopLogic, inputDescriptor);
}
class LoopImpl {
    constructor(loopLogic, loopDescriptor) {
        var _a;
        this.loopLogic = loopLogic;
        this.loopDescriptor = loopDescriptor;
        this.keyboard = new Keyboard();
        this.canvasSizeManager = new CanvasSizeManager(true);
        this.render = () => { };
        this.frequencyMeter = this.loopDescriptor.output.fps
            ? FrequencyMeter.create((_a = this.loopDescriptor.output.fps.periodInMilliseconds) !== null && _a !== void 0 ? _a : 1000, this.loopDescriptor.output.fps.element)
            : new FrequencyMeter(1000, () => { });
        this._paused = false;
        const deferredInputOps = [];
        const deferredOutputOps = [];
        this.keys = this.createKeys(loopDescriptor, deferredInputOps);
        this.pointers = this.createPointers(loopDescriptor, deferredInputOps);
        this.canvases = this.getCanvases(loopDescriptor, deferredOutputOps);
        const inputWiring = loopLogic.inputWiring(this, this);
        const outputWiring = loopLogic.outputWiring(this);
        this.render = outputWiring.onRender;
        deferredInputOps.forEach(op => op(inputWiring));
        deferredOutputOps.forEach(op => op(outputWiring));
    }
    getCanvases(loopDescriptor, deferredOps) {
        const canvases = {};
        if (loopDescriptor.output.canvases) {
            for (const canvasName of keysOf(loopDescriptor.output.canvases)) {
                const canvasDescriptor = loopDescriptor.output.canvases[canvasName];
                const canvas = this.getCanvasElement(canvasDescriptor);
                canvases[canvasName] = canvas;
                deferredOps.push(loopWiring => this.wireCanvas(canvasName, canvas, loopWiring));
            }
        }
        return canvases;
    }
    getCanvasElement(canvasDescriptor) {
        return required(document.getElementById(canvasDescriptor.element));
    }
    wireCanvas(canvasName, canvas, loopWiring) {
        if (!loopWiring.canvases) {
            return;
        }
        const canvasWiring = loopWiring.canvases[canvasName];
        if (canvasWiring && canvasWiring.onResize) {
            this.canvasSizeManager.observe(canvas, canvasWiring.onResize);
        }
    }
    createKeys(loopDescriptor, deferredOps) {
        const keys = {};
        if (loopDescriptor.input.keys) {
            for (const keyName of keysOf(loopDescriptor.input.keys)) {
                const keyDescriptor = loopDescriptor.input.keys[keyName];
                const button = this.newButton(keyDescriptor, loopDescriptor.output.styling);
                keys[keyName] = button;
                deferredOps.push(loopWiring => {
                    this.wireButton(keyName, button, loopWiring);
                });
            }
        }
        return keys;
    }
    wireButton(keyDescriptorKey, button, loopWiring) {
        const wiring = loopWiring.keys ? loopWiring.keys[keyDescriptorKey] : null;
        if (!wiring) {
            return;
        }
        if (wiring.onPressed) {
            const onPressed = wiring.onPressed;
            button.register(b => {
                if (b.pressed) {
                    onPressed();
                }
            });
        }
        if (wiring.onReleased) {
            const onReleased = wiring.onReleased;
            button.register(b => {
                if (!b.pressed) {
                    onReleased();
                }
            });
        }
        if (wiring.onChange) {
            const onChange = wiring.onChange;
            button.register(b => {
                onChange();
            });
        }
    }
    createPointers(loopDescriptor, deferredOps) {
        const pointers = {};
        if (loopDescriptor.input.pointers) {
            for (const pointerDescriptorKey of keysOf(loopDescriptor.input.pointers)) {
                const pointerDescriptor = loopDescriptor.input.pointers[pointerDescriptorKey];
                const pointer = new Pointer(pointerDescriptor.element);
                pointers[pointerDescriptorKey] = pointer;
                deferredOps.push(loopWiring => {
                    this.wirePointer(pointerDescriptorKey, pointer, loopWiring);
                });
            }
        }
        return pointers;
    }
    wirePointer(pointerDescriptorKey, pointer, loopWiring) {
        const wiring = loopWiring.pointers[pointerDescriptorKey];
        if (!wiring) {
            return;
        }
        if (wiring.defaultDraggingTarget) {
            pointer.draggingTarget = wiring.defaultDraggingTarget;
        }
        if (wiring.onMoved) {
            const onMoved = wiring.onMoved;
            pointer.register(p => onMoved());
        }
        if (wiring.primaryButton) {
            const buttonWiring = wiring.primaryButton;
            if (buttonWiring.onPressed) {
                const onPressed = buttonWiring.onPressed;
                pointer.primary.register(b => {
                    if (b.pressed) {
                        onPressed();
                    }
                });
            }
            if (buttonWiring.onReleased) {
                const onReleased = buttonWiring.onReleased;
                pointer.primary.register(b => {
                    if (!b.pressed) {
                        onReleased();
                    }
                });
            }
            if (buttonWiring.onChange) {
                const onChange = buttonWiring.onChange;
                pointer.primary.register(() => {
                    onChange();
                });
            }
        }
    }
    get animationPaused() {
        return this._paused;
    }
    set animationPaused(p) {
        this._paused = p;
    }
    run() {
        if (LoopImpl.activeLoop !== this) {
            LoopImpl.activeLoop = this;
            for (const key of keysOf(this.pointers)) {
                const pointer = this.pointers[key];
                pointer.use();
            }
            this.keyboard.use();
            this.nextFrame();
        }
    }
    nextFrame() {
        requestAnimationFrame(time => {
            const elapsed = this.frequencyMeter.tick(time);
            if (!this.animationPaused) {
                this.loopLogic.animate(time, elapsed, this);
            }
            this.render();
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
        const button = Button.anyOf(...keyDescriptor.alternatives.map(ks => Button.allOf(...ks.map(k => this.keyboard.key(k))).when(keyDescriptor.exclusive
            ? b => b.pressed && this.keyboard.pressedCount == ks.length
            : b => b.pressed)), ...virtualButtons.map(e => new VirtualKey(e)));
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
function keysOf(object) {
    return Object.keys(object);
}
//# sourceMappingURL=gear-loop.js.map