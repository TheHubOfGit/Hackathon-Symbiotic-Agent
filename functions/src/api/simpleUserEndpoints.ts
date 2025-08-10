// functions/src/api/simpleUserEndpoints.ts
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';

export const simpleUsers = functions.https.onRequest(async (req, res) => {
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
        const db = getFirestore();
        const path = req.path || req.url;

        switch (req.method) {
            case 'POST':
                if (path === '/register' || path === '' || path === '/') {
                    await handleUserRegistration(req, res, db);
                } else {
                    res.status(404).json({ error: 'Endpoint not found' });
                }
                break;

            case 'GET':
                if (path === '' || path === '/') {
                    await handleGetUsers(req, res, db);
                } else if (path.startsWith('/')) {
                    const userId = path.substring(1);
                    await handleGetUser(req, res, db, userId);
                } else {
                    res.status(404).json({ error: 'Endpoint not found' });
                }
                break;

            default:
                res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error in simpleUsers function:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

async function handleUserRegistration(req: any, res: any, db: any) {
    try {
        const userData = req.body;
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Simple validation
        if (!userData.name || !userData.email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const userDoc = {
            ...userData,
            id: userId,
            status: 'active',
            joinedAt: Date.now(),
            createdAt: Date.now()
        };

        // Store in Firestore
        await db.collection('users').doc(userId).set(userDoc);

        res.json({
            success: true,
            user: userDoc,
            message: 'User registered successfully'
        });
    } catch (error) {
        console.error('Failed to register user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
}

async function handleGetUsers(req: any, res: any, db: any) {
    try {
        const users = await db.collection('users').get();
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
        console.error('Failed to get users:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
}

async function handleGetUser(req: any, res: any, db: any, userId: string) {
    try {
        const user = await db.collection('users').doc(userId).get();

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
        console.error('Failed to get user:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
}
