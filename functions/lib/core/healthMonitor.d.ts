import { Firestore } from '@google-cloud/firestore';
import { Logger } from '../utils/logger';
export declare class HealthMonitor {
    private db;
    private logger;
    private agents;
    private healthMetrics;
    private monitoringInterval;
    private alertThresholds;
    constructor(db: Firestore, logger: Logger);
    initialize(): Promise<void>;
    startMonitoring(agents: Map<string, any>): void;
    stopMonitoring(): void;
    private performHealthCheck;
    private checkAgentHealth;
    private storeHealthMetrics;
    private checkAlerts;
    private sendAlert;
    private sendWarning;
    private attemptRecovery;
    getHealthReport(): Promise<any>;
    private loadHealthHistory;
}
