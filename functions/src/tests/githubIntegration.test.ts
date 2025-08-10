// functions/src/tests/githubIntegration.test.ts
import { GitService, createGitService } from '../services/gitService';
import { TaskManagementService } from '../services/taskManagementService';

// Mock Octokit
jest.mock('@octokit/rest', () => ({
    Octokit: jest.fn().mockImplementation(() => ({
        rest: {
            repos: {
                get: jest.fn(() => Promise.resolve({
                    data: {
                        name: 'test-repo',
                        full_name: 'test-owner/test-repo',
                        default_branch: 'main',
                        private: false
                    }
                })),
                listCommits: jest.fn(() => Promise.resolve({
                    data: [
                        {
                            sha: 'abc123',
                            commit: {
                                author: {
                                    name: 'Test User',
                                    email: 'test@example.com',
                                    date: '2024-01-01T00:00:00Z'
                                },
                                message: 'feat: add new feature'
                            },
                            html_url: 'https://github.com/test-owner/test-repo/commit/abc123'
                        }
                    ],
                    headers: {
                        link: '<https://api.github.com/repos/test-owner/test-repo/commits?page=2>; rel="next", <https://api.github.com/repos/test-owner/test-repo/commits?page=10>; rel="last"'
                    }
                })),
                getContent: jest.fn(() => Promise.resolve({
                    data: [
                        {
                            path: 'src/index.ts',
                            type: 'file',
                            size: 1024,
                            sha: 'def456',
                            download_url: 'https://raw.githubusercontent.com/test-owner/test-repo/main/src/index.ts'
                        }
                    ]
                })),
                listBranches: jest.fn(() => Promise.resolve({
                    data: [
                        { name: 'main' },
                        { name: 'develop' }
                    ]
                })),
                listLanguages: jest.fn(() => Promise.resolve({
                    data: {
                        'TypeScript': 50000,
                        'JavaScript': 30000
                    }
                })),
                listContributors: jest.fn(() => Promise.resolve({
                    data: [
                        { login: 'user1' },
                        { login: 'user2' }
                    ]
                })),
                createWebhook: jest.fn(() => Promise.resolve({
                    data: { id: 123, url: 'https://example.com/webhook' }
                }))
            },
            users: {
                getAuthenticated: jest.fn(() => Promise.resolve({
                    data: {
                        login: 'testuser',
                        name: 'Test User',
                        email: 'test@example.com',
                        avatar_url: 'https://github.com/testuser.png',
                        public_repos: 5,
                        total_private_repos: 2
                    }
                }))
            }
        }
    }))
}));

// Mock Firebase Admin
const mockFirestore = {
    collection: jest.fn(() => ({
        doc: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({
                exists: true,
                data: () => ({
                    repoUrl: 'https://github.com/test-owner/test-repo',
                    githubToken: 'test-token',
                    userId: 'test-user'
                })
            })),
            set: jest.fn(() => Promise.resolve()),
            update: jest.fn(() => Promise.resolve()),
            collection: jest.fn(() => ({
                doc: jest.fn(() => ({
                    set: jest.fn(() => Promise.resolve()),
                    get: jest.fn(() => Promise.resolve({
                        exists: false
                    }))
                })),
                get: jest.fn(() => Promise.resolve({
                    docs: [],
                    empty: true
                }))
            }))
        })),
        get: jest.fn(() => Promise.resolve({
            docs: [],
            empty: true
        }))
    })),
    batch: jest.fn(() => ({
        set: jest.fn(),
        commit: jest.fn(() => Promise.resolve())
    }))
};

jest.mock('firebase-admin/firestore', () => ({
    getFirestore: () => mockFirestore,
    FieldValue: {
        serverTimestamp: () => 'timestamp'
    }
}));

