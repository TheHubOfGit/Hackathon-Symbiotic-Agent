export declare function generateId(prefix?: string): string;
export declare function sleep(ms: number): Promise<void>;
export declare function chunk<T>(array: T[], size: number): T[][];
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
export declare function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void;
export declare function retry<T>(fn: () => Promise<T>, retries?: number, delay?: number): Promise<T>;
export declare function formatBytes(bytes: number): string;
export declare function formatDuration(ms: number): string;
