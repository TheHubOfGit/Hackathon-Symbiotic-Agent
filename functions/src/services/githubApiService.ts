// functions/src/services/githubApiService.ts
import { Octokit } from '@octokit/rest';
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';

interface GitHubCommit {
    sha: string;
    author: string;
    message: string;
    timestamp: string;
    additions: number;
    deletions: number;
    changedFiles: string[];
}

interface GitHubFileContent {
    path: string;
    content: string;
    size: number;
    type: string;
}

interface RepoAnalysis {
    totalCommits: number;
    activeContributors: string[];
    codeActivity: {
        lastCommit: string;
        commitsToday: number;
        commitsThisWeek: number;
    };
    fileStructure: {
        totalFiles: number;
        languages: { [key: string]: number };
        directories: string[];
    };
    issuesAndPRs: {
        openIssues: number;
        openPRs: number;
        recentActivity: string;
    };
}

export class GitHubApiService {
    private octokit: Octokit;
    private db = getFirestore();

    constructor(accessToken: string) {
        this.octokit = new Octokit({
            auth: accessToken,
        });
    }

    /**
     * Verify if we can access the repository (handles private repos)
     */
    async verifyRepoAccess(owner: string, repo: string): Promise<boolean> {
        try {
            await this.octokit.rest.repos.get({
                owner,
                repo,
            });
            return true;
        } catch (error: any) {
            console.error('GitHub repo access failed:', error.message);
            return false;
        }
    }

    /**
     * Get comprehensive repository analysis WITHOUT downloading the repo
     */
    async analyzeRepository(owner: string, repo: string): Promise<RepoAnalysis> {
        try {
            // 1. Get repository info
            const repoInfo = await this.octokit.rest.repos.get({ owner, repo });

            // 2. Get recent commits (API gives us commit data without downloading files)
            const commitsResponse = await this.octokit.rest.repos.listCommits({
                owner,
                repo,
                per_page: 100,
                since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
            });

            // 3. Get repository contents (file structure)
            const contentsResponse = await this.octokit.rest.repos.getContent({
                owner,
                repo,
                path: '',
            });

            // 4. Get issues and PRs
            const [issuesResponse, prsResponse] = await Promise.all([
                this.octokit.rest.issues.listForRepo({
                    owner,
                    repo,
                    state: 'open',
                    per_page: 100,
                }),
                this.octokit.rest.pulls.list({
                    owner,
                    repo,
                    state: 'open',
                    per_page: 50,
                }),
            ]);

            // 5. Get language statistics
            const languagesResponse = await this.octokit.rest.repos.listLanguages({
                owner,
                repo,
            });

            // Process the data
            const commits = commitsResponse.data;
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            const commitsToday = commits.filter(commit =>
                new Date(commit.commit.author?.date || '') >= todayStart
            ).length;

            const commitsThisWeek = commits.filter(commit =>
                new Date(commit.commit.author?.date || '') >= weekStart
            ).length;

            const activeContributors = [...new Set(
                commits.map(commit => commit.commit.author?.name || 'Unknown')
            )];

            // Analyze file structure
            const contents = Array.isArray(contentsResponse.data) ? contentsResponse.data : [contentsResponse.data];
            const directories = contents
                .filter(item => item.type === 'dir')
                .map(item => item.name);

            return {
                totalCommits: repoInfo.data.size || 0,
                activeContributors,
                codeActivity: {
                    lastCommit: commits[0]?.commit.author?.date || '',
                    commitsToday,
                    commitsThisWeek,
                },
                fileStructure: {
                    totalFiles: contents.filter(item => item.type === 'file').length,
                    languages: languagesResponse.data,
                    directories,
                },
                issuesAndPRs: {
                    openIssues: issuesResponse.data.length,
                    openPRs: prsResponse.data.length,
                    recentActivity: this.getRecentActivitySummary(commits, issuesResponse.data, prsResponse.data),
                },
            };
        } catch (error) {
            console.error('Error analyzing repository:', error);
            throw new Error('Failed to analyze repository');
        }
    }

