import { MessageClassification } from '../../models/communication.types';
export declare class MessageClassifier {
    private openai;
    private classificationCache;
    constructor();
    classifyMessage(content: string, context: any): Promise<MessageClassification>;
    batchClassify(messages: string[]): Promise<MessageClassification[]>;
    private generateCacheKey;
    clearCache(): void;
}
