// functions/src/services/taskManagementService.ts
import { getFirestore } from 'firebase-admin/firestore';
import { CommitInfo, createGitService } from './gitService';

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

export class TaskManagementService {
    private db = getFirestore();

    async createTasksFromProjectGoals(
        userId: string,
        projectId: string,
        goals: any[]
    ): Promise<ProjectTask[]> {
        const tasks: ProjectTask[] = [];

        for (const goal of goals) {
            // Break down high-level goals into actionable tasks
            const mainTask: ProjectTask = {
                id: this.generateTaskId(),
                title: goal.title,
                description: goal.description || `Complete goal: ${goal.title}`,
                status: 'todo',
                priority: this.determinePriority(goal),
                tags: goal.technologies || [],
                relatedCommits: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                subtasks: [],
                dependencies: [],
                category: this.categorizeGoal(goal),
                dueDate: goal.deadline ? new Date(goal.deadline).getTime() : undefined,
                estimatedHours: goal.estimatedHours || this.estimateHours(goal)
            };

            tasks.push(mainTask);

            // Create subtasks if goal is complex
            const subtasks = this.generateSubtasks(mainTask, goal);
            tasks.push(...subtasks);

            // Update main task with subtask references
            mainTask.subtasks = subtasks.map(t => t.id);
        }

        // Store tasks in Firestore
        const batch = this.db.batch();
        for (const task of tasks) {
            const taskRef = this.db.collection('projects').doc(projectId).collection('tasks').doc(task.id);
            batch.set(taskRef, task);
        }
        await batch.commit();

        return tasks;
    }

    async analyzeCommitsForTaskProgress(
        userId: string,
        projectId: string,
        repoUrl: string,
        githubToken?: string
    ): Promise<AITaskSuggestion[]> {
        try {
            // Get project's GitHub connection
            const connectionDoc = await this.db.collection('github_connections').doc(userId).get();
            if (!connectionDoc.exists) {
                throw new Error('No GitHub connection found');
            }

            const connection = connectionDoc.data();
            const token = githubToken || connection?.githubToken;

            // Create Git service
            const gitService = createGitService(repoUrl, token);

            // Get recent commits (last 24 hours)
            const yesterday = Date.now() - (24 * 60 * 60 * 1000);
            const recentCommits = await gitService.getChangesSince(yesterday);

            // Get current project tasks
            const tasksSnapshot = await this.db
                .collection('projects')
                .doc(projectId)
                .collection('tasks')
                .get();

            const currentTasks = tasksSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ProjectTask[];

            const suggestions: AITaskSuggestion[] = [];

            // Analyze each commit for task implications
            for (const commit of recentCommits) {
                const commitSuggestions = await this.analyzeCommitForTasks(commit, currentTasks);
                suggestions.push(...commitSuggestions);
            }

            // Generate optimization suggestions
            const optimizationSuggestions = this.generateOptimizationSuggestions(currentTasks);
            suggestions.push(...optimizationSuggestions);

            return suggestions;
        } catch (error) {
            console.error('Error analyzing commits for task progress:', error);
            return [];
        }
    }

    private async analyzeCommitForTasks(
        commit: CommitInfo,
        currentTasks: ProjectTask[]
    ): Promise<AITaskSuggestion[]> {
        const suggestions: AITaskSuggestion[] = [];
        const message = commit.message.toLowerCase();

        // Check if commit relates to existing tasks
        const relatedTask = currentTasks.find(task =>
            message.includes(task.title.toLowerCase()) ||
            task.tags.some(tag => message.includes(tag.toLowerCase()))
        );

        if (relatedTask && relatedTask.status !== 'completed') {
            // Suggest updating existing task
            suggestions.push({
                type: 'update_task',
                confidence: 0.8,
                title: `Update progress on: ${relatedTask.title}`,
                description: `Commit "${commit.message}" appears to be related to this task`,
                reasoning: `Commit message contains keywords related to task "${relatedTask.title}"`,
                suggestedTags: [],
                suggestedPriority: relatedTask.priority,
                suggestedCategory: relatedTask.category,
                relatedCommits: [commit.sha]
            });
        }

        // Detect new features or bugs from commit message
        if (message.includes('fix') || message.includes('bug')) {
            suggestions.push({
                type: 'new_task',
                confidence: 0.7,
                title: `Follow up on bug fix: ${commit.message}`,
                description: `Test and validate the bug fix in commit ${commit.sha}`,
                reasoning: 'Commit indicates a bug fix which should be tested',
                suggestedTags: ['testing', 'qa'],
                suggestedPriority: 'medium',
                suggestedCategory: 'testing',
                relatedCommits: [commit.sha]
            });
        }

        if (message.includes('feat') || message.includes('add')) {
            suggestions.push({
                type: 'new_task',
                confidence: 0.6,
                title: `Document new feature: ${commit.message}`,
                description: `Update documentation for the new feature added in commit ${commit.sha}`,
                reasoning: 'New feature commits typically require documentation updates',
                suggestedTags: ['documentation'],
                suggestedPriority: 'low',
                suggestedCategory: 'documentation',
                relatedCommits: [commit.sha]
            });
        }

        return suggestions;
    }

