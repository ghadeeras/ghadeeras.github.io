import * as scanner from './my-scanner.js'

export function init() {
    const myScanner = new scanner.MyScanner()

    const inputElement = document.getElementById("input") as HTMLTextAreaElement
    const outputElement = document.getElementById("output")
    const tokenizeButton = document.getElementById("tokenize")

    if (tokenizeButton && outputElement) {
        tokenizeButton.onclick = () => {
            outputElement.innerText = myScanner.tokenize(inputElement.value)
        }
    } else {
        throw new Error("One or more needed HTML elements are missing!")
    }

}