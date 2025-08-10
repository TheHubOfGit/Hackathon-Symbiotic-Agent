// functions/src/api/scannerEndpoints.ts
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { AgentManager } from '../core/agentManager';

// Global AgentManager instance
let globalAgentManager: AgentManager | null = null;

async function getAgentManager(): Promise<AgentManager> {
    if (!globalAgentManager) {
        const db = getFirestore();
        console.log('🚀 SCANNER API: Creating new AgentManager instance');
        globalAgentManager = new AgentManager(db);
        await globalAgentManager.initialize();
        console.log('✅ SCANNER API: AgentManager initialized');
    }
    return globalAgentManager;
}

// Scanner API endpoints with proper CORS
export const scannerApi = functions.https.onRequest(async (req, res) => {
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

    const timestamp = new Date().toISOString();
    const path = req.path || req.url;
    const method = req.method;

    console.log(`🚀 [${timestamp}] SCANNER API: ${method} ${path}`);
    console.log(`📋 [${timestamp}] SCANNER API: Request body:`, JSON.stringify(req.body, null, 2));

    try {
        // Route based on path
        if (path === '/status' || path === '/' && method === 'GET') {
            // Get scanner status
            console.log(`🔍 [${timestamp}] Getting scanner status...`);

            const agentManager = await getAgentManager();

            console.log(`📊 [${timestamp}] Getting AgentManager status...`);
            const status = await agentManager.getStatus();

            console.log(`🔍 [${timestamp}] Getting RepositoryScannerManager...`);
            const scannerManager = agentManager.getAgent('repository_scanner_manager');

            let scannerResults = null;
            if (scannerManager && scannerManager.getStatus) {
                console.log(`📊 [${timestamp}] Getting scanner manager status...`);
                scannerResults = await scannerManager.getStatus();
            }

            const result = {
                timestamp: Date.now(),
                agentManagerStatus: status,
                scannerManager: scannerResults,
                scannerDetails: scannerManager ? {
                    type: scannerManager.constructor.name,
                    available: true,
                    methods: Object.getOwnPropertyNames(Object.getPrototypeOf(scannerManager))
                } : {
                    type: 'not_found',
                    available: false
                }
            };

            console.log(`✅ [${timestamp}] Scanner status retrieved:`, {
                agentManagerInitialized: status.initialized,
                totalAgents: Object.keys(status.agents).length,
                scannerManagerFound: !!scannerManager,
                resultSize: JSON.stringify(result).length + ' bytes'
            });

            res.json(result);

        } else if (path === '/scan' && method === 'POST') {
            // Trigger repository scan
            const { projectId, scanType = 'medium', repoUrl, githubToken } = req.body;

            if (!projectId) {
                res.status(400).json({ error: 'Project ID is required' });
                return;
            }

            console.log(`🚀 [${timestamp}] Triggering repository scan...`, {
                projectId,
                scanType,
                repoUrl: repoUrl || 'not provided',
                hasGithubToken: !!githubToken
            });

            const agentManager = await getAgentManager();

            console.log(`🔍 [${timestamp}] Getting RepositoryScannerManager...`);
            const scannerManager = agentManager.getAgent('repository_scanner_manager');

            if (!scannerManager) {
                console.error(`❌ [${timestamp}] RepositoryScannerManager not found!`);
                res.status(500).json({ error: 'Scanner manager not available' });
                return;
            }

            // Trigger scan through scanner manager
            const scanOptions = {
                projectId,
                depth: scanType,
                analyzeDependencies: true,
                detectPatterns: scanType === 'deep' || scanType === 'maximum',
                repoUrl,
                githubToken
            };

            let scanResult = null;

            // Try to perform scan if the scanner manager has scan methods
            if (scannerManager.performScan) {
                console.log(`📊 [${timestamp}] Performing scan with options:`, scanOptions);
                scanResult = await scannerManager.performScan(scanOptions);
            } else if (scannerManager.handleTargetedScan) {
                console.log(`📊 [${timestamp}] Performing targeted scan...`);
                scanResult = await scannerManager.handleTargetedScan(scanOptions);
            } else {
                console.log(`⚠️ [${timestamp}] Scanner manager has no scan methods, checking available methods...`);
                console.log(`🔍 [${timestamp}] Scanner manager methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(scannerManager)));
            }

            const result = {
                timestamp: Date.now(),
                projectId,
                scanType,
                scanTriggered: true,
                scanResult: scanResult || {
                    message: "Scan initiated - scanner manager available but no direct scan result",
                    scannerManagerType: scannerManager.constructor.name,
                    availableMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(scannerManager))
                }
            };

            console.log(`✅ [${timestamp}] Repository scan completed:`, {
                projectId,
                scanType,
                scanTriggered: true,
                hasResult: !!scanResult
            });

            res.json(result);

        } else if (path.startsWith('/results/') || (path === '/results' && method === 'GET')) {
            // Get scan results for a project
            let projectId = '';

            if (path.startsWith('/results/')) {
                const pathProjectId = path.split('/results/')[1];
                if (pathProjectId) {
                    projectId = pathProjectId;
                }
            } else if (req.query.projectId) {
                projectId = req.query.projectId as string;
            } else if (req.body.projectId) {
                projectId = req.body.projectId;
            }

            if (!projectId) {
                res.status(400).json({ error: 'Project ID is required' });
                return;
            }

            console.log(`🔍 [${timestamp}] Querying scan results for project:`, projectId);

            const db = getFirestore();

            // Query scan results from database
            const scanResultsSnapshot = await db
                .collection('scan_results')
                .where('projectId', '==', projectId)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            const scanResults = scanResultsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log(`📊 [${timestamp}] Found ${scanResults.length} scan results for project ${projectId}`);

            const result = {
                timestamp: Date.now(),
                projectId,
                scanResults,
                totalResults: scanResults.length
            };

            console.log(`✅ [${timestamp}] Scan results retrieved:`, {
                projectId,
                resultsFound: scanResults.length
            });

            res.json(result);

        } else {
            // Unknown endpoint
            console.log(`❌ [${timestamp}] Unknown scanner API endpoint: ${method} ${path}`);
            res.status(404).json({
                error: 'Unknown endpoint',
                availableEndpoints: [
                    'GET /status - Get scanner status',
                    'POST /scan - Trigger repository scan',
                    'GET /results/{projectId} - Get scan results'
                ]
            });
        }

    } catch (error) {
        console.error(`💥 [${timestamp}] Scanner API error:`, {
            error: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : 'No stack',
            path,
            method
        });

        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : String(error),
            timestamp: Date.now()
        });
    }
});
