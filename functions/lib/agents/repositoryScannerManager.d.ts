import { Firestore } from '@google-cloud/firestore';
import { MessageRouter } from '../core/messageRouter';
import { Logger } from '../utils/logger';
export declare class RepositoryScannerManager {
    private db;
    private messageRouter;
    private logger;
    private scanners;
    private activeScanners;
    private maxScanners;
    private scannerModes;
    constructor(db: Firestore, messageRouter: MessageRouter, logger: Logger);
    private initialize;
    private setupMessageHandlers;
    private handleScannerAllocation;
    private adjustScannerCount;
    private createScanner;
    private deactivateScanner;
    private configureScanners;
    private executeScanningStrategy;
    private executeMinimalScan;
    private executeTargetedScan;
    private executeComprehensiveScan;
    private executeDeepDiveScan;
    private executeContinuousScan;
    private handleTargetedScan;
    private getAvailableScanner;
    private createTemporaryScanner;
    private aggregateAndReportResults;
    private mergeFindings;
    private aggregateMetrics;
    private consolidateRecommendations;
    private calculateOverallHealth;
    getStatus(): Promise<{
        activeScanners: number;
        scannerStatus: {
            id: string;
            mode: string | undefined;
            isBusy: boolean;
        }[];
    }>;
}
