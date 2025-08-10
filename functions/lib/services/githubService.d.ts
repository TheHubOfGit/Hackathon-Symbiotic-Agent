export interface GitHubConfig {
    token: string;
    owner: string;
    repo: string;
}
export interface GitHubMetrics {
    totalCommits: number;
    totalContributors: number;
    linesAdded: number;
    linesRemoved: number;
    filesChanged: number;
    lastCommitDate: string;
    commitFrequency: number;
    activeContributors: number;
}
export interface ContributorAnalysis {
    login: string;
    contributions: number;
    commitActivity: Array<{
        week: string;
        commits: number;
        additions: number;
        deletions: number;
    }>;
    expertise: string[];
    collaborationScore: number;
}
export interface ProjectProgress {
    completionPercentage: number;
    tasksCompleted: number;
    totalTasks: number;
    milestoneProgress: Array<{
        name: string;
        completed: boolean;
        dueDate: string;
        progress: number;
    }>;
    blockers: string[];
    recommendations: string[];
}
interface GitHubCommit {
    sha: string;
    commit: {
        message: string;
        committer: {
            date: string;
        };
    };
    author: {
        login: string;
    };
    stats?: {
        additions: number;
        deletions: number;
    };
    files?: Array<{
        filename: string;
        changes: number;
    }>;
}
interface GitHubRepo {
    name: string;
    description: string;
    stargazers_count: number;
    forks_count: number;
}
export declare class GitHubService {
    private token;
    private aiProviders;
    constructor(token: string);
    getRepoData(owner: string, repo: string): Promise<GitHubRepo>;
    getCommits(owner: string, repo: string, since?: string, per_page?: number): Promise<GitHubCommit[]>;
    getCommitDetails(owner: string, repo: string, sha: string): Promise<GitHubCommit>;
    analyzeCodeChanges(owner: string, repo: string, sha: string): Promise<string>;
    getContributors(owner: string, repo: string): Promise<ContributorAnalysis[]>;
    getContributorActivity(owner: string, repo: string, contributor: string): Promise<any>;
    analyzeContributorExpertise(owner: string, repo: string, contributor: string): Promise<string[]>;
    private calculateCollaborationScore;
    getProjectMetrics(owner: string, repo: string, timeframe?: string): Promise<GitHubMetrics>;
    generateAIProjectInsights(owner: string, repo: string): Promise<ProjectProgress>;
    private generateFallbackInsights;
    validateGitHubToken(): Promise<boolean>;
    getIssues(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<unknown>;
    getPullRequests(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<unknown>;
}
export {};
