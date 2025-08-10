import { Firestore } from '@google-cloud/firestore';
import { Logger } from '../utils/logger';
export declare class TokenManager {
    private db;
    private logger;
    private tokenUsage;
    private costRates;
    private trackingInterval;
    constructor(db: Firestore, logger: Logger);
    initialize(): Promise<void>;
    startTracking(agents: Map<string, any>): void;
    stopTracking(): void;
    recordUsage(agentId: string, model: string, tokens: number): void;
    private calculateCost;
    private collectTokenUsage;
    private storeTokenUsage;
    getTokenUsage(since?: number): Promise<any>;
    getProjectedCost(hours: number): Promise<number>;
    private loadTokenHistory;
    checkBudgetAlerts(budgetLimit: number): Promise<boolean>;
}
