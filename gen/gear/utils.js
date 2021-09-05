var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
export function fetchFiles(files, path = ".") {
    return __awaiter(this, void 0, void 0, function* () {
        const result = {};
        const keys = Object.keys(files);
        const promises = keys.map(k => fetchFile(k, `${path}/${files[k]}`));
        for (let [key, promise] of promises) {
            result[key] = yield promise;
        }
        return result;
    });
}
function fetchFile(key, url) {
    return [key, fetch(url, { method: "get", mode: "no-cors" }).then(response => response.text())];
}
export function load(path, onready, ...files) {
    const remaining = [files.length];
    for (let [file, consumer] of files) {
        loadFile(path + "/" + file, content => {
            consumer(content);
            remaining[0]--;
            if (remaining[0] <= 0) {
                onready();
            }
        });
    }
}
function loadFile(url, consumer) {
    fetch(url, { method: "get", mode: "no-cors" }).then(response => response.text().then(consumer));
}
//# sourceMappingURL=utils.js.map