hackathon-agent-system/
├── functions/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── roadmapOrchestrator.ts
│   │   │   ├── repositoryScanner.ts
│   │   │   ├── repositoryScannerManager.ts
│   │   │   ├── userCompiler.ts
│   │   │   ├── progressCoordinator.ts
│   │   │   ├── decisionEngine.ts
│   │   │   ├── codeExtractor.ts
│   │   │   ├── editCoordinator.ts
│   │   │   └── communication/
│   │   │       ├── userMessageProcessor.ts
│   │   │       ├── messageClassifier.ts
│   │   │       └── intentExtractor.ts
│   │   ├── core/
│   │   │   ├── agentManager.ts
│   │   │   ├── messageRouter.ts
│   │   │   ├── healthMonitor.ts
│   │   │   ├── tokenManager.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── userCommunicationHub.ts
│   │   ├── services/
│   │   │   ├── aiProviders.ts
│   │   │   ├── gitService.ts
│   │   │   ├── codeAnalyzer.ts
│   │   │   ├── cacheService.ts
│   │   │   └── realtimeChat.ts
│   │   ├── models/
│   │   │   ├── types.ts
│   │   │   ├── schemas.ts
│   │   │   ├── constants.ts
│   │   │   └── communication.types.ts
│   │   ├── api/
│   │   │   ├── userEndpoints.ts
│   │   │   ├── adminEndpoints.ts
│   │   │   ├── webhooks.ts
│   │   │   └── chatEndpoints.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── priorityQueue.ts
│   │   │   └── helpers.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── dashboard/
│   └── src/
│       └── components/
│           ├── ChatInterface.tsx
│           ├── ProgressMap.tsx
│           └── CommunicationMetrics.tsx
└── firebase.json