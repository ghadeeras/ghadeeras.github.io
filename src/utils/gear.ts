export async function fetchTextFile(url: string): Promise<string> {
    return fetch(url, { method : "get", mode : "no-cors" }).then(response => response.text());
}