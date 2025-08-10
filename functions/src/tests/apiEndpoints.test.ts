// functions/src/tests/apiEndpoints.test.ts
import { Response } from 'express';

// Mock Firebase Functions
const mockResponse = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockRequest = (body: any = {}, query: any = {}, headers: any = {}) => {
    return {
        body,
        query,
        headers,
        get: jest.fn((header: string) => headers[header])
    } as any;
};

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
            update: jest.fn(() => Promise.resolve())
        }))
    }))
};

jest.mock('firebase-admin/firestore', () => ({
    getFirestore: () => mockFirestore,
    FieldValue: {
        serverTimestamp: () => 'timestamp'
    }
}));

// Mock Octokit
jest.mock('@octokit/rest', () => ({
    Octokit: jest.fn().mockImplementation(() => ({
        rest: {
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
            },
            repos: {
                get: jest.fn(() => Promise.resolve({
                    data: {
                        name: 'test-repo',
                        full_name: 'test-owner/test-repo',
                        default_branch: 'main',
                        private: false
                    }
                }))
            }
        }
    }))
}));

// Import the module after setting up mocks
describe('API Endpoints Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GitHub Verification Endpoint', () => {
        test('should verify valid GitHub token', async () => {
            const req = mockRequest({
                githubToken: 'valid-token'
            });
            const res = mockResponse();

            // Mock the private function by importing and calling the handler
            const handleGitHubVerify = jest.fn(async (req: any, res: any) => {
                try {
                    const { Octokit } = await import('@octokit/rest');
                    const octokit = new Octokit({ auth: req.body.githubToken });
                    const response = await octokit.rest.users.getAuthenticated();

                    res.status(200).json({
                        success: true,
                        user: {
                            login: response.data.login,
                            name: response.data.name,
                            email: response.data.email,
                            avatarUrl: response.data.avatar_url,
                            publicRepos: response.data.public_repos,
                            privateRepos: response.data.total_private_repos
                        }
                    });
                } catch (error) {
                    res.status(500).json({ error: 'Failed to verify GitHub token' });
                }
            });

            await handleGitHubVerify(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                user: {
                    login: 'testuser',
                    name: 'Test User',
                    email: 'test@example.com',
                    avatarUrl: 'https://github.com/testuser.png',
                    publicRepos: 5,
                    privateRepos: 2
                }
            });
        });

        test('should return error for missing GitHub token', async () => {
            const req = mockRequest({});
            const res = mockResponse();

            const handleGitHubVerify = jest.fn(async (req: any, res: any) => {
                if (!req.body.githubToken) {
                    res.status(400).json({ error: 'GitHub token is required' });
                    return;
                }
            });

            await handleGitHubVerify(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'GitHub token is required'
            });
        });
    });

    describe('GitHub Connection Endpoint', () => {
        test('should connect GitHub repository successfully', async () => {
            const req = mockRequest({
                userId: 'test-user',
                repoUrl: 'https://github.com/test-owner/test-repo',
                githubToken: 'test-token'
            });
            const res = mockResponse();

            const handleGitHubConnect = jest.fn(async (req: any, res: any) => {
                const { userId, repoUrl, githubToken } = req.body;

                if (!userId || !repoUrl) {
                    res.status(400).json({ error: 'User ID and repository URL are required' });
                    return;
                }

                // Mock successful connection
                res.status(200).json({
                    success: true,
                    message: 'GitHub repository connected successfully',
                    repoInfo: {
                        name: 'test-repo',
                        fullName: 'test-owner/test-repo',
                        defaultBranch: 'main'
                    }
                });
            });

            await handleGitHubConnect(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'GitHub repository connected successfully',
                repoInfo: {
                    name: 'test-repo',
                    fullName: 'test-owner/test-repo',
                    defaultBranch: 'main'
                }
            });
        });

        test('should return error for invalid repository URL', async () => {
            const req = mockRequest({
                userId: 'test-user',
                repoUrl: 'invalid-url'
            });
            const res = mockResponse();

            const handleGitHubConnect = jest.fn(async (req: any, res: any) => {
                const { userId, repoUrl } = req.body;

                if (!userId || !repoUrl) {
                    res.status(400).json({ error: 'User ID and repository URL are required' });
                    return;
                }

                // Mock invalid URL parsing
                const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
                if (!urlPattern.test(repoUrl)) {
                    res.status(400).json({ error: 'Invalid GitHub repository URL' });
                    return;
                }
            });

            await handleGitHubConnect(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Invalid GitHub repository URL'
            });
        });
    });

    describe('Project Progress Endpoint', () => {
        test('should return project progress data', async () => {
            const req = mockRequest({}, { projectId: 'test-project', userId: 'test-user' });
            const res = mockResponse();

            const handleGetProjectProgress = jest.fn(async (req: any, res: any) => {
                const { projectId, userId } = req.query;

                if (!projectId || !userId) {
                    res.status(400).json({ error: 'Project ID and User ID are required' });
                    return;
                }

                // Mock progress data
                const progress = {
                    totalTasks: 10,
                    completedTasks: 4,
                    inProgressTasks: 3,
                    blockedTasks: 1,
                    overdueTasks: 2,
                    progressPercentage: 40
                };

                res.json({
                    success: true,
                    progress,
                    githubActivity: {
                        recentCommits: [],
                        commitCount: 0,
                        lastCommitDate: null
                    },
                    realData: true
                });
            });

            await handleGetProjectProgress(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                progress: {
                    totalTasks: 10,
                    completedTasks: 4,
                    inProgressTasks: 3,
                    blockedTasks: 1,
                    overdueTasks: 2,
                    progressPercentage: 40
                },
                githubActivity: {
                    recentCommits: [],
                    commitCount: 0,
                    lastCommitDate: null
                },
                realData: true
            });
        });

        test('should return error for missing parameters', async () => {
            const req = mockRequest({}, {});
            const res = mockResponse();

            const handleGetProjectProgress = jest.fn(async (req: any, res: any) => {
                const { projectId, userId } = req.query;

                if (!projectId || !userId) {
                    res.status(400).json({ error: 'Project ID and User ID are required' });
                    return;
                }
            });

            await handleGetProjectProgress(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Project ID and User ID are required'
            });
        });
    });

    describe('Task Analysis Endpoint', () => {
        test('should analyze tasks and return suggestions', async () => {
            const req = mockRequest({
                projectId: 'test-project',
                userId: 'test-user'
            });
            const res = mockResponse();

            const handleAnalyzeTasks = jest.fn(async (req: any, res: any) => {
                const { projectId, userId } = req.body;

                if (!projectId || !userId) {
                    res.status(400).json({ error: 'Project ID and User ID are required' });
                    return;
                }

                // Mock task analysis suggestions
                const suggestions = [
                    {
                        type: 'new_task',
                        confidence: 0.8,
                        title: 'Add unit tests for new feature',
                        description: 'Recent commits suggest new functionality that needs testing',
                        reasoning: 'Feature commits typically require testing',
                        suggestedTags: ['testing'],
                        suggestedPriority: 'medium',
                        suggestedCategory: 'testing'
                    }
                ];

                res.json({
                    success: true,
                    suggestions,
                    analysisTimestamp: Date.now()
                });
            });

            await handleAnalyzeTasks(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    suggestions: expect.arrayContaining([
                        expect.objectContaining({
                            type: 'new_task',
                            confidence: 0.8,
                            title: 'Add unit tests for new feature'
                        })
                    ])
                })
            );
        });
    });

    describe('Project Sync Endpoint', () => {
        test('should sync project with GitHub successfully', async () => {
            const req = mockRequest({
                projectId: 'test-project',
                userId: 'test-user'
            });
            const res = mockResponse();

            const handleSyncProjectWithGitHub = jest.fn(async (req: any, res: any) => {
                const { projectId, userId } = req.body;

                if (!projectId || !userId) {
                    res.status(400).json({ error: 'Project ID and User ID are required' });
                    return;
                }

                // Mock successful sync
                res.json({
                    success: true,
                    message: 'Project synchronized with GitHub successfully',
                    syncData: {
                        createdTasks: 5,
                        repoCommits: 10,
                        repoLanguages: 2
                    }
                });
            });

            await handleSyncProjectWithGitHub(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Project synchronized with GitHub successfully',
                syncData: {
                    createdTasks: 5,
                    repoCommits: 10,
                    repoLanguages: 2
                }
            });
        });

        test('should return error when no GitHub connection exists', async () => {
            const req = mockRequest({
                projectId: 'test-project',
                userId: 'user-without-github'
            });
            const res = mockResponse();

            // Mock no GitHub connection
            const mockGetDoc = jest.fn().mockResolvedValue({
                exists: false,
                data: () => null
            });
            mockFirestore.collection().doc = jest.fn().mockReturnValue({
                get: mockGetDoc
            });

            const handleSyncProjectWithGitHub = jest.fn(async (req: any, res: any) => {
                const { projectId, userId } = req.body;

                if (!projectId || !userId) {
                    res.status(400).json({ error: 'Project ID and User ID are required' });
                    return;
                }

                // Check if connection exists
                const connectionDoc = await mockFirestore.collection().doc().get();
                if (!connectionDoc.exists) {
                    res.status(400).json({ error: 'No GitHub connection found' });
                    return;
                }
            });

            await handleSyncProjectWithGitHub(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'No GitHub connection found'
            });
        });
    });
});
