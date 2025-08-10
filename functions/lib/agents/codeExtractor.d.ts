import { Firestore } from '@google-cloud/firestore';
import { MessageRouter } from '../core/messageRouter';
import { Logger } from '../utils/logger';
export declare class CodeExtractor {
    private db;
    private messageRouter;
    private logger;
    private openai;
    constructor(db: Firestore, messageRouter: MessageRouter, logger: Logger);
    private initialize;
    private setupMessageHandlers;
    private handleExtractionRequest;
    private requestTargetedScan;
    private extractCode;
}
