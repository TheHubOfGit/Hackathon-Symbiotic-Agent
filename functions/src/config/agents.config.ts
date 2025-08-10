// functions/src/config/agents.config.ts
export const AGENT_CONFIG = {
    communication: {
        gpt5mini: {
            instances: 2,
            model: 'gpt-5-mini',
            maxConcurrent: 5,
            timeout: 30000,
            retries: 3,
            maxTokens: 500,
            temperature: 0.3
        },
        loadBalancing: {
            strategy: 'round-robin',
            healthCheckInterval: 60000,
            failoverEnabled: true,
            queueMaxSize: 100
        },
        websocket: {
            maxConnections: 1000,
            pingInterval: 30000,
            pingTimeout: 5000
        }
    },
    decisionEngine: {
        model: 'o4-mini',
        userFeedbackWeight: 0.3,
        continuousMonitoringInterval: 10000,
        decisionCacheTime: 300000,
        maxTokens: 10000,
        temperature: 0.3
    },
    scannerAllocation: {
        minScanners: 1,
        maxScanners: 8,
        allocationStrategy: 'dynamic',
        modes: {
            minimal: { scanners: 1, focus: 'core' },
            targeted: { scanners: 2 - 3, focus: 'specific' },
            comprehensive: { scanners: 4 - 5, focus: 'broad' },
            deep_dive: { scanners: 6 - 8, focus: 'intensive' }
        }
    },
    roadmapOrchestrator: {
        model: 'gemini-2.5-pro',
        updateInterval: 300000, // 5 minutes
        maxTokens: 2000,
        adaptiveThreshold: 0.7
    }
};
