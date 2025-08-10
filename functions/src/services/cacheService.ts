// functions/src/services/cacheService.ts
import { Firestore, Timestamp } from '@google-cloud/firestore';
import * as crypto from 'crypto';

export class CacheService {
    private memoryCache: Map<string, any> = new Map();
    private ttlMap: Map<string, number> = new Map();

    constructor(
        private db: Firestore,
        private defaultTTL: number = 300000 // 5 minutes
    ) {
        // Clean up expired entries periodically
        setInterval(() => this.cleanExpired(), 60000);
    }

    async get(key: string): Promise<any> {
        // Check memory cache first
        if (this.memoryCache.has(key)) {
            const ttl = this.ttlMap.get(key);
            if (ttl && ttl > Date.now()) {
                return this.memoryCache.get(key);
            } else {
                // Expired
                this.memoryCache.delete(key);
                this.ttlMap.delete(key);
            }
        }

        // Check Firestore cache
        const doc = await this.db.collection('cache').doc(key).get();
        if (doc.exists) {
            const data = doc.data();
            if (data && data.ttl > Date.now()) {
                // Store in memory cache
                this.memoryCache.set(key, data.value);
                this.ttlMap.set(key, data.ttl);
                return data.value;
            } else {
                // Expired in Firestore
                await this.db.collection('cache').doc(key).delete();
            }
        }

        return null;
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        const expiry = Date.now() + (ttl || this.defaultTTL);

        // Store in memory
        this.memoryCache.set(key, value);
        this.ttlMap.set(key, expiry);

        // Store in Firestore
        await this.db.collection('cache').doc(key).set({
            value,
            ttl: expiry,
            createdAt: Timestamp.now()
        });
    }

    async delete(key: string): Promise<void> {
        this.memoryCache.delete(key);
        this.ttlMap.delete(key);
        await this.db.collection('cache').doc(key).delete();
    }

    async clear(): Promise<void> {
        this.memoryCache.clear();
        this.ttlMap.clear();

        // Clear Firestore cache
        const batch = this.db.batch();
        const docs = await this.db.collection('cache').listDocuments();
        docs.forEach(doc => batch.delete(doc));
        await batch.commit();
    }

    private cleanExpired(): void {
        const now = Date.now();

        for (const [key, ttl] of this.ttlMap) {
            if (ttl < now) {
                this.memoryCache.delete(key);
                this.ttlMap.delete(key);
            }
        }
    }

    generateKey(...parts: any[]): string {
        const data = JSON.stringify(parts);
        return crypto.createHash('md5').update(data).digest('hex');
    }

    async memoize<T>(
        key: string,
        fn: () => Promise<T>,
        ttl?: number
    ): Promise<T> {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }

        const result = await fn();
        await this.set(key, result, ttl);
        return result;
    }

    getMemoryStats() {
        return {
            entries: this.memoryCache.size,
            keys: Array.from(this.memoryCache.keys()),
            sizeEstimate: JSON.stringify(Array.from(this.memoryCache.values())).length
        };
    }
}
