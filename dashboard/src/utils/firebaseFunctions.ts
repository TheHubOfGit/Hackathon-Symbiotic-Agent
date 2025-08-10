// dashboard/src/utils/firebaseFunctions.ts
// Simple Firebase Callable Functions client without full Firebase SDK

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

// Helper function to call Firebase Callable Functions
async function callFunction(functionName: string, data: any = {}) {
    const timestamp = new Date().toISOString();
    const url = `${BASE_URL}/${functionName}`;

    console.log(`🚀 [${timestamp}] STARTING API CALL:`, {
        function: functionName,
        url: url,
        payload: JSON.stringify(data, null, 2),
        payloadSize: JSON.stringify(data).length + ' bytes'
    });

    try {
        const startTime = performance.now();

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data })
        });

        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        console.log(`📡 [${timestamp}] API RESPONSE RECEIVED:`, {
            function: functionName,
            status: response.status,
            statusText: response.statusText,
            duration: duration + 'ms',
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`❌ [${timestamp}] API CALL FAILED:`, {
                function: functionName,
                status: response.status,
                statusText: response.statusText,
                errorBody: errorBody,
                url: url
            });
            throw new Error(`Function call failed: ${response.statusText} - ${errorBody}`);
        }

        const result = await response.json();

        console.log(`✅ [${timestamp}] API CALL SUCCESS:`, {
            function: functionName,
            duration: duration + 'ms',
            resultType: typeof result,
            resultKeys: result && typeof result === 'object' ? Object.keys(result) : 'N/A',
            resultSize: JSON.stringify(result).length + ' bytes'
        });

        // Firebase callable functions return data in a 'result' field
        const finalResult = result.result || result;

        console.log(`🎯 [${timestamp}] FINAL RESULT EXTRACTED:`, {
            function: functionName,
            finalResultType: typeof finalResult,
            finalResultKeys: finalResult && typeof finalResult === 'object' ? Object.keys(finalResult) : 'N/A',
            previewData: JSON.stringify(finalResult).substring(0, 200) + (JSON.stringify(finalResult).length > 200 ? '...' : '')
        });

        return finalResult;

    } catch (error) {
        const errorTime = performance.now();
        console.error(`💥 [${timestamp}] API CALL EXCEPTION:`, {
            function: functionName,
            error: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : 'No stack',
            url: url,
            timeUntilError: Math.round(errorTime - performance.now()) + 'ms'
        });
        throw error;
    }
}

// Wrapper functions for easier use
export const firebaseFunctions = {
    // Chat functions
    async getProject(userId: string) {
        console.log('🎯 FRONTEND: Calling getProject with userId:', userId);
        return await callFunction('getProject', { userId });
    },

    async getChatHistory(userId: string, projectId?: string, limit = 50, offset = 0) {
        console.log('🎯 FRONTEND: Calling getChatHistory with:', { userId, projectId, limit, offset });
        return await callFunction('getChatHistory', { userId, projectId, limit, offset });
    },

    async createProject(userId: string, projectData: any, githubRepo?: string) {
        console.log('🎯 FRONTEND: Calling createProject with:', { userId, projectData, githubRepo });
        return await callFunction('createProject', { userId, projectData, githubRepo });
    },

    async sendMessage(userId: string, message: string, messageContext?: any) {
        console.log('🎯 FRONTEND: Calling sendMessage with:', { userId, message, messageContext });
        return await callFunction('sendMessage', { userId, message, messageContext });
    },

    async getRoadmap(projectId: string) {
        console.log('🎯 FRONTEND: Calling getRoadmap with projectId:', projectId);
        const result = await callFunction('getRoadmap', { projectId });
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
        try {
            const getAllProjectsFunction = httpsCallable(functions, 'getAllProjects');
            const result = await getAllProjectsFunction({});
            const data = result.data as any;
            console.log('🎯 FRONTEND: getAllProjects result received:', {
                projectCount: data?.projects?.length || 0,
                projects: data?.projects || []
            });
            return data;
        } catch (error) {
            console.error('🚨 FRONTEND: getAllProjects error:', error);
            throw error;
        }
    },

    // User functions
    async registerUser(userData: any) {
        console.log('🎯 FRONTEND: Calling registerUser with userData:', userData);
        return await callFunction('registerUser', userData);
    },

    async loginUser(email: string, password: string) {
        console.log('🎯 FRONTEND: Calling loginUser with email:', email);
        return await callFunction('loginUser', { email, password });
    },

    async getUsers() {
        console.log('🎯 FRONTEND: Calling getUsers');
        return await callFunction('getUsers', {});
    },

    async getUser(userId: string) {
        console.log('🎯 FRONTEND: Calling getUser with userId:', userId);
        return await callFunction('getUser', { userId });
    },

    async updateUser(userId: string, updates: any) {
        console.log('🎯 FRONTEND: Calling updateUser with:', { userId, updates });
        return await callFunction('updateUser', { userId, updates });
    },

    // GitHub functions
    async verifyGitHub(githubToken: string) {
        console.log('🎯 FRONTEND: Calling verifyGitHub with token length:', githubToken?.length || 0);
        return await callFunction('verifyGitHub', { githubToken });
    },

    async connectGitHub(userId: string, repoUrl: string, githubToken?: string) {
        console.log('🎯 FRONTEND: Calling connectGitHub with:', { userId, repoUrl, tokenLength: githubToken?.length || 0 });
        return await callFunction('connectGitHub', { userId, repoUrl, githubToken });
    },

    async syncProjectWithGitHub(userId: string, projectId: string) {
        console.log('🎯 FRONTEND: Calling syncProjectWithGitHub with:', { userId, projectId });
        return await callFunction('syncProjectWithGitHub', { userId, projectId });
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
