// Test file for system verification
import { AGENT_CONFIG } from '../config/agents.config';
import { Logger } from '../utils/logger';
import { PriorityQueue } from '../utils/priorityQueue';

describe('Hackathon Agent System', () => {
    describe('Configuration', () => {
        it('should have valid agent configuration', () => {
            expect(AGENT_CONFIG).toBeDefined();
            expect(AGENT_CONFIG.communication).toBeDefined();
            expect(AGENT_CONFIG.decisionEngine).toBeDefined();
            expect(AGENT_CONFIG.scannerAllocation).toBeDefined();
            expect(AGENT_CONFIG.roadmapOrchestrator).toBeDefined();
        });
    });

    describe('Utils', () => {
        it('PriorityQueue should work correctly', () => {
            const queue = new PriorityQueue<string>();
            queue.enqueue('item1', 1);
            queue.enqueue('item2', 3);
            queue.enqueue('item3', 2);

            expect(queue.dequeue()).toBe('item2'); // highest priority (3)
            expect(queue.size()).toBe(2);
        });

        it('Logger should initialize correctly', () => {
            const logger = new Logger('test');
            expect(logger).toBeDefined();
            // Just test that methods exist without actual output
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.error).toBe('function');
        });
    });

    describe('Communication Components', () => {
        it('should be able to import communication types', async () => {
            const communicationTypes = await import('../models/communication.types');
            expect(communicationTypes).toBeDefined();
        });

        it('should be able to import UserMessageProcessor', async () => {
            const { UserMessageProcessor } = await import('../agents/communication/userMessageProcessor');
            expect(UserMessageProcessor).toBeDefined();
        });

        it('should be able to import MessageClassifier', async () => {
            try {
                const { MessageClassifier } = await import('../agents/communication/messageClassifier');
                expect(MessageClassifier).toBeDefined();
                expect(typeof MessageClassifier).toBe('function');
            } catch (error) {
                console.error('MessageClassifier import error:', error);
                throw error;
            }
        });

        it('should be able to import IntentExtractor', async () => {
            try {
                const { IntentExtractor } = await import('../agents/communication/intentExtractor');
                expect(IntentExtractor).toBeDefined();
                expect(typeof IntentExtractor).toBe('function');
            } catch (error) {
                console.error('IntentExtractor import error:', error);
                throw error;
            }
        });
    });

    describe('Core Components', () => {
        it('should be able to import AgentManager', async () => {
            try {
                const { AgentManager } = await import('../core/agentManager');
                expect(AgentManager).toBeDefined();
                expect(typeof AgentManager).toBe('function');
            } catch (error) {
                console.error('AgentManager import error:', error);
                throw error;
            }
        });

        it('should be able to import MessageRouter', async () => {
            try {
                const { MessageRouter } = await import('../core/messageRouter');
                expect(MessageRouter).toBeDefined();
                expect(typeof MessageRouter).toBe('function');
            } catch (error) {
                console.error('MessageRouter import error:', error);
                throw error;
            }
        });

        it('should be able to import HealthMonitor', async () => {
            try {
                const { HealthMonitor } = await import('../core/healthMonitor');
                expect(HealthMonitor).toBeDefined();
                expect(typeof HealthMonitor).toBe('function');
            } catch (error) {
                console.error('HealthMonitor import error:', error);
                throw error;
            }
        });
    });

    describe('Agent Components', () => {
        it('should be able to import RoadmapOrchestrator', async () => {
            try {
                const { RoadmapOrchestrator } = await import('../agents/roadmapOrchestrator');
                expect(RoadmapOrchestrator).toBeDefined();
                expect(typeof RoadmapOrchestrator).toBe('function');
            } catch (error) {
                console.error('RoadmapOrchestrator import error:', error);
                throw error;
            }
        });

        it('should be able to import RepositoryScanner', async () => {
            try {
                const { RepositoryScanner } = await import('../agents/repositoryScanner');
                expect(RepositoryScanner).toBeDefined();
                expect(typeof RepositoryScanner).toBe('function');
            } catch (error) {
                console.error('RepositoryScanner import error:', error);
                throw error;
            }
        });

        it('should be able to import DecisionEngine', async () => {
            try {
                const { DecisionEngine } = await import('../agents/decisionEngine');
                expect(DecisionEngine).toBeDefined();
                expect(typeof DecisionEngine).toBe('function');
            } catch (error) {
                console.error('DecisionEngine import error:', error);
                throw error;
            }
        });
    });

    describe('API Endpoints', () => {
        it('should be able to import API endpoints', async () => {
            try {
                const userEndpoints = await import('../api/userEndpoints');
                const adminEndpoints = await import('../api/adminEndpoints');
                const webhooks = await import('../api/webhooks');
                const chatEndpoints = await import('../api/chatEndpoints');

                expect(userEndpoints).toBeDefined();
                expect(adminEndpoints).toBeDefined();
                expect(webhooks).toBeDefined();
                expect(chatEndpoints).toBeDefined();
            } catch (error) {
                console.error('API endpoints import error:', error);
                throw error;
            }
        });
    });
});
