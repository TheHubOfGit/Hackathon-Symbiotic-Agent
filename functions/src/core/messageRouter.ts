// functions/src/core/messageRouter.ts
import { Firestore, Timestamp } from '@google-cloud/firestore';
import { EventEmitter } from 'events';
import { AgentMessage } from '../models/types';
import { Logger } from '../utils/logger';

export class MessageRouter extends EventEmitter {
    private messageQueue: Map<string, AgentMessage[]> = new Map();
    private routingTable: Map<string, Set<string>> = new Map();
    private messageHistory: AgentMessage[] = [];
    private maxHistorySize: number = 1000;

    constructor(
        private db: Firestore,
        private logger: Logger
    ) {
        super();
        this.setMaxListeners(100); // Support many agents
    }

    async initialize() {
        this.logger.info('Initializing Message Router');
        this.setupRoutingTable();
    }

    private setupRoutingTable() {
        // Setup default routing rules
        this.routingTable.set('all_agents', new Set([
            'roadmap_orchestrator',
            'repository_scanner_manager',
            'progress_coordinator',
            'decision_engine',
            'code_extractor',
            'edit_coordinator',
            'communication_hub'
        ]));

        this.routingTable.set('all_user_compilers', new Set());
    }

    async sendMessage(message: AgentMessage) {
        // Add correlation ID if not present
        if (!message.correlationId) {
            message.correlationId = this.generateCorrelationId();
        }

        // Log message
        this.logger.debug(`Routing message: ${message.type} from ${message.source} to ${message.target}`);

        // Store in history
        this.addToHistory(message);

        // Store in database for persistence
        await this.persistMessage(message);

        // Route based on target
        if (message.target === 'all_agents') {
            this.broadcastToAll(message);
        } else if (message.target === 'all_user_compilers') {
            this.broadcastToUserCompilers(message);
        } else if (message.target.startsWith('user_compiler_')) {
            this.emit(message.type, message);
        } else {
            // Direct routing
            this.emit(message.type, message);
        }

        // Also emit on generic channel for monitoring
        this.emit('message', message);
    }

    private broadcastToAll(message: AgentMessage) {
        const agents = this.routingTable.get('all_agents');
        if (agents) {
            for (const agent of agents) {
                const broadcastMessage = { ...message, target: agent };
                this.emit(message.type, broadcastMessage);
            }
        }
    }

    private broadcastToUserCompilers(message: AgentMessage) {
        // Get all user compiler agent IDs
        const compilers = Array.from(this.routingTable.keys())
            .filter(key => key.startsWith('user_compiler_'));

        for (const compiler of compilers) {
            const broadcastMessage = { ...message, target: compiler };
            this.emit(message.type, broadcastMessage);
        }
    }

    registerAgent(agentId: string, messageTypes: string[]) {
        this.logger.info(`Registering agent ${agentId} for message types:`, messageTypes);

        for (const type of messageTypes) {
            if (!this.routingTable.has(type)) {
                this.routingTable.set(type, new Set());
            }
            this.routingTable.get(type)!.add(agentId);
        }

        // Add to all_user_compilers if it's a user compiler
        if (agentId.startsWith('user_compiler_')) {
            this.routingTable.get('all_user_compilers')!.add(agentId);
        }
    }

    unregisterAgent(agentId: string) {
        this.logger.info(`Unregistering agent ${agentId}`);

        for (const [type, agents] of this.routingTable) {
            agents.delete(agentId);
        }
    }

    async getMessageHistory(filter?: any): Promise<AgentMessage[]> {
        if (!filter) {
            return this.messageHistory;
        }

        return this.messageHistory.filter(msg => {
            if (filter.type && msg.type !== filter.type) return false;
            if (filter.source && msg.source !== filter.source) return false;
            if (filter.target && msg.target !== filter.target) return false;
            if (filter.since && msg.timestamp < filter.since) return false;
            return true;
        });
    }

    private async persistMessage(message: AgentMessage) {
        try {
            await this.db.collection('agent_messages').add({
                ...message,
                persistedAt: Timestamp.now()
            });
        } catch (error) {
            this.logger.error('Failed to persist message:', error);
        }
    }

    private addToHistory(message: AgentMessage) {
        this.messageHistory.push(message);

        // Trim history if too large
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
        }
    }

    private generateCorrelationId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getRoutingTable() {
        const table: any = {};
        for (const [key, value] of this.routingTable) {
            table[key] = Array.from(value);
        }
        return table;
    }

    async getMetrics() {
        const last5Minutes = Date.now() - 300000;
        const recentMessages = this.messageHistory.filter(m => m.timestamp > last5Minutes);

        const metrics = {
            totalMessages: this.messageHistory.length,
            recentMessages: recentMessages.length,
            messageTypes: {} as any,
            averageLatency: 0,
            routingTableSize: this.routingTable.size
        };

        // Count message types
        for (const msg of recentMessages) {
            metrics.messageTypes[msg.type] = (metrics.messageTypes[msg.type] || 0) + 1;
        }

        return metrics;
    }
}
