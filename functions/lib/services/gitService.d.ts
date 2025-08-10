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
export declare class GitService {
    private octokit;
    private config;
    private initialized;
    constructor(config: GitHubConfig);
    private ensureOctokit;
    getRepositoryState(): Promise<RepositoryState>;
    private getRepositoryInfo;
    getRecentCommits(limit?: number): Promise<CommitInfo[]>;
    private getFileTree;
    private getBranches;
    private getLanguages;
    private getTotalCommitCount;
    private getContributorCount;
    getFileContent(filePath: string, ref?: string): Promise<string>;
    getChangesSince(timestamp: number): Promise<CommitInfo[]>;
    getCommitDiff(sha: string): Promise<any>;
    createWebhook(webhookUrl: string, events?: string[]): Promise<any>;
    verifyAccess(): Promise<boolean>;
    static parseRepositoryUrl(url: string): {
        owner: string;
        repo: string;
    } | null;
}
export declare function createGitService(repoUrl: string, accessToken?: string): GitService;
