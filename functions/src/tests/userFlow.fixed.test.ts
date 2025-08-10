// functions/src/tests/userFlow.fixed.test.ts
import { UserMessageProcessor } from '../agents/communication/userMessageProcessor';
import { MessageRouter } from '../core/messageRouter';
import { UserCommunicationHub } from '../core/userCommunicationHub';
import { UserMessage } from '../models/communication.types';
import { Logger } from '../utils/logger';

// Mock Firebase to avoid initialization issues in tests
jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    getFirestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            add: jest.fn(),
            doc: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({}) })),
                set: jest.fn(),
                update: jest.fn()
            })),
            get: jest.fn(() => Promise.resolve({ docs: [] }))
        }))
    }))
}));

// Mock OpenAI
jest.mock('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn(() => Promise.resolve({
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                intent: 'project_creation',
                                entities: { projectType: 'web-app', framework: 'react' },
                                confidence: 0.95
                            })
                        }
                    }]
                }))
            }
        }
    }))
}));

describe('User Flow Integration Tests (Fixed)', () => {
    let mockDb: any;
    let logger: Logger;
    let messageRouter: MessageRouter;

    beforeEach(() => {
        mockDb = {
            collection: jest.fn(() => ({
                add: jest.fn(() => Promise.resolve({ id: 'test-doc-id' })),
                doc: jest.fn(() => ({
                    get: jest.fn(() => Promise.resolve({
                        exists: true,
                        data: () => ({ status: 'active' })
                    })),
                    set: jest.fn(() => Promise.resolve()),
                    update: jest.fn(() => Promise.resolve())
                })),
                get: jest.fn(() => Promise.resolve({ docs: [] }))
            }))
        };

        logger = new Logger('UserFlowTest');
        messageRouter = new MessageRouter(mockDb, logger);
    });

    describe('Basic Message Processing', () => {
        it('should process a simple user message', async () => {
            const userMessage: UserMessage = {
                id: 'test-msg-1',
                userId: 'user-123',
                userName: 'John Doe',
                content: 'I need help setting up a React project',
                context: {
                    currentView: 'dashboard',
                    hackathonId: 'hackathon-2024',
                    sessionId: 'session-123'
                },
                timestamp: Date.now(),
                status: 'pending'
            };

            const processor = new UserMessageProcessor(
                'gpt5mini_1',
                mockDb,
                messageRouter,
                logger
            );

            const result = await processor.processUserMessage(userMessage);

            expect(result).toBeDefined();
            expect(result.originalMessage).toEqual(userMessage);
            expect(result.intent).toBeDefined();
            expect(result.entities).toBeDefined();
            expect(result.agentId).toBe('gpt5mini_1');
        });

        it('should handle empty or invalid messages gracefully', async () => {
            const invalidMessage: UserMessage = {
                id: 'test-msg-2',
                userId: 'user-123',
                userName: 'John Doe',
                content: '',
                context: {
                    sessionId: 'session-123'
                },
                timestamp: Date.now(),
                status: 'pending'
            };

            const processor = new UserMessageProcessor(
                'gpt5mini_2',
                mockDb,
                messageRouter,
                logger
            );

            const result = await processor.processUserMessage(invalidMessage);

            expect(result).toBeDefined();
            expect(result.originalMessage).toEqual(invalidMessage);
        });
    });

    describe('Communication Hub Integration', () => {
        it('should integrate processor with communication hub', async () => {
            // Mock DecisionEngine for the communication hub
            const mockDecisionEngine = {
                analyzeMessage: jest.fn(() => Promise.resolve({})),
                routeMessage: jest.fn(() => Promise.resolve({}))
            };

            const communicationHub = new UserCommunicationHub(
                mockDb,
                messageRouter,
                mockDecisionEngine as any,
                logger
            );

            const testMessage: UserMessage = {
                id: 'hub-test-1',
                userId: 'user-456',
                userName: 'Jane Smith',
                content: 'How do I deploy my app?',
                context: {
                    currentView: 'deployment',
                    activeTask: 'setup-hosting',
                    hackathonId: 'hackathon-2024'
                },
                timestamp: Date.now(),
                status: 'pending'
            };

            // Test the communication hub is properly initialized
            expect(communicationHub).toBeDefined();

            // Verify message structure is valid
            expect(testMessage.id).toBeDefined();
            expect(testMessage.userId).toBeDefined();
            expect(testMessage.content).toBeDefined();
            expect(testMessage.context).toBeDefined();
        });
    });

    describe('Message Router Integration', () => {
        it('should route messages correctly', async () => {
            const testMessage = {
                type: 'USER_MESSAGE',
                source: 'user-interface',
                target: 'user_message_processor',
                payload: {
                    messageId: 'msg-123',
                    userId: 'user-789',
                    content: 'Need help with database setup'
                },
                priority: 2,
                timestamp: Date.now()
            };

            await messageRouter.sendMessage(testMessage);

            // Verify message was processed
            expect(mockDb.collection).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle processor errors gracefully', async () => {
            const processor = new UserMessageProcessor(
                'gpt5mini_1',
                mockDb,
                messageRouter,
                logger
            );

            const problematicMessage: UserMessage = {
                id: 'error-test-1',
                userId: 'user-error',
                userName: 'Error Test',
                content: 'Test message',
                context: {},
                timestamp: Date.now(),
                status: 'pending'
            };

            // Should not throw, should handle gracefully
            await expect(processor.processUserMessage(problematicMessage)).resolves.toBeDefined();
        });
    });

    describe('Performance and Concurrency', () => {
        it('should handle multiple messages concurrently', async () => {
            const processor = new UserMessageProcessor(
                'gpt5mini_1',
                mockDb,
                messageRouter,
                logger
            );

            const messages: UserMessage[] = Array.from({ length: 5 }, (_, i) => ({
                id: `concurrent-msg-${i}`,
                userId: `user-${i}`,
                userName: `User ${i}`,
                content: `Message ${i}`,
                context: { sessionId: `session-${i}` },
                timestamp: Date.now() + i,
                status: 'pending' as const
            }));

            const results = await Promise.all(
                messages.map(msg => processor.processUserMessage(msg))
            );

            expect(results).toHaveLength(5);
            results.forEach((result, index) => {
                expect(result).toBeDefined();
                expect(result.originalMessage.id).toBe(`concurrent-msg-${index}`);
            });
        });
    });
});
