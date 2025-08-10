// functions/src/core/tokenManager.ts
import { Firestore, Timestamp } from '@google-cloud/firestore';
import { Logger } from '../utils/logger';

interface TokenUsage {
    agentId: string;
    model: string;
    tokensUsed: number;
    cost: number;
    timestamp: number;
}

export class TokenManager {
    private tokenUsage: Map<string, TokenUsage[]> = new Map();
    private costRates = {
        'gemini-2.5-pro': 0.00125,
        'gemini-1.5-pro': 0.00125,
        'gemini-2.5-flash': 0.0001875,
        'claude-4-sonnet': 0.018,
        'claude-3-sonnet': 0.003,
        'o4-mini': 0.015,
        'gpt-5-nano': 0.0001,
        'gpt-5-mini': 0.0003,
        'gpt-5': 0.03
    };
    private trackingInterval: NodeJS.Timeout | null = null;

    constructor(
        private db: Firestore,
        private logger: Logger
    ) { }

    async initialize() {
        this.logger.info('Initializing Token Manager');
        await this.loadTokenHistory();
    }

    startTracking(agents: Map<string, any>) {
        // Track token usage every 5 minutes
        this.trackingInterval = setInterval(async () => {
            await this.collectTokenUsage(agents);
        }, 300000);
    }

    stopTracking() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
    }

    recordUsage(agentId: string, model: string, tokens: number) {
        if (!this.tokenUsage.has(agentId)) {
            this.tokenUsage.set(agentId, []);
        }

        const cost = this.calculateCost(model, tokens);

        const usage: TokenUsage = {
            agentId,
            model,
            tokensUsed: tokens,
            cost,
            timestamp: Date.now()
        };

        this.tokenUsage.get(agentId)!.push(usage);

        // Log if usage is high
        if (cost > 0.1) {
            this.logger.warn(`High token usage for ${agentId}: ${tokens} tokens, $${cost.toFixed(4)}`);
        }
    }

    private calculateCost(model: string, tokens: number): number {
        const rate = this.costRates[model as keyof typeof this.costRates] || 0.001;
        return (tokens / 1000) * rate;
    }

    private async collectTokenUsage(agents: Map<string, any>) {
        for (const [agentId, agent] of agents) {
            if (agent.getTokenUsage) {
                const usage = await agent.getTokenUsage();
                if (usage) {
                    this.recordUsage(agentId, usage.model, usage.tokens);
                }
            }
        }

        // Store usage in database
        await this.storeTokenUsage();
    }

    private async storeTokenUsage() {
        const batch = this.db.batch();

        for (const [agentId, usages] of this.tokenUsage) {
            for (const usage of usages) {
                const ref = this.db.collection('token_usage').doc();
                batch.set(ref, {
                    ...usage,
                    timestamp: Timestamp.now()
                });
            }
        }

        await batch.commit();

        // Clear local cache after storing
        this.tokenUsage.clear();
    }

    async getTokenUsage(since?: number): Promise<any> {
        const startTime = since || Date.now() - 3600000; // Last hour by default

        const usage = await this.db
            .collection('token_usage')
            .where('timestamp', '>', new Date(startTime))
            .get();

        const summary = {
            totalTokens: 0,
            totalCost: 0,
            byAgent: {} as any,
            byModel: {} as any,
            timeline: [] as any[]
        };

        for (const doc of usage.docs) {
            const data = doc.data();

            summary.totalTokens += data.tokensUsed;
            summary.totalCost += data.cost;

            // By agent
            if (!summary.byAgent[data.agentId]) {
                summary.byAgent[data.agentId] = { tokens: 0, cost: 0 };
            }
            summary.byAgent[data.agentId].tokens += data.tokensUsed;
            summary.byAgent[data.agentId].cost += data.cost;

            // By model
            if (!summary.byModel[data.model]) {
                summary.byModel[data.model] = { tokens: 0, cost: 0 };
            }
            summary.byModel[data.model].tokens += data.tokensUsed;
            summary.byModel[data.model].cost += data.cost;

            // Timeline
            summary.timeline.push({
                timestamp: data.timestamp,
                tokens: data.tokensUsed,
                cost: data.cost
            });
        }

        return summary;
    }

    async getProjectedCost(hours: number): Promise<number> {
        // Get average usage per hour
        const lastHour = await this.getTokenUsage(Date.now() - 3600000);
        const hourlyRate = lastHour.totalCost;

        return hourlyRate * hours;
    }

    private async loadTokenHistory() {
        // Load recent token usage for initialization
        const history = await this.db
            .collection('token_usage')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();

        for (const doc of history.docs) {
            const data = doc.data() as TokenUsage;

            if (!this.tokenUsage.has(data.agentId)) {
                this.tokenUsage.set(data.agentId, []);
            }

            this.tokenUsage.get(data.agentId)!.push(data);
        }
    }

    async checkBudgetAlerts(budgetLimit: number) {
        const currentUsage = await this.getTokenUsage();

        if (currentUsage.totalCost > budgetLimit * 0.8) {
            await this.db.collection('alerts').add({
                type: 'budget_warning',
                severity: 'warning',
                message: `Token usage at 80% of budget: $${currentUsage.totalCost.toFixed(2)} of $${budgetLimit}`,
                timestamp: Timestamp.now()
            });
        }

        if (currentUsage.totalCost > budgetLimit) {
            await this.db.collection('alerts').add({
                type: 'budget_exceeded',
                severity: 'critical',
                message: `Token budget exceeded: $${currentUsage.totalCost.toFixed(2)} (limit: $${budgetLimit})`,
                timestamp: Timestamp.now()
            });

            // Could implement throttling here
            return false; // Budget exceeded
        }

        return true; // Within budget
    }
}
