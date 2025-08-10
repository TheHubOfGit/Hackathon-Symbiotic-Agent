// functions/src/services/realtimeChat.ts
import { Firestore, Timestamp } from '@google-cloud/firestore';
import { Socket, Server as SocketServer } from 'socket.io';
import { Logger } from '../utils/logger';

export class RealtimeChat {
    private io: SocketServer | null = null;
    private connections: Map<string, Socket> = new Map();
    private rooms: Map<string, Set<string>> = new Map();

    constructor(
        private db: Firestore,
        private logger: Logger
    ) { }

    initialize(server: any) {
        this.io = new SocketServer(server, {
            cors: {
                origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
                methods: ['GET', 'POST']
            }
        });

        this.setupSocketHandlers();
        this.logger.info('Realtime chat service initialized');
    }

    private setupSocketHandlers() {
        if (!this.io) return;

        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }

    private handleConnection(socket: Socket) {
        const userId = socket.handshake.query.userId as string;
        const hackathonId = socket.handshake.query.hackathonId as string;

        if (!userId) {
            socket.disconnect();
            return;
        }

        this.logger.info(`User ${userId} connected`);
        this.connections.set(userId, socket);

        // Join hackathon room
        if (hackathonId) {
            this.joinRoom(userId, hackathonId);
            socket.join(hackathonId);
        }

        // Setup event handlers
        socket.on('message', (data) => this.handleMessage(userId, data));
        socket.on('typing', (data) => this.handleTyping(userId, data));
        socket.on('join_room', (room) => this.handleJoinRoom(userId, room));
        socket.on('leave_room', (room) => this.handleLeaveRoom(userId, room));
        socket.on('disconnect', () => this.handleDisconnect(userId));
    }

    private async handleMessage(userId: string, data: any) {
        const { message, room, metadata } = data;

        // Store message
        const messageDoc = {
            userId,
            message,
            room: room || 'general',
            metadata,
            timestamp: Timestamp.now()
        };

        await this.db.collection('chat_messages').add(messageDoc);

        // Broadcast to room
        if (room && this.io) {
            this.io.to(room).emit('message', {
                ...messageDoc,
                userName: await this.getUserName(userId)
            });
        }

        // Also emit to all connections if no specific room
        if (!room) {
            this.broadcastToAll('message', messageDoc);
        }
    }

    private handleTyping(userId: string, data: any) {
        const { room, isTyping } = data;

        if (room && this.io) {
            this.io.to(room).emit('typing', {
                userId,
                isTyping,
                timestamp: Date.now()
            });
        }
    }

    private handleJoinRoom(userId: string, room: string) {
        const socket = this.connections.get(userId);
        if (socket) {
            socket.join(room);
            this.joinRoom(userId, room);

            // Notify room members
            if (this.io) {
                this.io.to(room).emit('user_joined', {
                    userId,
                    room,
                    timestamp: Date.now()
                });
            }
        }
    }

    private handleLeaveRoom(userId: string, room: string) {
        const socket = this.connections.get(userId);
        if (socket) {
            socket.leave(room);
            this.leaveRoom(userId, room);

            // Notify room members
            if (this.io) {
                this.io.to(room).emit('user_left', {
                    userId,
                    room,
                    timestamp: Date.now()
                });
            }
        }
    }

    private handleDisconnect(userId: string) {
        this.logger.info(`User ${userId} disconnected`);

        // Remove from all rooms
        for (const [room, users] of this.rooms) {
            if (users.has(userId)) {
                users.delete(userId);

                // Notify room members
                if (this.io) {
                    this.io.to(room).emit('user_disconnected', {
                        userId,
                        timestamp: Date.now()
                    });
                }
            }
        }

        this.connections.delete(userId);
    }

    private joinRoom(userId: string, room: string) {
        if (!this.rooms.has(room)) {
            this.rooms.set(room, new Set());
        }
        this.rooms.get(room)!.add(userId);
    }

    private leaveRoom(userId: string, room: string) {
        const roomUsers = this.rooms.get(room);
        if (roomUsers) {
            roomUsers.delete(userId);
            if (roomUsers.size === 0) {
                this.rooms.delete(room);
            }
        }
    }

    sendToUser(userId: string, event: string, data: any) {
        const socket = this.connections.get(userId);
        if (socket) {
            socket.emit(event, data);
        }
    }

    sendToRoom(room: string, event: string, data: any) {
        if (this.io) {
            this.io.to(room).emit(event, data);
        }
    }

    broadcastToAll(event: string, data: any) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    private async getUserName(userId: string): Promise<string> {
        const user = await this.db.collection('users').doc(userId).get();
        return user.data()?.name || 'Unknown User';
    }

    getRoomMembers(room: string): string[] {
        return Array.from(this.rooms.get(room) || []);
    }

    getActiveConnections(): number {
        return this.connections.size;
    }
}
