// functions/src/api/testEndpoint.ts
import * as functions from 'firebase-functions';

export const test = functions.https.onRequest(async (req, res) => {
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

    if (req.method === 'POST') {
        res.json({
            success: true,
            message: 'Test endpoint working!',
            user: {
                id: `test_user_${Date.now()}`,
                ...req.body,
                timestamp: Date.now()
            }
        });
    } else {
        res.json({
            success: true,
            message: 'Test endpoint is working',
            method: req.method,
            path: req.path
        });
    }
});
