export function intact() {
    return value => value;
}
export function compositeConsumer(...consumers) {
    switch (consumers.length) {
        case 0: return () => { };
        case 1: return consumers[0];
        default: return value => {
            for (const consumer of consumers) {
                consumer(value);
            }
        };
    }
}
export function causeEffectLink(causeProducer, effect, effectConsumer) {
    return causeProducer(cause => effect(cause, effectConsumer));
}
export function load(path, onready, ...files) {
    const remaining = [files.length];
    for (let [file, consumer] of files) {
        fetchFile(path + "/" + file, content => {
            consumer(content);
            remaining[0]--;
            if (remaining[0] <= 0) {
                onready();
            }
        });
    }
}
function fetchFile(url, consumer) {
    fetch(url, { method: "get", mode: "no-cors" }).then(response => response.text().then(consumer));
}
//# sourceMappingURL=utils.js.map