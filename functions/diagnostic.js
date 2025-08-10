// Diagnostic script to check file imports
const path = require('path');

async function checkImports() {
    const filesToCheck = [
        './lib/agents/communication/messageClassifier.js',
        './lib/agents/communication/intentExtractor.js',
        './lib/core/agentManager.js',
        './lib/core/messageRouter.js',
        './lib/core/healthMonitor.js',
        './lib/agents/roadmapOrchestrator.js',
        './lib/agents/repositoryScanner.js',
        './lib/agents/decisionEngine.js',
        './lib/api/userEndpoints.js',
        './lib/api/adminEndpoints.js',
        './lib/api/webhooks.js',
        './lib/api/chatEndpoints.js'
    ];

    console.log('Checking compiled file imports...\n');

    for (const file of filesToCheck) {
        try {
            console.log(`Checking: ${file}`);
            const mod = require(file);
            console.log(`✅ SUCCESS: ${file} - exports:`, Object.keys(mod));
            console.log('');
        } catch (error) {
            console.log(`❌ FAILED: ${file}`);
            console.log(`Error: ${error.message}`);
            console.log('');
        }
    }
}

checkImports().catch(console.error);
