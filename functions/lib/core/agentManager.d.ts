import { Firestore } from '@google-cloud/firestore';
export declare class AgentManager {
    private db;
    private agents;
    private messageRouter;
    private healthMonitor;
    private tokenManager;
    private logger;
    private initialized;
    constructor(db: Firestore);
    initialize(): Promise<void>;
    private initializeAgents;
    private initializeUserCompilers;
    addUser(userId: string, userData: any): Promise<void>;
    removeUser(userId: string): Promise<void>;
    getAgent(agentId: string): any;
    getStatus(): Promise<any>;
    shutdown(): Promise<void>;
}
