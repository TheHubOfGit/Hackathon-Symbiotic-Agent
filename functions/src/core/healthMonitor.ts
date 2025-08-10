// functions/src/core/healthMonitor.ts
import { Firestore, Timestamp } from '@google-cloud/firestore';
import { Logger } from '../utils/logger';

interface HealthMetrics {
    agentId: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    cpu: number;
    memory: number;
    responseTime: number;
    errorRate: number;
    lastCheck: number;
}

export class HealthMonitor {
    private agents: Map<string, any> = new Map();
    private healthMetrics: Map<string, HealthMetrics> = new Map();
    private monitoringInterval: NodeJS.Timeout | null = null;
    private alertThresholds = {
        cpu: 80,
        memory: 85,
        responseTime: 5000,
        errorRate: 0.1
    };

    constructor(
        private db: Firestore,
        private logger: Logger
    ) { }

    async initialize() {
        this.logger.info('Initializing Health Monitor');
        await this.loadHealthHistory();
    }

    startMonitoring(agents: Map<string, any>) {
        this.agents = agents;

        // Check health every 30 seconds
        this.monitoringInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, 30000);

        // Initial check
        this.performHealthCheck();
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    private async performHealthCheck() {
        const checks: Promise<void>[] = [];

        for (const [agentId, agent] of this.agents) {
            checks.push(this.checkAgentHealth(agentId, agent));
        }

        await Promise.all(checks);

        // Store metrics
        await this.storeHealthMetrics();

        // Check for alerts
        await this.checkAlerts();
    }

    private async checkAgentHealth(agentId: string, agent: any) {
        const startTime = Date.now();
        const metrics: HealthMetrics = {
            agentId,
            status: 'healthy',
            cpu: 0,
            memory: 0,
            responseTime: 0,
            errorRate: 0,
            lastCheck: Date.now()
        };

        try {
            // Check if agent has health check method
            if (agent.healthCheck) {
                const health = await agent.healthCheck();
                metrics.cpu = health.cpu || 0;
                metrics.memory = health.memory || 0;
                metrics.errorRate = health.errorRate || 0;
            }

            // Measure response time
            metrics.responseTime = Date.now() - startTime;

            // Determine status
            if (metrics.cpu > this.alertThresholds.cpu ||
                metrics.memory > this.alertThresholds.memory ||
                metrics.responseTime > this.alertThresholds.responseTime ||
                metrics.errorRate > this.alertThresholds.errorRate) {
                metrics.status = 'degraded';
            }

            if (metrics.cpu > 95 || metrics.memory > 95 || metrics.errorRate > 0.5) {
                metrics.status = 'unhealthy';
            }

        } catch (error) {
            this.logger.error(`Health check failed for ${agentId}:`, error);
            metrics.status = 'unhealthy';
            metrics.errorRate = 1;
        }

        this.healthMetrics.set(agentId, metrics);
    }

    private async storeHealthMetrics() {
        const batch = this.db.batch();

        for (const [agentId, metrics] of this.healthMetrics) {
            const ref = this.db.collection('health_metrics').doc();
            batch.set(ref, {
                ...metrics,
                timestamp: Timestamp.now()
            });
        }

        await batch.commit();
    }

    private async checkAlerts() {
        for (const [agentId, metrics] of this.healthMetrics) {
            if (metrics.status === 'unhealthy') {
                await this.sendAlert(agentId, metrics);
            } else if (metrics.status === 'degraded') {
                await this.sendWarning(agentId, metrics);
            }
        }
    }

    private async sendAlert(agentId: string, metrics: HealthMetrics) {
        this.logger.error(`ALERT: Agent ${agentId} is unhealthy`, metrics);

        await this.db.collection('alerts').add({
            type: 'health_alert',
            severity: 'critical',
            agentId,
            metrics,
            timestamp: Timestamp.now()
        });

        // Attempt recovery
        await this.attemptRecovery(agentId);
    }

    private async sendWarning(agentId: string, metrics: HealthMetrics) {
        this.logger.warn(`WARNING: Agent ${agentId} is degraded`, metrics);

        await this.db.collection('alerts').add({
            type: 'health_warning',
            severity: 'warning',
            agentId,
            metrics,
            timestamp: Timestamp.now()
        });
    }

    private async attemptRecovery(agentId: string) {
        const agent = this.agents.get(agentId);

        if (agent && agent.restart) {
            this.logger.info(`Attempting to restart agent ${agentId}`);
            try {
                await agent.restart();
                this.logger.info(`Successfully restarted agent ${agentId}`);
            } catch (error) {
                this.logger.error(`Failed to restart agent ${agentId}:`, error);
            }
        }
    }

    async getHealthReport(): Promise<any> {
        const report = {
            timestamp: Date.now(),
            agents: {} as any,
            overall: 'healthy' as string,
            alerts: [] as any[]
        };

        let unhealthyCount = 0;
        let degradedCount = 0;

        for (const [agentId, metrics] of this.healthMetrics) {
            report.agents[agentId] = metrics;

            if (metrics.status === 'unhealthy') unhealthyCount++;
            if (metrics.status === 'degraded') degradedCount++;
        }

        // Determine overall status
        if (unhealthyCount > 0) {
            report.overall = 'critical';
        } else if (degradedCount > 2) {
            report.overall = 'degraded';
        }

        // Get recent alerts
        const recentAlerts = await this.db
            .collection('alerts')
            .where('timestamp', '>', new Date(Date.now() - 3600000))
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        report.alerts = recentAlerts.docs.map(doc => doc.data());

        return report;
    }

    private async loadHealthHistory() {
        // Load last known health state
        const history = await this.db
            .collection('health_metrics')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();

        // Group by agent and get latest
        const latestByAgent = new Map();

        for (const doc of history.docs) {
            const data = doc.data();
            if (!latestByAgent.has(data.agentId)) {
                latestByAgent.set(data.agentId, data);
            }
        }

        // Initialize metrics with history
        for (const [agentId, metrics] of latestByAgent) {
            this.healthMetrics.set(agentId, metrics as HealthMetrics);
        }
    }
}
