import { Firestore } from '@google-cloud/firestore';
import { MessageRouter } from '../core/messageRouter';
import { Logger } from '../utils/logger';
export declare class EditCoordinator {
    private db;
    private messageRouter;
    private logger;
    private anthropic;
    constructor(db: Firestore, messageRouter: MessageRouter, logger: Logger);
    private initialize;
    private setupMessageHandlers;
    private handleCodeExtracted;
    private generateEditSuggestions;
    private createRecommendations;
    private calculatePriority;
    private estimateEffort;
    private distributeRecommendations;
    private findAffectedUsers;
}
