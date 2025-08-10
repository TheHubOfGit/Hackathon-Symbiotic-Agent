export declare class PriorityQueue<T> {
    private items;
    enqueue(element: T, priority: number): void;
    dequeue(): T | undefined;
    peek(): T | undefined;
    isEmpty(): boolean;
    size(): number;
    clear(): void;
}
