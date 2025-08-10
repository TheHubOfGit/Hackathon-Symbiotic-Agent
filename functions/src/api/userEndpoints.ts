// functions/src/api/userEndpoints.ts
import cors from 'cors';
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { AgentManager } from '../core/agentManager';
import { ErrorHandler, ErrorSeverity } from '../core/errorHandler';
import { UserSchema } from '../models/schemas';
import { Logger } from '../utils/logger';

const corsHandler = cors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Lazy initialization to avoid Firebase issues during testing
function getDb() {
    return getFirestore();
}

function getLogger() {
    return new Logger('UserEndpoints');
}

function getErrorHandler() {
    const db = getDb();
    const logger = getLogger();
    return new ErrorHandler(db, logger);
}

let agentManager: AgentManager | null = null;

async function getAgentManager(): Promise<AgentManager> {
    if (!agentManager) {
        const db = getDb();
        agentManager = new AgentManager(db);
        await agentManager.initialize();
    }
    return agentManager;
}

export const users = functions.https.onRequest(async (req, res) => {
    // Set CORS headers manually
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    try {
        // Firebase function paths don't include the function name
        const path = req.path || req.url;
        console.log('Received request:', req.method, path, req.body);

        switch (req.method) {

            case 'POST':
                if (path === '/register' || path === '' || path === '/') {
                    await handleUserRegistration(req, res);
                } else if (path === '/depart') {
                    await handleUserDeparture(req, res);
                } else {
                    res.status(404).json({ error: 'Endpoint not found', path, method: req.method });
                }
                break;

            case 'GET':
                if (path === '' || path === '/') {
                    await handleGetUsers(req, res);
                } else if (path.startsWith('/')) {
                    // Remove leading slash for user ID
                    const userId = path.substring(1);
                    await handleGetUser(req, res, userId);
                } else {
                    res.status(404).json({ error: 'Endpoint not found', path, method: req.method });
                }
                break;

            case 'PUT':
                if (path.startsWith('/')) {
                    await handleUpdateUser(req, res, path.substring(1));
                } else {
                    res.status(404).json({ error: 'Endpoint not found' });
                }
                break;

            default:
                res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        const errorHandler = getErrorHandler();
        await errorHandler.handleError(
            error as Error,
            ErrorSeverity.HIGH,
            { operation: 'userEndpoint' }
        );
        res.status(500).json({ error: 'Internal server error' });
    }
});

async function handleUserRegistration(req: any, res: any) {
    const validation = UserSchema.validate(req.body);

    if (validation.error) {
        return res.status(400).json({
            error: 'Validation failed',
            details: validation.error.details
        });
    }

    const userData = validation.value;
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        // Add user to system
        const manager = await getAgentManager();
        await manager.addUser(userId, {
            ...userData,
            status: 'active',
            joinedAt: Date.now()
        });

        res.json({
            success: true,
            userId,
            message: 'User registered successfully'
        });
    } catch (error) {
        getLogger().error('Failed to register user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
}

async function handleUserDeparture(req: any, res: any) {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        const manager = await getAgentManager();
        await manager.removeUser(userId);

        res.json({
            success: true,
            message: 'User departure processed'
        });
    } catch (error) {
        getLogger().error('Failed to process user departure:', error);
        res.status(500).json({ error: 'Failed to process departure' });
    }
}

async function handleGetUsers(req: any, res: any) {
    try {
        const users = await getDb().collection('users').get();

        const userData = users.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            users: userData,
            total: userData.length
        });
    } catch (error) {
        getLogger().error('Failed to get users:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
}

async function handleGetUser(req: any, res: any, userId: string) {
    try {
        const user = await getDb().collection('users').doc(userId).get();

        if (!user.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                ...user.data()
            }
        });
    } catch (error) {
        getLogger().error('Failed to get user:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
}

async function handleUpdateUser(req: any, res: any, userId: string) {
    try {
        const updates = req.body;

        await getDb().collection('users').doc(userId).update({
            ...updates,
            lastUpdated: Date.now()
        });

        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        getLogger().error('Failed to update user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
}
