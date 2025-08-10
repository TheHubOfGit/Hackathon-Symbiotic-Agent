export declare const AGENT_CONFIG: {
    communication: {
        gpt5mini: {
            instances: number;
            model: string;
            maxConcurrent: number;
            timeout: number;
            retries: number;
            maxTokens: number;
            temperature: number;
        };
        loadBalancing: {
            strategy: string;
            healthCheckInterval: number;
            failoverEnabled: boolean;
            queueMaxSize: number;
        };
        websocket: {
            maxConnections: number;
            pingInterval: number;
            pingTimeout: number;
        };
    };
    decisionEngine: {
        model: string;
        userFeedbackWeight: number;
        continuousMonitoringInterval: number;
        decisionCacheTime: number;
        maxTokens: number;
        temperature: number;
    };
    scannerAllocation: {
        minScanners: number;
        maxScanners: number;
        allocationStrategy: string;
        modes: {
            minimal: {
                scanners: number;
                focus: string;
            };
            targeted: {
                scanners: number;
                focus: string;
            };
            comprehensive: {
                scanners: number;
                focus: string;
            };
            deep_dive: {
                scanners: number;
                focus: string;
            };
        };
    };
    roadmapOrchestrator: {
        model: string;
        updateInterval: number;
        maxTokens: number;
        adaptiveThreshold: number;
    };
};