    /**
     * Get specific file content from GitHub (for AI analysis)
     */
    async getFileContent(owner: string, repo: string, path: string): Promise<GitHubFileContent | null> {
        try {
            const response = await this.octokit.rest.repos.getContent({
                owner,
                repo,
                path,
            });

            const fileData = response.data;
            if ('content' in fileData && fileData.type === 'file') {
                return {
                    path: fileData.path,
                    content: Buffer.from(fileData.content, 'base64').toString('utf8'),
                    size: fileData.size,
                    type: fileData.type,
                };
            }
            return null;
        } catch (error) {
            console.error(`Error fetching file ${path}:`, error);
            return null;
        }
    }

    /**
     * Get commit history for progress tracking
     */
    async getCommitHistory(owner: string, repo: string, since?: Date): Promise<GitHubCommit[]> {
        try {
            const response = await this.octokit.rest.repos.listCommits({
                owner,
                repo,
                per_page: 100,
                since: since?.toISOString(),
            });

            return response.data.map(commit => ({
                sha: commit.sha,
                author: commit.commit.author?.name || 'Unknown',
                message: commit.commit.message,
                timestamp: commit.commit.author?.date || '',
                additions: commit.stats?.additions || 0,
                deletions: commit.stats?.deletions || 0,
                changedFiles: commit.files?.map(file => file.filename) || [],
            }));
        } catch (error) {
            console.error('Error fetching commit history:', error);
            return [];
        }
    }

    /**
     * Set up webhook for automatic updates (this is how we get real-time updates)
     */
    async setupWebhook(owner: string, repo: string, webhookUrl: string): Promise<boolean> {
        try {
            // Check if webhook already exists
            const existingWebhooks = await this.octokit.rest.repos.listWebhooks({
                owner,
                repo,
            });

            const existingWebhook = existingWebhooks.data.find(
                webhook => webhook.config.url === webhookUrl
            );

            if (existingWebhook) {
                console.log('Webhook already exists');
                return true;
            }

            // Create new webhook
            await this.octokit.rest.repos.createWebhook({
                owner,
                repo,
                config: {
                    url: webhookUrl,
                    content_type: 'json',
                    secret: functions.config().github?.webhook_secret || process.env.GITHUB_WEBHOOK_SECRET,
                },
                events: ['push', 'pull_request', 'issues', 'commit_comment'],
            });

            console.log('GitHub webhook created successfully');
            return true;
        } catch (error) {
            console.error('Error setting up webhook:', error);
            return false;
        }
    }

    /**
     * Store repository analysis in Firestore for caching
     */
    async cacheRepositoryData(owner: string, repo: string, data: RepoAnalysis): Promise<void> {
        try {
            await this.db.collection('github_repos').doc(`${owner}_${repo}`).set({
                ...data,
                lastUpdated: Date.now(),
                owner,
                repo,
            });
        } catch (error) {
            console.error('Error caching repository data:', error);
        }
    }

    /**
     * Get cached repository data
     */
    async getCachedRepositoryData(owner: string, repo: string): Promise<RepoAnalysis | null> {
        try {
            const doc = await this.db.collection('github_repos').doc(`${owner}_${repo}`).get();
            if (doc.exists) {
                const data = doc.data();
                // Check if cache is less than 1 hour old
                if (data && Date.now() - data.lastUpdated < 60 * 60 * 1000) {
                    return data as RepoAnalysis;
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting cached repository data:', error);
            return null;
        }
    }

    private getRecentActivitySummary(commits: any[], issues: any[], prs: any[]): string {
        const recentCommits = commits.slice(0, 3).map(c => c.commit.message).join(', ');
        const recentIssues = issues.slice(0, 2).map(i => i.title).join(', ');
        const recentPRs = prs.slice(0, 2).map(pr => pr.title).join(', ');

        let summary = '';
        if (recentCommits) summary += `Recent commits: ${recentCommits}. `;
        if (recentIssues) summary += `Open issues: ${recentIssues}. `;
        if (recentPRs) summary += `Open PRs: ${recentPRs}.`;

        return summary || 'No recent activity';
    }
}
