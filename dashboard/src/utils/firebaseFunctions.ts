// dashboard/src/utils/firebaseFunctions.ts
// Simple Firebase Callable Functions client without full Firebase SDK

const FIREBASE_PROJECT_ID = 'hackathon-agent-ce35f';
const REGION = 'us-central1';
const BASE_URL = `https://${REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`;

// Helper function to call Firebase Callable Functions
async function callFunction(functionName: string, data: any = {}) {
    const response = await fetch(`${BASE_URL}/${functionName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data })
    });

    if (!response.ok) {
        throw new Error(`Function call failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Firebase callable functions return data in a 'result' field
    return result.result || result;
}

// Wrapper functions for easier use
export const firebaseFunctions = {
    // Chat functions
    async getProject(userId: string) {
        return await callFunction('getProject', { userId });
    },

    async getChatHistory(userId: string, projectId?: string, limit = 50, offset = 0) {
        return await callFunction('getChatHistory', { userId, projectId, limit, offset });
    },

    async createProject(userId: string, projectData: any, githubRepo?: string) {
        return await callFunction('createProject', { userId, projectData, githubRepo });
    },

    async sendMessage(userId: string, message: string, messageContext?: any) {
        return await callFunction('sendMessage', { userId, message, messageContext });
    },

    // User functions
    async registerUser(userData: any) {
        return await callFunction('registerUser', userData);
    },

    async loginUser(email: string, password: string) {
        return await callFunction('loginUser', { email, password });
    },

    async getUsers() {
        return await callFunction('getUsers', {});
    },

    async getUser(userId: string) {
        return await callFunction('getUser', { userId });
    },

    async updateUser(userId: string, updates: any) {
        return await callFunction('updateUser', { userId, updates });
    },

    // GitHub functions
    async verifyGitHub(githubToken: string) {
        return await callFunction('verifyGitHub', { githubToken });
    },

    async connectGitHub(userId: string, repoUrl: string, githubToken?: string) {
        return await callFunction('connectGitHub', { userId, repoUrl, githubToken });
    },

    async syncProjectWithGitHub(userId: string, projectId: string) {
        return await callFunction('syncProjectWithGitHub', { userId, projectId });
    }
};
