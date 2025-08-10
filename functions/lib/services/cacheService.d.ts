import { Firestore } from '@google-cloud/firestore';
export declare class CacheService {
    private db;
    private defaultTTL;
    private memoryCache;
    private ttlMap;
    constructor(db: Firestore, defaultTTL?: number);
    get(key: string): Promise<any>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    private cleanExpired;
    generateKey(...parts: any[]): string;
    memoize<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>;
    getMemoryStats(): {
        entries: number;
        keys: string[];
        sizeEstimate: number;
    };
}