    private generateOptimizationSuggestions(tasks: ProjectTask[]): AITaskSuggestion[] {
        const suggestions: AITaskSuggestion[] = [];

        // Find overdue tasks
        const overdueTasks = tasks.filter(task =>
            task.dueDate && task.dueDate < Date.now() && task.status !== 'completed'
        );

        if (overdueTasks.length > 0) {
            suggestions.push({
                type: 'optimization',
                confidence: 0.9,
                title: `Review ${overdueTasks.length} overdue tasks`,
                description: 'Some tasks are past their due date and need attention',
                reasoning: `${overdueTasks.length} tasks are overdue and may need reprioritization`,
                suggestedTags: ['urgent', 'review'],
                suggestedPriority: 'urgent',
                suggestedCategory: 'maintenance'
            });
        }

        // Find blocked tasks that might be unblocked
        const blockedTasks = tasks.filter(task => task.status === 'blocked');
        if (blockedTasks.length > 0) {
            suggestions.push({
                type: 'optimization',
                confidence: 0.7,
                title: `Review ${blockedTasks.length} blocked tasks`,
                description: 'Check if blocked tasks can now proceed',
                reasoning: 'Blocked tasks should be regularly reviewed for potential unblocking',
                suggestedTags: ['review', 'blocked'],
                suggestedPriority: 'medium',
                suggestedCategory: 'maintenance'
            });
        }

        return suggestions;
    }

    async getProjectProgress(projectId: string): Promise<TaskProgress> {
        const tasksSnapshot = await this.db
            .collection('projects')
            .doc(projectId)
            .collection('tasks')
            .get();

        const tasks = tasksSnapshot.docs.map(doc => doc.data()) as ProjectTask[];

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.status === 'completed').length;
        const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
        const blockedTasks = tasks.filter(task => task.status === 'blocked').length;
        const overdueTasks = tasks.filter(task =>
            task.dueDate && task.dueDate < Date.now() && task.status !== 'completed'
        ).length;

        const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Estimate completion based on current velocity
        let estimatedCompletion: number | undefined;
        const recentlyCompleted = tasks.filter(task =>
            task.completedAt && task.completedAt > Date.now() - (7 * 24 * 60 * 60 * 1000)
        );

        if (recentlyCompleted.length > 0 && totalTasks > completedTasks) {
            const weeklyVelocity = recentlyCompleted.length;
            const remainingTasks = totalTasks - completedTasks;
            const weeksToComplete = remainingTasks / weeklyVelocity;
            estimatedCompletion = Date.now() + (weeksToComplete * 7 * 24 * 60 * 60 * 1000);
        }

        return {
            totalTasks,
            completedTasks,
            inProgressTasks,
            blockedTasks,
            overdueTasks,
            progressPercentage,
            estimatedCompletion
        };
    }

    private generateTaskId(): string {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private determinePriority(goal: any): ProjectTask['priority'] {
        if (goal.priority) return goal.priority;
        if (goal.isCore || goal.critical) return 'high';
        if (goal.nice_to_have) return 'low';
        return 'medium';
    }

    private categorizeGoal(goal: any): ProjectTask['category'] {
        const title = goal.title?.toLowerCase() || '';
        const description = goal.description?.toLowerCase() || '';

        if (title.includes('bug') || title.includes('fix')) return 'bug';
        if (title.includes('test') || title.includes('testing')) return 'testing';
        if (title.includes('doc') || title.includes('readme')) return 'documentation';
        if (title.includes('refactor') || title.includes('optimize')) return 'refactor';
        if (title.includes('maintain') || title.includes('update')) return 'maintenance';

        return 'feature';
    }

    private estimateHours(goal: any): number {
        // Simple estimation based on goal complexity
        const complexity = goal.complexity || 'medium';
        const estimates = {
            simple: 4,
            medium: 16,
            complex: 40,
            very_complex: 80
        };

        return estimates[complexity as keyof typeof estimates] || 16;
    }

    private generateSubtasks(mainTask: ProjectTask, goal: any): ProjectTask[] {
        const subtasks: ProjectTask[] = [];

        // Generate common subtasks based on category
        switch (mainTask.category) {
            case 'feature':
                subtasks.push(
                    this.createSubtask(mainTask, 'Design feature architecture', 'documentation'),
                    this.createSubtask(mainTask, 'Implement core functionality', 'feature'),
                    this.createSubtask(mainTask, 'Write unit tests', 'testing'),
                    this.createSubtask(mainTask, 'Update documentation', 'documentation')
                );
                break;

            case 'bug':
                subtasks.push(
                    this.createSubtask(mainTask, 'Reproduce and investigate bug', 'bug'),
                    this.createSubtask(mainTask, 'Implement fix', 'bug'),
                    this.createSubtask(mainTask, 'Test fix thoroughly', 'testing')
                );
                break;

            case 'documentation':
                subtasks.push(
                    this.createSubtask(mainTask, 'Research current state', 'documentation'),
                    this.createSubtask(mainTask, 'Write documentation', 'documentation'),
                    this.createSubtask(mainTask, 'Review and edit', 'documentation')
                );
                break;
        }

        return subtasks;
    }

    private createSubtask(
        parentTask: ProjectTask,
        title: string,
        category: ProjectTask['category']
    ): ProjectTask {
        return {
            id: this.generateTaskId(),
            title,
            description: `Subtask of: ${parentTask.title}`,
            status: 'todo',
            priority: parentTask.priority,
            tags: parentTask.tags,
            relatedCommits: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            subtasks: [],
            dependencies: [],
            category,
            parentTaskId: parentTask.id,
            estimatedHours: Math.ceil((parentTask.estimatedHours || 16) / 4)
        };
    }
}
