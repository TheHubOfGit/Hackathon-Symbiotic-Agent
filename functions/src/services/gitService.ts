// functions/src/services/gitService.ts
// Dynamic import for ES module compatibility
let Octokit: any;

export interface GitHubConfig {
    accessToken?: string;
    owner: string;
    repo: string;
}

export interface CommitInfo {
    sha: string;
    author: string;
    authorEmail: string;
    timestamp: number;
    message: string;
    url: string;
}

export interface FileInfo {
    path: string;
    type: 'file' | 'dir';
    size?: number;
    downloadUrl?: string;
    sha: string;
}

export interface RepositoryState {
    defaultBranch: string;
    commits: CommitInfo[];
    files: FileInfo[];
    branches: string[];
    lastUpdated: number;
    stats: {
        totalCommits: number;
        contributors: number;
        languages: Record<string, number>;
    };
}

export class GitService {
    private octokit: any;
    private config: GitHubConfig;
    private initialized: boolean = false;

    constructor(config: GitHubConfig) {
        this.config = config;
    }

    private async ensureOctokit(): Promise<void> {
        if (!this.initialized) {
            if (!Octokit) {
                const { Octokit: OctokitClass } = await import('@octokit/rest');
                Octokit = OctokitClass;
            }

            if (this.config.accessToken) {
                this.octokit = new Octokit({
                    auth: this.config.accessToken,
                });
            } else {
                // For public repos, no auth needed
                this.octokit = new Octokit();
            }
            this.initialized = true;
        }
    }

    async getRepositoryState(): Promise<RepositoryState> {
        try {
            await this.ensureOctokit();

            const [repoInfo, commits, files, branches, languages] = await Promise.all([
                this.getRepositoryInfo(),
                this.getRecentCommits(),
                this.getFileTree(),
                this.getBranches(),
                this.getLanguages()
            ]);

            return {
                defaultBranch: repoInfo.default_branch,
                commits,
                files,
                branches,
                lastUpdated: Date.now(),
                stats: {
                    totalCommits: await this.getTotalCommitCount(),
                    contributors: await this.getContributorCount(),
                    languages
                }
            };
        } catch (error) {
            console.error('Error getting repository state:', error);
            throw new Error(`Failed to get repository state: ${error}`);
        }
    }

    private async getRepositoryInfo() {
        await this.ensureOctokit();
        const response = await this.octokit.rest.repos.get({
            owner: this.config.owner,
            repo: this.config.repo,
        });
        return response.data;
    }

    async getRecentCommits(limit: number = 10): Promise<CommitInfo[]> {
        try {
            await this.ensureOctokit();
            const response = await this.octokit.rest.repos.listCommits({
                owner: this.config.owner,
                repo: this.config.repo,
                per_page: limit,
            });

            return response.data.map((commit: any) => ({
                sha: commit.sha,
                author: commit.commit.author?.name || 'Unknown',
                authorEmail: commit.commit.author?.email || '',
                timestamp: new Date(commit.commit.author?.date || '').getTime(),
                message: commit.commit.message,
                url: commit.html_url,
            }));
        } catch (error) {
            console.error('Error fetching commits:', error);
            throw new Error(`Failed to fetch commits: ${error}`);
        }
    }

    private async getFileTree(path: string = ''): Promise<FileInfo[]> {
        try {
            await this.ensureOctokit();
            const response = await this.octokit.rest.repos.getContent({
                owner: this.config.owner,
                repo: this.config.repo,
                path,
            });

            const data = Array.isArray(response.data) ? response.data : [response.data];

            return data.map((item: any) => ({
                path: item.path,
                type: item.type as 'file' | 'dir',
                size: item.size,
                downloadUrl: item.download_url || undefined,
                sha: item.sha,
            }));
        } catch (error) {
            console.error('Error fetching file tree:', error);
            throw new Error(`Failed to fetch file tree: ${error}`);
        }
    }

    private async getBranches(): Promise<string[]> {
        try {
            await this.ensureOctokit();
            const response = await this.octokit.rest.repos.listBranches({
                owner: this.config.owner,
                repo: this.config.repo,
            });

            return response.data.map((branch: any) => branch.name);
        } catch (error) {
            console.error('Error fetching branches:', error);
            return [];
        }
    }

