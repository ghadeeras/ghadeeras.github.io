export function required(value) {
    if (!value) {
        throw new Error(`Required value is ${value}!`);
    }
    return value;
}
export function save(url, contentType, fileName) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.type = contentType;
    anchor.target = '_blank';
    anchor.download = fileName;
    anchor.click();
}
//# sourceMappingURL=misc.js.map