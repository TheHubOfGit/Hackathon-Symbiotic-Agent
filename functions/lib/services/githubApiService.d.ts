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
        languages: {
            [key: string]: number;
        };
        directories: string[];
    };
    issuesAndPRs: {
        openIssues: number;
        openPRs: number;
        recentActivity: string;
    };
}
export declare class GitHubApiService {
    private octokit;
    private db;
    constructor(accessToken: string);
    verifyRepoAccess(owner: string, repo: string): Promise<boolean>;
    analyzeRepository(owner: string, repo: string): Promise<RepoAnalysis>;
    getFileContent(owner: string, repo: string, path: string): Promise<GitHubFileContent | null>;
    getCommitHistory(owner: string, repo: string, since?: Date): Promise<GitHubCommit[]>;
    setupWebhook(owner: string, repo: string, webhookUrl: string): Promise<boolean>;
    cacheRepositoryData(owner: string, repo: string, data: RepoAnalysis): Promise<void>;
    getCachedRepositoryData(owner: string, repo: string): Promise<RepoAnalysis | null>;
    private getRecentActivitySummary;
}
export {};
