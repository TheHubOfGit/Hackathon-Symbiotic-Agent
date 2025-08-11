// dashboard/src/utils/firebaseFunctions.ts
// Firebase Callable Functions client using proper Firebase SDK

import { getApps, initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Initialize Firebase app if not already initialized
const firebaseConfig = {
    projectId: 'hackathon-agent-ce35f'
};

let app;
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

const functions = getFunctions(app);

const FIREBASE_PROJECT_ID = 'hackathon-agent-ce35f';
const REGION = 'us-central1';
const BASE_URL = `https://${REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`;

// Helper function to call Firebase Callable Functions using the proper SDK
async function callCallableFunction(functionName: string, data: any = {}) {
    const timestamp = new Date().toISOString();

    console.log(`🚀 [${timestamp}] STARTING CALLABLE FUNCTION:`, {
        function: functionName,
        payload: JSON.stringify(data, null, 2),
        payloadSize: JSON.stringify(data).length + ' bytes'
    });

    try {
        const startTime = performance.now();

        const callableFunction = httpsCallable(functions, functionName);
        const result = await callableFunction(data);

        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        console.log(`✅ [${timestamp}] CALLABLE FUNCTION SUCCESS:`, {
            function: functionName,
            duration: duration + 'ms',
            resultType: typeof result.data,
            resultKeys: result.data && typeof result.data === 'object' ? Object.keys(result.data) : 'N/A',
            resultSize: JSON.stringify(result.data).length + ' bytes'
        });

        return result.data;

    } catch (error) {
        console.error(`💥 [${timestamp}] CALLABLE FUNCTION EXCEPTION:`, {
            function: functionName,
            error: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : 'No stack',
            errorCode: (error as any)?.code,
            errorDetails: (error as any)?.details
        });
        throw error;
    }
}

// Wrapper functions for easier use
export const firebaseFunctions = {
    // Chat functions
    async getProject(userId: string) {
        console.log('🎯 FRONTEND: Calling getProject with userId:', userId);
        return await callCallableFunction('getProject', { userId });
    },

    async getChatHistory(userId: string, projectId?: string, limit = 50, offset = 0) {
        console.log('🎯 FRONTEND: Calling getChatHistory with:', { userId, projectId, limit, offset });
        return await callCallableFunction('getChatHistory', { userId, projectId, limit, offset });
    },

    async createProject(userId: string, projectData: any, githubRepo?: string) {
        console.log('🎯 FRONTEND: Calling createProject with:', { userId, projectData, githubRepo });
        return await callCallableFunction('createProject', { userId, projectData, githubRepo });
    },

    async sendMessage(userId: string, message: string, messageContext?: any) {
        console.log('🎯 FRONTEND: Calling sendMessage with:', { userId, message, messageContext });
        return await callCallableFunction('sendMessage', { userId, message, messageContext });
    },

    async getRoadmap(projectId: string) {
        console.log('🎯 FRONTEND: Calling getRoadmap with projectId:', projectId);
        const result = await callCallableFunction('getRoadmap', { projectId });
        console.log('🎯 FRONTEND: getRoadmap result received:', {
            phases: result?.phases?.length || 0,
            teamMembers: result?.teamMembers?.length || 0,
            lastUpdated: result?.lastUpdated,
            aiRecommendations: result?.aiRecommendations?.length || 0
        });
        return result;
    },

    async getAllProjects() {
        console.log('🎯 FRONTEND: Calling getAllProjects via Firebase SDK');
        return await callCallableFunction('getAllProjects', {});
    },

    // User functions
    async registerUser(userData: any) {
        console.log('🎯 FRONTEND: Calling registerUser with userData:', userData);
        return await callCallableFunction('registerUser', userData);
    },

    async loginUser(email: string, password: string) {
        console.log('🎯 FRONTEND: Calling loginUser with email:', email);
        return await callCallableFunction('loginUser', { email, password });
    },

    async getUsers() {
        console.log('🎯 FRONTEND: Calling getUsers');
        return await callCallableFunction('getUsers', {});
    },

    async getUser(userId: string) {
        console.log('🎯 FRONTEND: Calling getUser with userId:', userId);
        return await callCallableFunction('getUser', { userId });
    },

    async updateUser(userId: string, updates: any) {
        console.log('🎯 FRONTEND: Calling updateUser with:', { userId, updates });
        return await callCallableFunction('updateUser', { userId, updates });
    },

    // GitHub functions
    async verifyGitHub(githubToken: string) {
        console.log('🎯 FRONTEND: Calling verifyGitHub with token length:', githubToken?.length || 0);
        return await callCallableFunction('verifyGitHub', { githubToken });
    },

    async connectGitHub(userId: string, repoUrl: string, githubToken?: string) {
        console.log('🎯 FRONTEND: Calling connectGitHub with:', { userId, repoUrl, tokenLength: githubToken?.length || 0 });
        return await callCallableFunction('connectGitHub', { userId, repoUrl, githubToken });
    },

    async syncProjectWithGitHub(userId: string, projectId: string) {
        console.log('🎯 FRONTEND: Calling syncProjectWithGitHub with:', { userId, projectId });
        return await callCallableFunction('syncProjectWithGitHub', { userId, projectId });
    },

    // NEW SCANNER FUNCTIONS - Using HTTP endpoints instead of callable functions
    async getScannerStatus() {
        console.log('🎯 FRONTEND: Calling getScannerStatus via HTTP endpoint');

        const timestamp = new Date().toISOString();
        const url = `${BASE_URL}/scannerApi/status`;

        console.log(`🚀 [${timestamp}] SCANNER: Calling HTTP endpoint:`, url);

        try {
            const startTime = performance.now();

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);

            console.log(`📡 [${timestamp}] SCANNER: HTTP response received:`, {
                status: response.status,
                statusText: response.statusText,
                duration: duration + 'ms',
                ok: response.ok
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`❌ [${timestamp}] SCANNER: HTTP call failed:`, {
                    status: response.status,
                    statusText: response.statusText,
                    errorBody: errorBody,
                    url: url
                });
                throw new Error(`Scanner status call failed: ${response.statusText} - ${errorBody}`);
            }

            const result = await response.json();

            console.log('🎯 FRONTEND: getScannerStatus result received:', {
                agentManagerInitialized: result?.agentManagerStatus?.initialized,
                totalAgents: result?.agentManagerStatus?.agents ? Object.keys(result.agentManagerStatus.agents).length : 0,
                scannerManagerFound: result?.scannerDetails?.available
            });

            return result;

        } catch (error) {
            console.error(`💥 [${timestamp}] SCANNER: HTTP call exception:`, {
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : 'No stack',
                url: url
            });
            throw error;
        }
    },

    async triggerRepositoryScan(projectId: string, scanType: string = 'medium', repoUrl?: string, githubToken?: string) {
        console.log('🎯 FRONTEND: Calling triggerRepositoryScan via HTTP endpoint with:', { projectId, scanType, repoUrl: repoUrl || 'none', hasToken: !!githubToken });

        const timestamp = new Date().toISOString();
        const url = `${BASE_URL}/scannerApi/scan`;

        console.log(`🚀 [${timestamp}] SCANNER: Calling HTTP endpoint:`, url);

        try {
            const startTime = performance.now();

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ projectId, scanType, repoUrl, githubToken })
            });

            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);

            console.log(`📡 [${timestamp}] SCANNER: HTTP response received:`, {
                status: response.status,
                statusText: response.statusText,
                duration: duration + 'ms',
                ok: response.ok
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`❌ [${timestamp}] SCANNER: HTTP call failed:`, {
                    status: response.status,
                    statusText: response.statusText,
                    errorBody: errorBody,
                    url: url
                });
                throw new Error(`Repository scan call failed: ${response.statusText} - ${errorBody}`);
            }

            const result = await response.json();

            console.log('🎯 FRONTEND: triggerRepositoryScan result received:', {
                scanTriggered: result?.scanTriggered,
                hasResult: !!result?.scanResult,
                scanType: result?.scanType
            });

            return result;

        } catch (error) {
            console.error(`💥 [${timestamp}] SCANNER: HTTP call exception:`, {
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : 'No stack',
                url: url
            });
            throw error;
        }
    },

    async getScanResults(projectId: string) {
        console.log('🎯 FRONTEND: Calling getScanResults via HTTP endpoint with projectId:', projectId);

        const timestamp = new Date().toISOString();
        const url = `${BASE_URL}/scannerApi/results/${projectId}`;

        console.log(`🚀 [${timestamp}] SCANNER: Calling HTTP endpoint:`, url);

        try {
            const startTime = performance.now();

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);

            console.log(`📡 [${timestamp}] SCANNER: HTTP response received:`, {
                status: response.status,
                statusText: response.statusText,
                duration: duration + 'ms',
                ok: response.ok
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`❌ [${timestamp}] SCANNER: HTTP call failed:`, {
                    status: response.status,
                    statusText: response.statusText,
                    errorBody: errorBody,
                    url: url
                });
                throw new Error(`Get scan results call failed: ${response.statusText} - ${errorBody}`);
            }

            const result = await response.json();

            console.log('🎯 FRONTEND: getScanResults result received:', {
                resultsFound: result?.totalResults || 0,
                projectId: result?.projectId
            });

            return result;

        } catch (error) {
            console.error(`💥 [${timestamp}] SCANNER: HTTP call exception:`, {
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : 'No stack',
                url: url
            });
            throw error;
        }
    }
};
