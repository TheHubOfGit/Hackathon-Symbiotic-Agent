import { Firestore } from '@google-cloud/firestore';
import { Logger } from '../utils/logger';
export declare enum ErrorSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export interface ErrorContext {
    agentId?: string;
    userId?: string;
    operation?: string;
    metadata?: any;
}
export declare class ErrorHandler {
    private db;
    private logger;
    private errorCount;
    private errorPatterns;
    constructor(db: Firestore, logger: Logger);
    handleError(error: Error, severity: ErrorSeverity, context?: ErrorContext): Promise<void>;
    private handleCriticalError;
    private handleHighError;
    private handleMediumError;
    private trackErrorPattern;
    private extractErrorPattern;
    private getErrorKey;
    private storeError;
    private sendAlert;
    private attemptAgentRecovery;
    private checkErrorStorm;
    getErrorReport(since?: number): Promise<any>;
    clearErrorCounts(): void;
}