    private async getLanguages(): Promise<Record<string, number>> {
        try {
            await this.ensureOctokit();
            const response = await this.octokit.rest.repos.listLanguages({
                owner: this.config.owner,
                repo: this.config.repo,
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching languages:', error);
            return {};
        }
    }

    private async getTotalCommitCount(): Promise<number> {
        try {
            await this.ensureOctokit();
            // GitHub API doesn't provide total commit count directly
            // We'll estimate by fetching commits with pagination
            const response = await this.octokit.rest.repos.listCommits({
                owner: this.config.owner,
                repo: this.config.repo,
                per_page: 1,
            });

            // Parse the Link header to get total pages (rough estimate)
            const linkHeader = response.headers.link;
            if (linkHeader) {
                const match = linkHeader.match(/page=(\d+)>; rel="last"/);
                if (match && match[1]) {
                    return parseInt(match[1]) * 100; // Rough estimate
                }
            }

            return response.data.length;
        } catch (error) {
            console.error('Error getting commit count:', error);
            return 0;
        }
    }

    private async getContributorCount(): Promise<number> {
        try {
            await this.ensureOctokit();
            const response = await this.octokit.rest.repos.listContributors({
                owner: this.config.owner,
                repo: this.config.repo,
                per_page: 100,
            });

            return response.data.length;
        } catch (error) {
            console.error('Error getting contributor count:', error);
            return 0;
        }
    }

    async getFileContent(filePath: string, ref: string = 'main'): Promise<string> {
        try {
            await this.ensureOctokit();
            const response = await this.octokit.rest.repos.getContent({
                owner: this.config.owner,
                repo: this.config.repo,
                path: filePath,
                ref,
            });

            if ('content' in response.data && response.data.content) {
                return Buffer.from(response.data.content, 'base64').toString('utf-8');
            }

            throw new Error('File content not found');
        } catch (error) {
            console.error('Error fetching file content:', error);
            throw new Error(`Failed to fetch file content: ${error}`);
        }
    }

    async getChangesSince(timestamp: number): Promise<CommitInfo[]> {
        try {
            await this.ensureOctokit();
            const since = new Date(timestamp).toISOString();
            const response = await this.octokit.rest.repos.listCommits({
                owner: this.config.owner,
                repo: this.config.repo,
                since,
                per_page: 100,
            });

            return response.data.map((commit: any) => ({
                sha: commit.sha,
                author: commit.commit.author?.name || 'Unknown',
                authorEmail: commit.commit.author?.email || '',
                timestamp: new Date(commit.commit.author?.date || '').getTime(),
                message: commit.commit.message,
                url: commit.html_url,
            }));
        } catch (error) {
            console.error('Error fetching recent changes:', error);
            return [];
        }
    }

    async getCommitDiff(sha: string): Promise<any> {
        try {
            await this.ensureOctokit();
            const response = await this.octokit.rest.repos.getCommit({
                owner: this.config.owner,
                repo: this.config.repo,
                ref: sha,
            });

            return {
                sha: response.data.sha,
                message: response.data.commit.message,
                author: response.data.commit.author,
                files: response.data.files,
                stats: response.data.stats,
            };
        } catch (error) {
            console.error('Error fetching commit diff:', error);
            throw new Error(`Failed to fetch commit diff: ${error}`);
        }
    }

    async createWebhook(webhookUrl: string, events: string[] = ['push', 'pull_request']): Promise<any> {
        try {
            await this.ensureOctokit();
            const response = await this.octokit.rest.repos.createWebhook({
                owner: this.config.owner,
                repo: this.config.repo,
                config: {
                    url: webhookUrl,
                    content_type: 'json',
                },
                events,
            });

            return response.data;
        } catch (error) {
            console.error('Error creating webhook:', error);
            throw new Error(`Failed to create webhook: ${error}`);
        }
    }

    async verifyAccess(): Promise<boolean> {
        try {
            await this.ensureOctokit();
            await this.octokit.rest.repos.get({
                owner: this.config.owner,
                repo: this.config.repo,
            });
            return true;
        } catch (error) {
            console.error('Repository access verification failed:', error);
            return false;
        }
    }

    static parseRepositoryUrl(url: string): { owner: string; repo: string } | null {
        // Handle various GitHub URL formats
        const patterns = [
            /github\.com\/([^\/]+)\/([^\/]+)(?:\/|\.git|$)/,
            /github\.com\/([^\/]+)\/([^\/]+)\.git/,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1] && match[2]) {
                return {
                    owner: match[1],
                    repo: match[2].replace(/\.git$/, ''),
                };
            }
        }

        return null;
    }
}

// Factory function for creating GitService instances
export function createGitService(repoUrl: string, accessToken?: string): GitService {
    const parsed = GitService.parseRepositoryUrl(repoUrl);
    if (!parsed) {
        throw new Error('Invalid GitHub repository URL');
    }

    return new GitService({
        owner: parsed.owner,
        repo: parsed.repo,
        accessToken,
    });
}
