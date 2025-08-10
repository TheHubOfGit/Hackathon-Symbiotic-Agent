// Quick verification of fixes
console.log('🔧 Testing All Component Imports...');

try {
    // Utils
    const { PriorityQueue } = require('./lib/utils/priorityQueue');
    console.log('PriorityQueue:', typeof PriorityQueue === 'function' ? '✅ PASSED' : '❌ FAILED');

    // Communication
    const { MessageClassifier } = require('./lib/agents/communication/messageClassifier');
    const { IntentExtractor } = require('./lib/agents/communication/intentExtractor');
    const { UserMessageProcessor } = require('./lib/agents/communication/userMessageProcessor');
    console.log('MessageClassifier:', typeof MessageClassifier === 'function' ? '✅ PASSED' : '❌ FAILED');
    console.log('IntentExtractor:', typeof IntentExtractor === 'function' ? '✅ PASSED' : '❌ FAILED');
    console.log('UserMessageProcessor:', typeof UserMessageProcessor === 'function' ? '✅ PASSED' : '❌ FAILED');

    // Core
    const { AgentManager } = require('./lib/core/agentManager');
    const { MessageRouter } = require('./lib/core/messageRouter');
    const { HealthMonitor } = require('./lib/core/healthMonitor');
    console.log('AgentManager:', typeof AgentManager === 'function' ? '✅ PASSED' : '❌ FAILED');
    console.log('MessageRouter:', typeof MessageRouter === 'function' ? '✅ PASSED' : '❌ FAILED');
    console.log('HealthMonitor:', typeof HealthMonitor === 'function' ? '✅ PASSED' : '❌ FAILED');

    // Agents
    const { RoadmapOrchestrator } = require('./lib/agents/roadmapOrchestrator');
    const { RepositoryScanner } = require('./lib/agents/repositoryScanner');
    const { DecisionEngine } = require('./lib/agents/decisionEngine');
    console.log('RoadmapOrchestrator:', typeof RoadmapOrchestrator === 'function' ? '✅ PASSED' : '❌ FAILED');
    console.log('RepositoryScanner:', typeof RepositoryScanner === 'function' ? '✅ PASSED' : '❌ FAILED');
    console.log('DecisionEngine:', typeof DecisionEngine === 'function' ? '✅ PASSED' : '❌ FAILED');

    console.log('\n🎉 All components imported successfully!');

} catch (error) {
    console.error('❌ Import test failed:', error.message);
}
