// functions/src/api/testCors.ts
import * as functions from 'firebase-functions';

export const testCors = functions.https.onRequest(async (req, res) => {
    // Set CORS headers manually - FIRST THING!
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    console.log('testCors called:', req.method, req.path, req.query);

    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS request');
        res.status(204).end();
        return;
    }

    try {
        res.status(200).json({
            success: true,
            message: 'CORS test successful!',
            method: req.method,
            path: req.path,
            query: req.query,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in testCors:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
