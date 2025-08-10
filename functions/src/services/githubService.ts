// functions/src/services/githubService.ts
import { AIProviders } from './aiProviders';

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

interface GitHubContributor {
    login: string;
    contributions: number;
}

interface GitHubRepo {
    name: string;
    description: string;
    stargazers_count: number;
    forks_count: number;
}

export class GitHubService {
    private token: string;
    private aiProviders: AIProviders;

    constructor(token: string) {
        this.token = token;
        this.aiProviders = AIProviders.getInstance();
    }

    async getRepoData(owner: string, repo: string): Promise<GitHubRepo> {
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Hackathon-Symbiotic-Agent'
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            return response.json() as Promise<GitHubRepo>;
        } catch (error) {
            console.error('Error fetching repo data:', error);
            throw error;
        }
    }

    async getCommits(owner: string, repo: string, since?: string, per_page: number = 100): Promise<GitHubCommit[]> {
        try {
            const url = `https://api.github.com/repos/${owner}/${repo}/commits`;
            const params = new URLSearchParams();

            if (since) params.append('since', since);
            params.append('per_page', per_page.toString());

            const response = await fetch(`${url}?${params}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Hackathon-Symbiotic-Agent'
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            return response.json() as Promise<GitHubCommit[]>;
        } catch (error) {
            console.error('Error fetching commits:', error);
            throw error;
        }
    }

    async getCommitDetails(owner: string, repo: string, sha: string): Promise<GitHubCommit> {
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Hackathon-Symbiotic-Agent'
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            return response.json() as Promise<GitHubCommit>;
        } catch (error) {
            console.error('Error fetching commit details:', error);
            throw error;
        }
    }

    async analyzeCodeChanges(owner: string, repo: string, sha: string): Promise<string> {
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3.diff',
                    'User-Agent': 'Hackathon-Symbiotic-Agent'
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            return response.text();
        } catch (error) {
            console.error('Error analyzing code changes:', error);
            throw error;
        }
    }

    async getContributors(owner: string, repo: string): Promise<ContributorAnalysis[]> {
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Hackathon-Symbiotic-Agent'
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const contributors = await response.json() as GitHubContributor[];

            // Enhance with detailed analysis
            const contributorAnalysis = await Promise.all(
                contributors.map(async (contributor: GitHubContributor) => {
                    const activity = await this.getContributorActivity(owner, repo, contributor.login);
                    const expertise = await this.analyzeContributorExpertise(owner, repo, contributor.login);

                    return {
                        login: contributor.login,
                        contributions: contributor.contributions,
                        commitActivity: activity,
                        expertise: expertise,
                        collaborationScore: this.calculateCollaborationScore(activity)
                    };
                })
            );

            return contributorAnalysis;
        } catch (error) {
            console.error('Error fetching contributors:', error);
            throw error;
        }
    }

    async getContributorActivity(owner: string, repo: string, contributor: string) {
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/stats/contributors`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Hackathon-Symbiotic-Agent'
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const stats = await response.json() as any[];
            const contributorStats = stats.find((stat: any) => stat.author.login === contributor);

            if (!contributorStats) return [];

            return contributorStats.weeks.map((week: any) => ({
                week: new Date(week.w * 1000).toISOString(),
                commits: week.c,
                additions: week.a,
                deletions: week.d
            }));
        } catch (error) {
            console.error('Error fetching contributor activity:', error);
            return [];
        }
    }

    async analyzeContributorExpertise(owner: string, repo: string, contributor: string): Promise<string[]> {
        try {
            // Get commits by contributor
            const commitsResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/commits?author=${contributor}&per_page=50`,
                {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'Hackathon-Symbiotic-Agent'
                    }
                }
            );

            if (!commitsResponse.ok) return [];

            const commits = await commitsResponse.json() as GitHubCommit[];
            const fileTypes = new Map<string, number>();

            // Analyze file types from recent commits
            for (const commit of commits.slice(0, 20)) {
                const commitDetails = await this.getCommitDetails(owner, repo, commit.sha);

                if (commitDetails.files) {
                    commitDetails.files.forEach((file: any) => {
                        const extension = file.filename.split('.').pop()?.toLowerCase();
                        if (extension) {
                            fileTypes.set(extension, (fileTypes.get(extension) || 0) + file.changes);
                        }
                    });
                }
            }

            // Map file extensions to expertise areas
            const expertiseMap: { [key: string]: string } = {
                'js': 'JavaScript',
                'ts': 'TypeScript',
                'jsx': 'React',
                'tsx': 'React/TypeScript',
                'py': 'Python',
                'java': 'Java',
                'cpp': 'C++',
                'c': 'C',
                'css': 'CSS',
                'html': 'HTML',
                'sql': 'Database',
                'md': 'Documentation',
                'json': 'Configuration',
                'yml': 'DevOps',
                'yaml': 'DevOps',
                'dockerfile': 'Docker'
            };

            const expertise = Array.from(fileTypes.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([ext]) => expertiseMap[ext] || ext.toUpperCase())
                .filter(Boolean);

            return expertise;
        } catch (error) {
            console.error('Error analyzing contributor expertise:', error);
            return [];
        }
    }

    private calculateCollaborationScore(activity: any[]): number {
        if (activity.length === 0) return 0;

        const totalCommits = activity.reduce((sum, week) => sum + week.commits, 0);
        const averageCommitsPerWeek = totalCommits / activity.length;
        const consistency = activity.filter(week => week.commits > 0).length / activity.length;

        return Math.round((averageCommitsPerWeek * consistency) * 10) / 10;
    }

    async getProjectMetrics(owner: string, repo: string, timeframe: string = '30d'): Promise<GitHubMetrics> {
        try {
            const since = new Date();
            since.setDate(since.getDate() - (timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90));

            const [repoData, commits, contributors] = await Promise.all([
                this.getRepoData(owner, repo),
                this.getCommits(owner, repo, since.toISOString()),
                this.getContributors(owner, repo)
            ]);

            let totalLinesAdded = 0;
            let totalLinesRemoved = 0;
            let totalFilesChanged = 0;

            // Analyze recent commits for detailed metrics
            for (const commit of commits.slice(0, 50)) {
                try {
                    const commitDetails = await this.getCommitDetails(owner, repo, commit.sha);
                    if (commitDetails.stats) {
                        totalLinesAdded += commitDetails.stats.additions;
                        totalLinesRemoved += commitDetails.stats.deletions;
                        totalFilesChanged += commitDetails.files?.length || 0;
                    }
                } catch (error) {
                    console.warn(`Failed to get details for commit ${commit.sha}:`, error);
                }
            }

            const activeContributors = contributors.filter(c =>
                c.commitActivity.some(week => new Date(week.week) > since)
            ).length;

            return {
                totalCommits: commits.length,
                totalContributors: contributors.length,
                linesAdded: totalLinesAdded,
                linesRemoved: totalLinesRemoved,
                filesChanged: totalFilesChanged,
                lastCommitDate: commits[0]?.commit.committer.date || new Date().toISOString(),
                commitFrequency: commits.length / (timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90),
                activeContributors
            };
        } catch (error) {
            console.error('Error getting project metrics:', error);
            throw error;
        }
    }

    async generateAIProjectInsights(owner: string, repo: string): Promise<ProjectProgress> {
        try {
            const [metrics, commits, repoData] = await Promise.all([
                this.getProjectMetrics(owner, repo),
                this.getCommits(owner, repo, undefined, 50),
                this.getRepoData(owner, repo)
            ]);

            // Analyze recent commits for AI insights
            const recentCommitMessages = commits.slice(0, 20).map((c: GitHubCommit) => c.commit.message).join('\n');

            const gemini = this.aiProviders.getGemini('gemini-pro');
            const prompt = `
                Analyze this GitHub repository data and provide project insights:
                
                Repository: ${repoData.name}
                Description: ${repoData.description}
                Recent commits: ${metrics.totalCommits}
                Contributors: ${metrics.totalContributors}
                Lines added: ${metrics.linesAdded}
                Lines removed: ${metrics.linesRemoved}
                
                Recent commit messages:
                ${recentCommitMessages}
                
                Provide:
                1. Completion percentage estimate (0-100)
                2. Number of tasks completed vs total estimated tasks
                3. Key milestones and their progress
                4. Potential blockers or issues
                5. Specific recommendations for improvement
                
                Format as JSON with: completionPercentage, tasksCompleted, totalTasks, milestoneProgress, blockers, recommendations
            `;

            const result = await gemini.generateContent(prompt);
            const response = result.response.text();

            try {
                const analysis = JSON.parse(response);
                return {
                    completionPercentage: analysis.completionPercentage || 0,
                    tasksCompleted: analysis.tasksCompleted || 0,
                    totalTasks: analysis.totalTasks || 0,
                    milestoneProgress: analysis.milestoneProgress || [],
                    blockers: analysis.blockers || [],
                    recommendations: analysis.recommendations || []
                };
            } catch (parseError) {
                console.warn('Failed to parse AI response, using fallback');
                return this.generateFallbackInsights(metrics);
            }
        } catch (error) {
            console.error('Error generating AI insights:', error);
            return this.generateFallbackInsights(await this.getProjectMetrics(owner, repo));
        }
    }

    private generateFallbackInsights(metrics: GitHubMetrics): ProjectProgress {
        const completionPercentage = Math.min(90, Math.max(10, metrics.totalCommits * 2));
        const totalTasks = Math.max(10, Math.round(metrics.totalCommits * 1.5));
        const tasksCompleted = Math.round(totalTasks * (completionPercentage / 100));

        return {
            completionPercentage,
            tasksCompleted,
            totalTasks,
            milestoneProgress: [
                { name: 'Initial Setup', completed: true, dueDate: '2024-01-15', progress: 100 },
                { name: 'Core Features', completed: completionPercentage > 50, dueDate: '2024-02-01', progress: Math.max(0, completionPercentage - 20) },
                { name: 'Testing & Polish', completed: completionPercentage > 80, dueDate: '2024-02-15', progress: Math.max(0, completionPercentage - 60) }
            ],
            blockers: metrics.commitFrequency < 1 ? ['Low commit frequency'] : [],
            recommendations: [
                metrics.activeContributors < 2 ? 'Consider adding more active contributors' : 'Good contributor activity',
                metrics.commitFrequency > 5 ? 'High development velocity' : 'Consider increasing development pace'
            ]
        };
    }

    async validateGitHubToken(): Promise<boolean> {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Hackathon-Symbiotic-Agent'
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Error validating GitHub token:', error);
            return false;
        }
    }

    async getIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=100`,
                {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'Hackathon-Symbiotic-Agent'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            console.error('Error fetching issues:', error);
            throw error;
        }
    }

    async getPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=100`,
                {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'Hackathon-Symbiotic-Agent'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            return response.json();
        } catch (error) {
            console.error('Error fetching pull requests:', error);
            throw error;
        }
    }
}
