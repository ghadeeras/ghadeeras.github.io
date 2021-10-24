export function required<T>(value: T | null | undefined): T {
    if (!value) {
        throw new Error(`Required value is ${value}!`)
    }
    return value
}

export function save(url: string, contentType: string, fileName: string) {
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.type = contentType
    anchor.target = '_blank'
    anchor.download = fileName
    anchor.click()
}