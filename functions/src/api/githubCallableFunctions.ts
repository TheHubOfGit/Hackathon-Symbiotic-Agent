// functions/src/api/githubCallableFunctions.ts
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';

// Firebase Callable Function for GitHub verification
export const verifyGitHub = functions.https.onCall(async (data, context) => {
    const { githubToken } = data;

    if (!githubToken) {
        throw new functions.https.HttpsError('invalid-argument', 'GitHub token is required');
    }

    try {
        // Verify the token with GitHub API using Octokit
        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({
            auth: githubToken,
        });

        const response = await octokit.rest.users.getAuthenticated();

        if (!response.data) {
            throw new functions.https.HttpsError('unauthenticated', 'Invalid GitHub token');
        }

        const userInfo = response.data;

        return {
            success: true,
            user: {
                login: userInfo.login,
                name: userInfo.name,
                email: userInfo.email,
                avatarUrl: userInfo.avatar_url,
                publicRepos: userInfo.public_repos,
                privateRepos: userInfo.total_private_repos
            }
        };
    } catch (error) {
        console.error('GitHub verification error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to verify GitHub token');
    }
});

// Firebase Callable Function for GitHub URL connection
export const connectGitHub = functions.https.onCall(async (data, context) => {
    const { userId, repoUrl, githubToken } = data;

    if (!userId || !repoUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'User ID and repository URL are required');
    }

    try {
        const db = getFirestore();

        // Import GitService dynamically
        const { createGitService, GitService } = await import('../services/gitService');

        // Parse the GitHub URL using GitService
        const parsed = GitService.parseRepositoryUrl(repoUrl);
        if (!parsed) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid GitHub repository URL');
        }

        // Create GitService instance
        const gitService = createGitService(repoUrl, githubToken);

        // Verify repository access
        const hasAccess = await gitService.verifyAccess();
        if (!hasAccess && !githubToken) {
            throw new functions.https.HttpsError('permission-denied', 'Repository is private and requires authentication', {
                requiresAuth: true
            });
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
                throw new functions.https.HttpsError('permission-denied', 'Repository requires authentication to access', {
                    requiresAuth: true
                });
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

        return {
            success: true,
            message: 'GitHub repository connected successfully',
            repoInfo: repoData || {
                name: parsed.repo,
                fullName: `${parsed.owner}/${parsed.repo}`,
                accessLimited: !githubToken
            }
        };
    } catch (error) {
        console.error('GitHub connection error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to connect GitHub repository');
    }
});

// Firebase Callable Function for syncing project with GitHub
export const syncProjectWithGitHub = functions.https.onCall(async (data, context) => {
    const { projectId, userId } = data;

    if (!projectId || !userId) {
        throw new functions.https.HttpsError('invalid-argument', 'Project ID and User ID are required');
    }

    try {
        const db = getFirestore();

        // Get GitHub connection
        const connectionDoc = await db.collection('github_connections').doc(userId).get();
        if (!connectionDoc.exists) {
            throw new functions.https.HttpsError('failed-precondition', 'No GitHub connection found');
        }

        const connection = connectionDoc.data();
        if (!connection?.repoUrl) {
            throw new functions.https.HttpsError('failed-precondition', 'No repository connected');
        }

        // Get project data
        const projectDoc = await db.collection('projects').doc(projectId).get();
        if (!projectDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Project not found');
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

        return {
            success: true,
            message: 'Project synchronized with GitHub successfully',
            syncData: {
                createdTasks: createdTasks.length,
                repoCommits: repoState.commits.length,
                repoLanguages: Object.keys(repoState.stats.languages).length
            }
        };
    } catch (error) {
        console.error('Error syncing project with GitHub:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to sync project with GitHub');
    }
});
