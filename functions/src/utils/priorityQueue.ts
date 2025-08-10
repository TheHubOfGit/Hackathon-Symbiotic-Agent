// functions/src/utils/priorityQueue.ts
export class PriorityQueue<T> {
    private items: Array<{ element: T; priority: number }> = [];

    enqueue(element: T, priority: number) {
        const queueElement = { element, priority };
        let added = false;

        for (let i = 0; i < this.items.length; i++) {
            const currentItem = this.items[i];
            if (currentItem && queueElement.priority > currentItem.priority) {
                this.items.splice(i, 0, queueElement);
                added = true;
                break;
            }
        }

        if (!added) {
            this.items.push(queueElement);
        }
    }

    dequeue(): T | undefined {
        const item = this.items.shift();
        return item?.element;
    }

    peek(): T | undefined {
        return this.items[0]?.element;
    }

    isEmpty(): boolean {
        return this.items.length === 0;
    }

    size(): number {
        return this.items.length;
    }

    clear() {
        this.items = [];
    }
}
