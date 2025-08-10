// functions/src/api/githubEndpoints.ts
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';

export const github = functions.https.onRequest(async (req, res) => {
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

    const db = getFirestore();
    const path = req.path || req.url;

    try {
        console.log('GitHub request:', req.method, path, req.body);

        if (req.method === 'POST') {
            if (path === '/verify' || path.endsWith('/verify')) {
                // Handle GitHub repository verification
                const { owner, repo, token, repoUrl } = req.body;

                if (!owner || !repo || !token) {
                    res.status(400).json({ error: 'Missing required fields: owner, repo, token' });
                    return;
                }

                try {
                    // Use native fetch instead of Octokit for now
                    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                        headers: {
                            'Authorization': `token ${token}`,
                            'User-Agent': 'Hackathon-Agent',
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });

                    if (!response.ok) {
                        if (response.status === 404) {
                            res.status(404).json({ error: 'Repository not found or access denied' });
                            return;
                        }
                        throw new Error(`GitHub API error: ${response.status}`);
                    }

                    const repoData: any = await response.json();

                    res.json({
                        success: true,
                        message: 'GitHub repository verified successfully',
                        isPrivate: repoData.private || false,
                        permissions: ['read'],
                        lastCommit: repoData.updated_at || '',
                        totalCommits: repoData.size || 0,
                        activeContributors: [repoData.owner?.login || 'Unknown']
                    });

                } catch (error: any) {
                    console.error('GitHub verification error:', error);
                    res.status(500).json({
                        error: 'Failed to verify GitHub repository',
                        details: error.message
                    });
                }
                return;
            }

            if (path === '/connect' || path.endsWith('/connect')) {
                // Handle GitHub repository connection/setup
                const { projectId, owner, repo, token, repoUrl } = req.body;

                if (!projectId || !owner || !repo || !token) {
                    res.status(400).json({ error: 'Missing required fields: projectId, owner, repo, token' });
                    return;
                }

                try {
                    // Use native fetch for repository info
                    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                        headers: {
                            'Authorization': `token ${token}`,
                            'User-Agent': 'Hackathon-Agent',
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`GitHub API error: ${response.status}`);
                    }

                    const repoData: any = await response.json();

                    const analysis = {
                        totalCommits: repoData.size || 0,
                        activeContributors: [repoData.owner?.login || 'Unknown'],
                        codeActivity: {
                            lastCommit: repoData.updated_at || '',
                            commitsToday: 0,
                            commitsThisWeek: 0,
                        },
                        fileStructure: {
                            totalFiles: 0,
                            languages: {},
                            directories: [],
                        },
                        issuesAndPRs: {
                            openIssues: repoData.open_issues_count || 0,
                            openPRs: 0,
                            recentActivity: 'Repository connected successfully',
                        },
                    };

                    // Store GitHub connection in project
                    await db.collection('projects').doc(projectId).update({
                        github: {
                            owner,
                            repo,
                            url: repoUrl,
                            token, // In production, encrypt this
                            connectedAt: Date.now(),
                            lastSync: Date.now(),
                            analysis
                        },
                        updatedAt: Date.now()
                    });

                    res.json({
                        success: true,
                        message: 'GitHub repository connected successfully',
                        analysis
                    });

                } catch (error: any) {
                    console.error('GitHub connection error:', error);
                    res.status(500).json({
                        error: 'Failed to connect GitHub repository',
                        details: error.message
                    });
                }
                return;
            }
        }

        if (req.method === 'GET') {
            if (path.startsWith('/analysis/') || path.includes('/analysis/')) {
                // Handle get repository analysis
                const projectId = path.split('/analysis/')[1] || path.split('/').pop();

                if (!projectId) {
                    res.status(400).json({ error: 'Project ID required' });
                    return;
                }

                try {
                    const projectDoc = await db.collection('projects').doc(projectId).get();

                    if (!projectDoc.exists) {
                        res.status(404).json({ error: 'Project not found' });
                        return;
                    }

                    const projectData = projectDoc.data();
                    const github = projectData?.github;

                    if (!github) {
                        res.status(404).json({ error: 'No GitHub repository connected to this project' });
                        return;
                    }

                    res.json({
                        success: true,
                        github: {
                            owner: github.owner,
                            repo: github.repo,
                            url: github.url,
                            analysis: github.analysis,
                            lastSync: github.lastSync,
                            connectedAt: github.connectedAt
                        }
                    });

                } catch (error: any) {
                    console.error('GitHub analysis retrieval error:', error);
                    res.status(500).json({
                        error: 'Failed to retrieve GitHub analysis',
                        details: error.message
                    });
                }
                return;
            }
        }

        res.status(404).json({ error: 'GitHub endpoint not found' });

    } catch (error) {
        console.error('GitHub endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