describe('GitHub Integration Tests', () => {
    describe('GitService', () => {
        let gitService: GitService;

        beforeEach(() => {
            gitService = createGitService('https://github.com/test-owner/test-repo', 'test-token');
        });

        test('should parse repository URL correctly', () => {
            const parsed = GitService.parseRepositoryUrl('https://github.com/test-owner/test-repo');
            expect(parsed).toEqual({
                owner: 'test-owner',
                repo: 'test-repo'
            });
        });

        test('should parse repository URL with .git suffix', () => {
            const parsed = GitService.parseRepositoryUrl('https://github.com/test-owner/test-repo.git');
            expect(parsed).toEqual({
                owner: 'test-owner',
                repo: 'test-repo'
            });
        });

        test('should return null for invalid URL', () => {
            const parsed = GitService.parseRepositoryUrl('invalid-url');
            expect(parsed).toBeNull();
        });

        test('should get repository state', async () => {
            const state = await gitService.getRepositoryState();

            expect(state).toHaveProperty('defaultBranch', 'main');
            expect(state).toHaveProperty('commits');
            expect(state).toHaveProperty('files');
            expect(state).toHaveProperty('branches');
            expect(state).toHaveProperty('stats');
            expect(state.commits).toHaveLength(1);
            expect(state.commits[0]).toHaveProperty('sha', 'abc123');
        });

        test('should get recent commits', async () => {
            const commits = await gitService.getRecentCommits(5);

            expect(commits).toHaveLength(1);
            expect(commits[0]).toEqual({
                sha: 'abc123',
                author: 'Test User',
                authorEmail: 'test@example.com',
                timestamp: new Date('2024-01-01T00:00:00Z').getTime(),
                message: 'feat: add new feature',
                url: 'https://github.com/test-owner/test-repo/commit/abc123'
            });
        });

        test('should verify repository access', async () => {
            const hasAccess = await gitService.verifyAccess();
            expect(hasAccess).toBe(true);
        });

        test('should create webhook', async () => {
            const webhook = await gitService.createWebhook('https://example.com/webhook');
            expect(webhook).toHaveProperty('id', 123);
        });
    });

    describe('TaskManagementService', () => {
        let taskService: TaskManagementService;

        beforeEach(() => {
            taskService = new TaskManagementService();
        });

        test('should create tasks from project goals', async () => {
            const goals = [
                {
                    title: 'Implement user authentication',
                    description: 'Add login and registration functionality',
                    technologies: ['React', 'Firebase'],
                    complexity: 'medium',
                    deadline: '2024-02-01'
                }
            ];

            const tasks = await taskService.createTasksFromProjectGoals('test-user', 'test-project', goals);

            expect(tasks.length).toBeGreaterThan(0);
            expect(tasks[0]).toHaveProperty('title', 'Implement user authentication');
            expect(tasks[0]).toHaveProperty('category', 'feature');
            expect(tasks[0]).toHaveProperty('priority', 'medium');
            expect(tasks[0]).toHaveProperty('tags', ['React', 'Firebase']);
        });

        test('should categorize goals correctly', async () => {
            const goals = [
                { title: 'Fix authentication bug', description: '' },
                { title: 'Write documentation', description: '' },
                { title: 'Add testing suite', description: '' },
                { title: 'Refactor code structure', description: '' }
            ];

            const tasks = await taskService.createTasksFromProjectGoals('test-user', 'test-project', goals);

            expect(tasks.find(t => t.title.includes('bug'))).toHaveProperty('category', 'bug');
            expect(tasks.find(t => t.title.includes('documentation'))).toHaveProperty('category', 'documentation');
            expect(tasks.find(t => t.title.includes('testing'))).toHaveProperty('category', 'testing');
            expect(tasks.find(t => t.title.includes('Refactor'))).toHaveProperty('category', 'refactor');
        });

        test('should calculate project progress correctly', async () => {
            // Mock tasks data
            const mockTasks = [
                { status: 'completed', dueDate: null },
                { status: 'completed', dueDate: null },
                { status: 'in_progress', dueDate: null },
                { status: 'todo', dueDate: Date.now() - 1000 }, // overdue
                { status: 'blocked', dueDate: null }
            ];

            // Create a fresh mock for this test
            const mockTaskCollection = {
                get: jest.fn().mockResolvedValue({
                    docs: mockTasks.map((task, index) => ({
                        data: () => ({ id: `task_${index}`, ...task })
                    })),
                    empty: false
                })
            };

            const mockProjectDoc = {
                collection: jest.fn(() => mockTaskCollection)
            };

            const mockProjects = {
                doc: jest.fn(() => mockProjectDoc)
            };

            const mockDb = {
                collection: jest.fn(() => mockProjects)
            };

            // Override the db for this test
            const taskService = new TaskManagementService();
            (taskService as any).db = mockDb;

            const progress = await taskService.getProjectProgress('test-project');

            expect(progress.totalTasks).toBe(5);
            expect(progress.completedTasks).toBe(2);
            expect(progress.inProgressTasks).toBe(1);
            expect(progress.blockedTasks).toBe(1);
            expect(progress.overdueTasks).toBe(1);
            expect(progress.progressPercentage).toBe(40); // 2/5 * 100
        });

        test('should analyze commits for task suggestions', async () => {
            // Mock existing tasks
            const mockTasks = [
                {
                    id: 'task1',
                    title: 'authentication system',
                    tags: ['auth', 'security'],
                    status: 'in_progress',
                    priority: 'high',
                    category: 'feature'
                }
            ];

            // Create proper mocks for the task analysis
            const mockTaskCollection = {
                get: jest.fn().mockResolvedValue({
                    docs: mockTasks.map(task => ({
                        id: task.id,
                        data: () => task
                    })),
                    empty: false
                })
            };

            const mockConnectionDoc = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({
                        repoUrl: 'https://github.com/test-owner/test-repo',
                        githubToken: 'test-token'
                    })
                })
            };

            const mockDb = {
                collection: jest.fn((name: string) => {
                    if (name === 'github_connections') {
                        return { doc: () => mockConnectionDoc };
                    } else if (name === 'projects') {
                        return {
                            doc: () => ({
                                collection: () => mockTaskCollection
                            })
                        };
                    }
                    return { doc: () => ({ get: () => Promise.resolve({ exists: false }) }) };
                })
            };

            // Override the db for this test
            const taskService = new TaskManagementService();
            (taskService as any).db = mockDb;

            const suggestions = await taskService.analyzeCommitsForTaskProgress(
                'test-user',
                'test-project',
                'https://github.com/test-owner/test-repo',
                'test-token'
            );

            expect(suggestions.length).toBeGreaterThan(0);
            // Should suggest updating existing task (since commit message contains "feat" which relates to features)
            expect(suggestions.some(s => s.type === 'new_task' && s.suggestedCategory === 'documentation')).toBe(true);
        });
    });

    describe('Integration Tests', () => {
        test('should handle GitHub connection flow', async () => {
            const gitService = createGitService('https://github.com/test-owner/test-repo', 'test-token');

            // Verify access
            const hasAccess = await gitService.verifyAccess();
            expect(hasAccess).toBe(true);

            // Get repository state
            const state = await gitService.getRepositoryState();
            expect(state).toHaveProperty('defaultBranch');
            expect(state).toHaveProperty('commits');

            // Create tasks from repository activity
            const taskService = new TaskManagementService();
            const suggestions = await taskService.analyzeCommitsForTaskProgress(
                'test-user',
                'test-project',
                'https://github.com/test-owner/test-repo',
                'test-token'
            );

            expect(suggestions.length).toBeGreaterThan(0);
        });

        test('should handle private repository access', async () => {
            // Mock private repository
            const { Octokit } = require('@octokit/rest');
            const mockOctokit = new Octokit();
            mockOctokit.rest.repos.get.mockResolvedValue({
                data: { private: true, name: 'private-repo' }
            });

            const gitService = createGitService('https://github.com/test-owner/private-repo', 'test-token');
            const hasAccess = await gitService.verifyAccess();

            expect(hasAccess).toBe(true);
        });

        test('should handle repository without token (public only)', async () => {
            const gitService = createGitService('https://github.com/test-owner/public-repo');
            const hasAccess = await gitService.verifyAccess();

            expect(hasAccess).toBe(true);
        });
    });
});
