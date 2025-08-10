// functions/src/api/chatEndpoints.ts
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { UserCommunicationHub } from '../core/userCommunicationHub';

export const chat = functions.https.onRequest(async (req, res) => {
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

    const path = req.path.replace('/chat', '');

    try {
        switch (path) {
            case '/send':
                await handleSendMessage(req, res);
                break;
            case '/history':
                await handleGetHistory(req, res);
                break;
            case '/status':
                await handleGetAgentStatus(req, res);
                break;
            case '/ws':
                handleWebSocketUpgrade(req, res);
                break;
            case '/project':
                if (req.method === 'POST') {
                    await handleCreateProject(req, res);
                } else if (req.method === 'GET') {
                    await handleGetProject(req, res);
                }
                break;
            default:
                // Handle dynamic paths like /roadmap/projectId
                if (path.startsWith('/roadmap/')) {
                    await handleGetRoadmap(req, res, path);
                    break;
                }
                // Handle GitHub verification
                if (path === '/github/verify') {
                    await handleGitHubVerify(req, res);
                    break;
                }
                // Handle GitHub URL connection
                if (path === '/github/connect') {
                    await handleGitHubConnect(req, res);
                    break;
                }
                // Handle project progress
                if (path === '/project/progress') {
                    await handleGetProjectProgress(req, res);
                    break;
                }
                // Handle task analysis
                if (path === '/project/analyze-tasks') {
                    await handleAnalyzeTasks(req, res);
                    break;
                }
                // Handle sync project with GitHub
                if (path === '/project/sync-github') {
                    await handleSyncProjectWithGitHub(req, res);
                    break;
                }
                res.status(404).json({ error: 'Endpoint not found' });
        }
    } catch (error) {
        console.error('Chat endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

async function handleSendMessage(req: any, res: any) {
    const { userId, message, context } = req.body;

    if (!userId || !message) {
        return res.status(400).json({
            error: 'Missing required fields: userId and message'
        });
    }

    try {
        const hub = await getCommunicationHub();
        await hub.handleIncomingMessage(userId, message, context || {});

        res.json({
            success: true,
            message: 'Message queued for processing',
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            error: 'Failed to process message'
        });
    }
}

async function handleGetHistory(req: any, res: any) {
    const { userId, limit = 50, offset = 0 } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        const db = getFirestore();
        const messages = await db
            .collection('processed_messages')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(parseInt(limit))
            .offset(parseInt(offset))
            .get();

        const history = messages.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            messages: history,
            total: messages.size
        });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({
            error: 'Failed to fetch message history'
        });
    }
}

async function handleGetAgentStatus(req: any, res: any) {
    try {
        const db = getFirestore();
        const agents = await db.collection('agent_status').get();

        const status = agents.docs.map(doc => ({
            agentId: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            agents: status,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error fetching agent status:', error);
        res.status(500).json({
            error: 'Failed to fetch agent status'
        });
    }
}

function handleWebSocketUpgrade(req: any, res: any) {
    // WebSocket upgrade handled by Socket.IO server
    res.status(426).json({
        error: 'WebSocket upgrade required',
        message: 'Use Socket.IO client to connect'
    });
}

async function handleCreateProject(req: any, res: any) {
    try {
        const { userId, projectData, githubRepo } = req.body;

        if (!userId || !projectData) {
            return res.status(400).json({ error: 'User ID and project data are required' });
        }

        const db = getFirestore();
        const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Save project to Firestore
        await db.collection('projects').doc(projectId).set({
            ...projectData,
            userId,
            githubRepo: githubRepo || null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: 'active'
        });

        res.json({
            success: true,
            projectId,
            message: 'Project created successfully'
        });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
}

async function handleGetProject(req: any, res: any) {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const db = getFirestore();

        // Get user's projects
        const projectsSnapshot = await db.collection('projects')
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (projectsSnapshot.empty) {
            return res.status(404).json({ error: 'No projects found for user' });
        }

        const projectDoc = projectsSnapshot.docs[0];
        if (!projectDoc) {
            return res.status(404).json({ error: 'No projects found for user' });
        }

        const projectData = projectDoc.data();

        res.json({
            success: true,
            project: {
                id: projectDoc.id,
                ...projectData
            }
        });
    } catch (error) {
        console.error('Error getting project:', error);
        res.status(500).json({ error: 'Failed to get project' });
    }
}

// Get roadmap for a specific project
async function handleGetRoadmap(req: functions.https.Request, res: functions.Response, path: string): Promise<void> {
    try {
        const projectId = path.split('/')[2]; // Extract projectId from /roadmap/projectId

        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }

        const db = getFirestore();

        // Get all users to use as team members
        const usersSnapshot = await db.collection('users').get();
        const teamMembers = usersSnapshot.docs.map(doc => {
            const userData = doc.data();
            return {
                id: doc.id,
                name: userData.name || 'Unknown User',
                skills: userData.skills || [],
                currentTasks: [], // For now, empty
                workload: Math.floor(Math.random() * 80) + 20, // Random workload 20-100%
                status: Math.random() > 0.3 ? 'available' : (Math.random() > 0.5 ? 'busy' : 'offline')
            };
        });

        // Mock roadmap data with real team members
        const roadmapData = {
            phases: [
                {
                    name: "Planning & Setup",
                    duration: 2,
                    tasks: [
                        {
                            id: "task-1",
                            title: "Project Architecture Design",
                            description: "Define system architecture and tech stack",
                            status: "completed" as const,
                            assignee: teamMembers[0]?.name || "Unassigned",
                            estimatedHours: 4,
                            actualHours: 3,
                            dependencies: [],
                            priority: "high" as const
                        },
                        {
                            id: "task-2",
                            title: "Development Environment Setup",
                            description: "Set up development tools and repositories",
                            status: "completed" as const,
                            assignee: teamMembers[1]?.name || "Unassigned",
                            estimatedHours: 2,
                            actualHours: 2,
                            dependencies: ["task-1"],
                            priority: "medium" as const
                        }
                    ]
                },
                {
                    name: "Core Development",
                    duration: 8,
                    tasks: [
                        {
                            id: "task-3",
                            title: "Backend API Development",
                            description: "Build core API endpoints and authentication",
                            status: "in_progress" as const,
                            assignee: teamMembers[0]?.name || "Unassigned",
                            estimatedHours: 12,
                            actualHours: 8,
                            dependencies: ["task-2"],
                            priority: "critical" as const
                        },
                        {
                            id: "task-4",
                            title: "Frontend Component Development",
                            description: "Build user interface components",
                            status: "in_progress" as const,
                            assignee: teamMembers[1]?.name || "Unassigned",
                            estimatedHours: 10,
                            dependencies: ["task-2"],
                            priority: "high" as const
                        }
                    ]
                }
            ],
            teamMembers,
            lastUpdated: Date.now(),
            aiRecommendations: [
                "Consider adding unit tests for the authentication module",
                "Frontend components should be tested across different browsers",
                "API rate limiting should be implemented before deployment"
            ]
        };

        res.json(roadmapData);
    } catch (error) {
        console.error('Error getting roadmap:', error);
        res.status(500).json({ error: 'Failed to get roadmap data' });
    }
}

// Handle GitHub verification
async function handleGitHubVerify(req: functions.https.Request, res: functions.Response) {
    try {
        const data = req.body as { githubToken: string };
        const { githubToken } = data;

        if (!githubToken) {
            res.status(400).json({ error: 'GitHub token is required' });
            return;
        }

        // Verify the token with GitHub API using Octokit
        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({
            auth: githubToken,
        });

        const response = await octokit.rest.users.getAuthenticated();

        if (!response.data) {
            res.status(401).json({ error: 'Invalid GitHub token' });
            return;
        }

        const userInfo = response.data;

        res.status(200).json({
            success: true,
            user: {
                login: userInfo.login,
                name: userInfo.name,
                email: userInfo.email,
                avatarUrl: userInfo.avatar_url,
                publicRepos: userInfo.public_repos,
                privateRepos: userInfo.total_private_repos
            }
        });
    } catch (error) {
        console.error('GitHub verification error:', error);
        res.status(500).json({ error: 'Failed to verify GitHub token' });
    }
}

// Handle GitHub URL connection (without OAuth)
async function handleGitHubConnect(req: functions.https.Request, res: functions.Response) {
    try {
        const db = getFirestore();
        const data = req.body as { userId: string, repoUrl: string, githubToken?: string };
        const { userId, repoUrl, githubToken } = data;

        if (!userId || !repoUrl) {
            res.status(400).json({ error: 'User ID and repository URL are required' });
            return;
        }

        // Import GitService dynamically
        const { createGitService, GitService } = await import('../services/gitService');

        // Parse the GitHub URL using GitService
        const parsed = GitService.parseRepositoryUrl(repoUrl);
        if (!parsed) {
            res.status(400).json({ error: 'Invalid GitHub repository URL' });
            return;
        }

        // Create GitService instance
        const gitService = createGitService(repoUrl, githubToken);

        // Verify repository access
        const hasAccess = await gitService.verifyAccess();
        if (!hasAccess && !githubToken) {
            res.status(403).json({
                error: 'Repository is private and requires authentication',
                requiresAuth: true
            });
            return;
        }

        // Get repository information
        let repoData: any = null;
        try {
            const repoState = await gitService.getRepositoryState();
            repoData = {
                name: parsed.repo,
                fullName: `${parsed.owner}/${parsed.repo}`,
                defaultBranch: repoState.defaultBranch,
                totalCommits: repoState.stats.totalCommits,
                contributors: repoState.stats.contributors,
                languages: repoState.stats.languages,
                lastCommit: repoState.commits[0] || null
            };
        } catch (error) {
            console.error('Error fetching repository data:', error);
            if (!githubToken) {
                res.status(403).json({
                    error: 'Repository requires authentication to access',
                    requiresAuth: true
                });
                return;
            }
        }

        // Store the connection info
        const connectionData: any = {
            userId,
            repoUrl,
            owner: parsed.owner,
            repo: parsed.repo,
            connectedAt: FieldValue.serverTimestamp(),
            hasToken: !!githubToken,
            lastSync: Date.now(),
            syncEnabled: true
        };

        if (githubToken) {
            // Store token securely (you might want to encrypt this)
            connectionData.githubToken = githubToken;
        }

        if (repoData) {
            connectionData.repoInfo = repoData;
        }

        await db.collection('github_connections').doc(userId).set(connectionData);

        // Create webhook if token is provided
        if (githubToken && repoData) {
            try {
                const webhookUrl = `${req.get('origin') || 'https://your-function-url'}/webhooks/github`;
                await gitService.createWebhook(webhookUrl);
                connectionData.webhookEnabled = true;
            } catch (webhookError) {
                console.error('Failed to create webhook:', webhookError);
                // Don't fail the connection if webhook creation fails
            }
        }

        res.status(200).json({
            success: true,
            message: 'GitHub repository connected successfully',
            repoInfo: repoData || {
                name: parsed.repo,
                fullName: `${parsed.owner}/${parsed.repo}`,
                accessLimited: !githubToken
            }
        });
    } catch (error) {
        console.error('GitHub connection error:', error);
        res.status(500).json({ error: 'Failed to connect GitHub repository' });
    }
}

let hubInstance: UserCommunicationHub | null = null;

async function getCommunicationHub(): Promise<UserCommunicationHub> {
    if (!hubInstance) {
        const db = getFirestore();
        const { MessageRouter } = await import('../core/messageRouter');
        const { DecisionEngine } = await import('../agents/decisionEngine');
        const { Logger } = await import('../utils/logger');

        const messageRouter = new MessageRouter(db, new Logger('router'));
        const decisionEngine = new DecisionEngine(db, messageRouter, new Logger('decision'));

        hubInstance = new UserCommunicationHub(
            db,
            messageRouter,
            decisionEngine,
            new Logger('hub')
        );
    }

    return hubInstance;
}

// Handle getting real project progress
async function handleGetProjectProgress(req: functions.https.Request, res: functions.Response) {
    try {
        const { projectId, userId } = req.query;

        if (!projectId || !userId) {
            res.status(400).json({ error: 'Project ID and User ID are required' });
            return;
        }

        const { TaskManagementService } = await import('../services/taskManagementService');
        const taskService = new TaskManagementService();

        // Get project progress
        const progress = await taskService.getProjectProgress(projectId as string);

        // Get GitHub activity if connected
        const db = getFirestore();
        const connectionDoc = await db.collection('github_connections').doc(userId as string).get();
        let githubActivity = null;

        if (connectionDoc.exists) {
            const connection = connectionDoc.data();
            if (connection?.repoUrl && connection?.githubToken) {
                try {
                    const { createGitService } = await import('../services/gitService');
                    const gitService = createGitService(connection.repoUrl, connection.githubToken);

                    // Get recent commits (last 7 days)
                    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                    const recentCommits = await gitService.getChangesSince(weekAgo);

                    githubActivity = {
                        recentCommits: recentCommits.slice(0, 10), // Last 10 commits
                        commitCount: recentCommits.length,
                        lastCommitDate: recentCommits[0]?.timestamp || null
                    };
                } catch (error) {
                    console.error('Error getting GitHub activity:', error);
                }
            }
        }

        res.json({
            success: true,
            progress,
            githubActivity,
            realData: true // Indicate this is real data, not demo
        });
    } catch (error) {
        console.error('Error getting project progress:', error);
        res.status(500).json({ error: 'Failed to get project progress' });
    }
}

// Handle AI task analysis
async function handleAnalyzeTasks(req: functions.https.Request, res: functions.Response) {
    try {
        const { projectId, userId } = req.body;

        if (!projectId || !userId) {
            res.status(400).json({ error: 'Project ID and User ID are required' });
            return;
        }

        const { TaskManagementService } = await import('../services/taskManagementService');
        const taskService = new TaskManagementService();

        // Get GitHub connection for repo analysis
        const db = getFirestore();
        const connectionDoc = await db.collection('github_connections').doc(userId).get();

        if (!connectionDoc.exists) {
            res.status(400).json({ error: 'No GitHub connection found for analysis' });
            return;
        }

        const connection = connectionDoc.data();
        if (!connection?.repoUrl) {
            res.status(400).json({ error: 'No repository connected for analysis' });
            return;
        }

        // Analyze commits for task suggestions
        const suggestions = await taskService.analyzeCommitsForTaskProgress(
            userId,
            projectId,
            connection.repoUrl,
            connection.githubToken
        );

        res.json({
            success: true,
            suggestions,
            analysisTimestamp: Date.now()
        });
    } catch (error) {
        console.error('Error analyzing tasks:', error);
        res.status(500).json({ error: 'Failed to analyze tasks' });
    }
}

// Handle syncing project with GitHub data
async function handleSyncProjectWithGitHub(req: functions.https.Request, res: functions.Response) {
    try {
        const { projectId, userId } = req.body;

        if (!projectId || !userId) {
            res.status(400).json({ error: 'Project ID and User ID are required' });
            return;
        }

        const db = getFirestore();

        // Get GitHub connection
        const connectionDoc = await db.collection('github_connections').doc(userId).get();
        if (!connectionDoc.exists) {
            res.status(400).json({ error: 'No GitHub connection found' });
            return;
        }

        const connection = connectionDoc.data();
        if (!connection?.repoUrl) {
            res.status(400).json({ error: 'No repository connected' });
            return;
        }

        // Get project data
        const projectDoc = await db.collection('projects').doc(projectId).get();
        if (!projectDoc.exists) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const project = projectDoc.data();

        // Create tasks from project goals if they don't exist
        const { TaskManagementService } = await import('../services/taskManagementService');
        const taskService = new TaskManagementService();

        const tasksSnapshot = await db
            .collection('projects')
            .doc(projectId)
            .collection('tasks')
            .limit(1)
            .get();

        let createdTasks = [];
        if (tasksSnapshot.empty && project?.goals) {
            // Create tasks from project goals
            createdTasks = await taskService.createTasksFromProjectGoals(
                userId,
                projectId,
                project.goals
            );
        }

        // Get repository state for updated progress
        const { createGitService } = await import('../services/gitService');
        const gitService = createGitService(connection.repoUrl, connection.githubToken);
        const repoState = await gitService.getRepositoryState();

        // Update project with GitHub data
        await db.collection('projects').doc(projectId).update({
            githubSync: {
                lastSyncAt: Date.now(),
                repoState: {
                    totalCommits: repoState.stats.totalCommits,
                    contributors: repoState.stats.contributors,
                    languages: repoState.stats.languages,
                    lastCommit: repoState.commits[0] || null
                }
            },
            updatedAt: Date.now()
        });

        // Update GitHub connection sync status
        await db.collection('github_connections').doc(userId).update({
            lastSync: Date.now(),
            syncEnabled: true
        });

        res.json({
            success: true,
            message: 'Project synchronized with GitHub successfully',
            syncData: {
                createdTasks: createdTasks.length,
                repoCommits: repoState.commits.length,
                repoLanguages: Object.keys(repoState.stats.languages).length
            }
        });
    } catch (error) {
        console.error('Error syncing project with GitHub:', error);
        res.status(500).json({ error: 'Failed to sync project with GitHub' });
    }
}
