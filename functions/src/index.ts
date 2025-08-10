// functions/src/index.ts
import * as admin from 'firebase-admin';
import { admin as adminEndpoints } from './api/adminEndpoints';
import { chat } from './api/chatEndpoints';
import { github } from './api/githubEndpoints';
import { simpleUsers } from './api/simpleUsers';
import { socket } from './api/socketEndpoint';
import { test } from './api/testEndpoint';
import { users } from './api/userEndpoints';
import { webhooks } from './api/webhooks';

// Initialize Firebase Admin
admin.initializeApp();

// Export all functions
export {
    adminEndpoints as admin, chat, github, simpleUsers, socket, test, users, webhooks
};

// Agent configuration
export { AGENT_CONFIG } from './config/agents.config';

