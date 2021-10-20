export function asVec(array, offset = 0) {
    return [...array.slice(offset, offset + 4)];
}
export function asMat(array, offset = 0) {
    return [
        asVec(array, offset + 0),
        asVec(array, offset + 4),
        asVec(array, offset + 8),
        asVec(array, offset + 12)
    ];
}
//# sourceMappingURL=ether.js.map