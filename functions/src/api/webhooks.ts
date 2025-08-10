// functions/src/api/webhooks.ts
import * as crypto from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { MessageRouter } from '../core/messageRouter';
import { Logger } from '../utils/logger';

// Lazy initialization to avoid Firebase issues during testing
function getDb() {
    return getFirestore();
}

function getLogger() {
    return new Logger('Webhooks');
}

export const webhooks = functions.https.onRequest(async (req, res) => {
    try {
        const path = req.path.replace('/webhooks', '');

        switch (path) {
            case '/github':
                await handleGitHubWebhook(req, res);
                break;
            case '/slack':
                await handleSlackWebhook(req, res);
                break;
            default:
                res.status(404).json({ error: 'Webhook not found' });
        }
    } catch (error) {
        getLogger().error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

async function handleGitHubWebhook(req: any, res: any) {
    // Verify GitHub signature
    const signature = req.headers['x-hub-signature-256'];
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (secret && !verifyGitHubSignature(req.body, signature, secret)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.headers['x-github-event'];
    const payload = req.body;

    getLogger().info(`GitHub webhook received: ${event}`);

    // Process based on event type
    switch (event) {
        case 'push':
            await handleGitHubPush(payload);
            break;
        case 'pull_request':
            await handleGitHubPullRequest(payload);
            break;
        case 'issues':
            await handleGitHubIssue(payload);
            break;
    }

    res.json({ success: true });
}

function verifyGitHubSignature(body: any, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(body)).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

async function handleGitHubPush(payload: any) {
    const messageRouter = new MessageRouter(getDb(), getLogger());

    await messageRouter.sendMessage({
        type: 'GIT_PUSH',
        source: 'github_webhook',
        target: 'repository_scanner_manager',
        payload: {
            repository: payload.repository.full_name,
            commits: payload.commits,
            pusher: payload.pusher.name
        },
        priority: 2,
        timestamp: Date.now()
    });
}

async function handleGitHubPullRequest(payload: any) {
    // Handle pull request events
    await getDb().collection('github_events').add({
        type: 'pull_request',
        action: payload.action,
        data: payload,
        timestamp: Date.now()
    });
}

async function handleGitHubIssue(payload: any) {
    // Handle issue events
    await getDb().collection('github_events').add({
        type: 'issue',
        action: payload.action,
        data: payload,
        timestamp: Date.now()
    });
}

async function handleSlackWebhook(req: any, res: any) {
    const payload = req.body;

    // Verify Slack signature if configured
    const signature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];

    // Handle Slack events
    if (payload.type === 'url_verification') {
        // Slack URL verification
        return res.json({ challenge: payload.challenge });
    }

    // Process Slack event
    await getDb().collection('slack_events').add({
        type: payload.type,
        data: payload,
        timestamp: Date.now()
    });

    res.json({ success: true });
}
