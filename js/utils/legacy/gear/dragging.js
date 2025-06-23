export class SimpleDraggingHandler {
    constructor(draggingFunction) {
        this.draggingFunction = draggingFunction;
    }
    currentValue(position, shift, ctrl, alt) {
        return this.draggingFunction(position, shift, ctrl, alt);
    }
    mapper(value, from, shift, ctrl, alt) {
        return to => this.draggingFunction(to, shift, ctrl, alt);
    }
    finalize(value) {
        return value;
    }
}
//# sourceMappingURL=dragging.js.map