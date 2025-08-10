import { Firestore } from '@google-cloud/firestore';
import { EventEmitter } from 'events';
import { AgentMessage } from '../models/types';
import { Logger } from '../utils/logger';
export declare class MessageRouter extends EventEmitter {
    private db;
    private logger;
    private messageQueue;
    private routingTable;
    private messageHistory;
    private maxHistorySize;
    constructor(db: Firestore, logger: Logger);
    initialize(): Promise<void>;
    private setupRoutingTable;
    sendMessage(message: AgentMessage): Promise<void>;
    private broadcastToAll;
    private broadcastToUserCompilers;
    registerAgent(agentId: string, messageTypes: string[]): void;
    unregisterAgent(agentId: string): void;
    getMessageHistory(filter?: any): Promise<AgentMessage[]>;
    private persistMessage;
    private addToHistory;
    private generateCorrelationId;
    getRoutingTable(): any;
    getMetrics(): Promise<{
        totalMessages: number;
        recentMessages: number;
        messageTypes: any;
        averageLatency: number;
        routingTableSize: number;
    }>;
}
