// functions/src/core/errorHandler.ts
import { Firestore, Timestamp } from '@google-cloud/firestore';
import { Logger } from '../utils/logger';

export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export interface ErrorContext {
    agentId?: string;
    userId?: string;
    operation?: string;
    metadata?: any;
}

export class ErrorHandler {
    private errorCount: Map<string, number> = new Map();
    private errorPatterns: Map<string, number> = new Map();

    constructor(
        private db: Firestore,
        private logger: Logger
    ) { }

    async handleError(
        error: Error,
        severity: ErrorSeverity,
        context?: ErrorContext
    ): Promise<void> {
        this.logger.error(`Error occurred: ${error.message}`, { error, context });

        // Track error patterns
        this.trackErrorPattern(error);

        // Store error in database
        await this.storeError(error, severity, context);

        // Handle based on severity
        switch (severity) {
            case ErrorSeverity.CRITICAL:
                await this.handleCriticalError(error, context);
                break;
            case ErrorSeverity.HIGH:
                await this.handleHighError(error, context);
                break;
            case ErrorSeverity.MEDIUM:
                await this.handleMediumError(error, context);
                break;
            case ErrorSeverity.LOW:
                // Just log and store
                break;
        }

        // Check for error storm
        await this.checkErrorStorm();
    }

    private async handleCriticalError(error: Error, context?: ErrorContext) {
        // Send immediate alert
        await this.sendAlert({
            type: 'critical_error',
            severity: 'critical',
            message: error.message,
            stack: error.stack,
            context,
            timestamp: Date.now()
        });

        // Attempt recovery if agent error
        if (context?.agentId) {
            await this.attemptAgentRecovery(context.agentId);
        }
    }

    private async handleHighError(error: Error, context?: ErrorContext) {
        // Send alert after 3 occurrences
        const errorKey = this.getErrorKey(error);
        const count = (this.errorCount.get(errorKey) || 0) + 1;
        this.errorCount.set(errorKey, count);

        if (count >= 3) {
            await this.sendAlert({
                type: 'recurring_error',
                severity: 'high',
                message: `Error occurred ${count} times: ${error.message}`,
                context,
                timestamp: Date.now()
            });
        }
    }

    private async handleMediumError(error: Error, context?: ErrorContext) {
        // Track and log
        const errorKey = this.getErrorKey(error);
        const count = (this.errorCount.get(errorKey) || 0) + 1;
        this.errorCount.set(errorKey, count);
    }

    private trackErrorPattern(error: Error) {
        const pattern = this.extractErrorPattern(error);
        const count = (this.errorPatterns.get(pattern) || 0) + 1;
        this.errorPatterns.set(pattern, count);
    }

    private extractErrorPattern(error: Error): string {
        // Extract pattern from error message
        return error.message
            .replace(/\d+/g, 'N')  // Replace numbers
            .replace(/['"]\w+['"]/g, 'STR')  // Replace quoted strings
            .substring(0, 100);
    }

    private getErrorKey(error: Error): string {
        return `${error.name}_${this.extractErrorPattern(error)}`;
    }

    private async storeError(
        error: Error,
        severity: ErrorSeverity,
        context?: ErrorContext
    ) {
        await this.db.collection('errors').add({
            name: error.name,
            message: error.message,
            stack: error.stack,
            severity,
            context,
            timestamp: Timestamp.now()
        });
    }

    private async sendAlert(alert: any) {
        await this.db.collection('alerts').add({
            ...alert,
            timestamp: Timestamp.now()
        });

        // Could also send to external monitoring service
        this.logger.error('ALERT:', alert);
    }

    private async attemptAgentRecovery(agentId: string) {
        this.logger.info(`Attempting recovery for agent ${agentId}`);

        // Store recovery attempt
        await this.db.collection('recovery_attempts').add({
            agentId,
            reason: 'critical_error',
            timestamp: Timestamp.now()
        });

        // Recovery logic would be implemented by AgentManager
    }

    private async checkErrorStorm() {
        const recentErrors = Array.from(this.errorCount.values())
            .reduce((sum, count) => sum + count, 0);

        if (recentErrors > 50) {
            await this.sendAlert({
                type: 'error_storm',
                severity: 'critical',
                message: `Error storm detected: ${recentErrors} errors in recent period`,
                timestamp: Date.now()
            });

            // Clear counts to reset
            this.errorCount.clear();
        }
    }

    async getErrorReport(since?: number): Promise<any> {
        const startTime = since || Date.now() - 3600000;

        const errors = await this.db
            .collection('errors')
            .where('timestamp', '>', new Date(startTime))
            .orderBy('timestamp', 'desc')
            .get();

        const report = {
            totalErrors: errors.size,
            bySeverity: {} as any,
            byAgent: {} as any,
            patterns: Array.from(this.errorPatterns.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([pattern, count]) => ({ pattern, count })),
            recentErrors: errors.docs.slice(0, 10).map(doc => doc.data())
        };

        for (const doc of errors.docs) {
            const data = doc.data();

            // By severity
            report.bySeverity[data.severity] = (report.bySeverity[data.severity] || 0) + 1;

            // By agent
            if (data.context?.agentId) {
                report.byAgent[data.context.agentId] =
                    (report.byAgent[data.context.agentId] || 0) + 1;
            }
        }

        return report;
    }

    clearErrorCounts() {
        this.errorCount.clear();
        this.errorPatterns.clear();
    }
}
