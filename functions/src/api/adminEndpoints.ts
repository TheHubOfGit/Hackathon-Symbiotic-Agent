// functions/src/api/adminEndpoints.ts
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { AgentManager } from '../core/agentManager';
import { HealthMonitor } from '../core/healthMonitor';
import { TokenManager } from '../core/tokenManager';
import { Logger } from '../utils/logger';

// Lazy initialization to avoid Firebase issues during testing
function getDb() {
    return getFirestore();
}

function getLogger() {
    return new Logger('AdminEndpoints');
}

export const admin = functions.https.onRequest(async (req, res) => {
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

    // Check admin authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const token = authHeader.substring(7);
    if (token !== process.env.ADMIN_TOKEN) {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }

    try {
        const path = req.path.replace('/admin', '');

        switch (path) {
            case '/status':
                await handleGetStatus(req, res);
                break;
            case '/health':
                await handleGetHealth(req, res);
                break;
            case '/tokens':
                await handleGetTokenUsage(req, res);
                break;
            case '/agents':
                await handleAgentControl(req, res);
                break;
            case '/config':
                await handleConfig(req, res);
                break;
            case '/shutdown':
                await handleShutdown(req, res);
                break;
            default:
                res.status(404).json({ error: 'Endpoint not found' });
        }
    } catch (error) {
        getLogger().error('Admin endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

async function handleGetStatus(req: any, res: any) {
    const agentManager = new AgentManager(getDb());
    const status = await agentManager.getStatus();

    res.json({
        success: true,
        status,
        timestamp: Date.now()
    });
}

async function handleGetHealth(req: any, res: any) {
    const healthMonitor = new HealthMonitor(getDb(), getLogger());
    const health = await healthMonitor.getHealthReport();

    res.json({
        success: true,
        health,
        timestamp: Date.now()
    });
}

async function handleGetTokenUsage(req: any, res: any) {
    const tokenManager = new TokenManager(getDb(), getLogger());
    const since = req.query.since ? parseInt(req.query.since) : undefined;
    const usage = await tokenManager.getTokenUsage(since);

    res.json({
        success: true,
        usage,
        projectedCost: await tokenManager.getProjectedCost(8),
        timestamp: Date.now()
    });
}

async function handleAgentControl(req: any, res: any) {
    const { action, agentId } = req.body;

    if (!action || !agentId) {
        return res.status(400).json({ error: 'action and agentId required' });
    }

    const agentManager = new AgentManager(getDb());

    switch (action) {
        case 'restart':
            // Restart agent logic
            res.json({ success: true, message: `Agent ${agentId} restart initiated` });
            break;
        case 'pause':
            // Pause agent logic
            res.json({ success: true, message: `Agent ${agentId} paused` });
            break;
        case 'resume':
            // Resume agent logic
            res.json({ success: true, message: `Agent ${agentId} resumed` });
            break;
        default:
            res.status(400).json({ error: 'Invalid action' });
    }
}

async function handleConfig(req: any, res: any) {
    if (req.method === 'GET') {
        const config = await getDb().collection('config').doc('current').get();
        res.json({
            success: true,
            config: config.data()
        });
    } else if (req.method === 'PUT') {
        const updates = req.body;
        await getDb().collection('config').doc('current').update(updates);
        res.json({
            success: true,
            message: 'Configuration updated'
        });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

async function handleShutdown(req: any, res: any) {
    const agentManager = new AgentManager(getDb());
    await agentManager.shutdown();

    res.json({
        success: true,
        message: 'System shutdown initiated'
    });
}
