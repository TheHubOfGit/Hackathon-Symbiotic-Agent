export interface ProjectTask {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'in_progress' | 'completed' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignedTo?: string;
    dueDate?: number;
    estimatedHours?: number;
    actualHours?: number;
    tags: string[];
    relatedCommits: string[];
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
    parentTaskId?: string;
    subtasks: string[];
    dependencies: string[];
    category: 'feature' | 'bug' | 'refactor' | 'documentation' | 'testing' | 'maintenance';
}
export interface TaskProgress {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    overdueTasks: number;
    progressPercentage: number;
    estimatedCompletion?: number;
}
export interface AITaskSuggestion {
    type: 'new_task' | 'update_task' | 'optimization';
    confidence: number;
    title: string;
    description: string;
    reasoning: string;
    suggestedTags: string[];
    suggestedPriority: 'low' | 'medium' | 'high' | 'urgent';
    suggestedCategory: ProjectTask['category'];
    relatedCommits?: string[];
}
export declare class TaskManagementService {
    private db;
    createTasksFromProjectGoals(userId: string, projectId: string, goals: any[]): Promise<ProjectTask[]>;
    analyzeCommitsForTaskProgress(userId: string, projectId: string, repoUrl: string, githubToken?: string): Promise<AITaskSuggestion[]>;
    private analyzeCommitForTasks;
    private generateOptimizationSuggestions;
    getProjectProgress(projectId: string): Promise<TaskProgress>;
    private generateTaskId;
    private determinePriority;
    private categorizeGoal;
    private estimateHours;
    private generateSubtasks;
    private createSubtask;
}
