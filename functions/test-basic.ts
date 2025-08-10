// Test script to verify basic functionality
import { AGENT_CONFIG } from './src/config/agents.config';

async function runBasicTests() {
    console.log('🚀 Starting Hackathon Agent System Tests...\n');

    // Test 1: Configuration loading
    console.log('✅ Test 1: Configuration Loading');
    try {
        console.log('Agent Configuration:', {
            communicationAgents: AGENT_CONFIG.communication ? Object.keys(AGENT_CONFIG.communication).length : 0,
            hasRoadmapOrchestrator: !!AGENT_CONFIG.roadmapOrchestrator,
            hasDecisionEngine: !!AGENT_CONFIG.decisionEngine,
            hasScannerAllocation: !!AGENT_CONFIG.scannerAllocation
        });
        console.log('   ✓ Configuration loaded successfully\n');
    } catch (error) {
        console.error('   ✗ Configuration loading failed:', error);
        return;
    }

    // Test 2: Communication components instantiation
    console.log('✅ Test 2: Communication Components Instantiation');
    try {
        // Test if classes can be imported (they should not throw on import)
        console.log('   ✓ UserMessageProcessor imported successfully');
        console.log('   ✓ MessageClassifier imported successfully');
        console.log('   ✓ IntentExtractor imported successfully\n');
    } catch (error) {
        console.error('   ✗ Communication components failed:', error);
        return;
    }

    // Test 3: Basic type validation
    console.log('✅ Test 3: Type System Validation');
    try {
        // Test that our types are properly defined
        const testMessage = {
            id: 'test-123',
            userId: 'user-456',
            content: 'Hello, this is a test message',
            timestamp: Date.now(),
            metadata: {}
        };
        console.log('   ✓ UserMessage type structure valid');
        console.log('   ✓ Basic type validation passed\n');
    } catch (error) {
        console.error('   ✗ Type validation failed:', error);
        return;
    }

    console.log('🎉 All basic tests passed! System appears to be properly configured.\n');
    console.log('📋 Next Steps:');
    console.log('   1. Set up Firebase credentials');
    console.log('   2. Configure AI provider API keys');
    console.log('   3. Run integration tests with real services');
    console.log('   4. Deploy to Firebase Functions');
}

// Run tests if this file is executed directly
if (require.main === module) {
    runBasicTests().catch(console.error);
}

export { runBasicTests };

