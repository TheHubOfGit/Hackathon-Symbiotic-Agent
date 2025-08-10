import { Firestore } from '@google-cloud/firestore';
import { Logger } from '../utils/logger';
export declare class RealtimeChat {
    private db;
    private logger;
    private io;
    private connections;
    private rooms;
    constructor(db: Firestore, logger: Logger);
    initialize(server: any): void;
    private setupSocketHandlers;
    private handleConnection;
    private handleMessage;
    private handleTyping;
    private handleJoinRoom;
    private handleLeaveRoom;
    private handleDisconnect;
    private joinRoom;
    private leaveRoom;
    sendToUser(userId: string, event: string, data: any): void;
    sendToRoom(room: string, event: string, data: any): void;
    broadcastToAll(event: string, data: any): void;
    private getUserName;
    getRoomMembers(room: string): string[];
    getActiveConnections(): number;
}
