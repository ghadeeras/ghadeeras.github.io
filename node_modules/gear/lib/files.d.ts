export declare function fetchTextFile(url: string): Promise<string>;
export declare function fetchTextFiles<K extends string, T extends Record<K, string>>(files: T, path?: string): Promise<T>;
export declare function save(url: string, contentType: string, fileName: string): void;
