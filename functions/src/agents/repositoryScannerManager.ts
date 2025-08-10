// functions/src/agents/repositoryScannerManager.ts
import { Firestore } from '@google-cloud/firestore';
import { MessageRouter } from '../core/messageRouter';
import { Logger } from '../utils/logger';
import { RepositoryScanner } from './repositoryScanner';

export class RepositoryScannerManager {
    private scanners: Map<string, RepositoryScanner> = new Map();
    private activeScanners: number = 1; // Always at least 1 active
    private maxScanners: number = 8;
    private scannerModes: Map<string, string> = new Map();

    constructor(
        private db: Firestore,
        private messageRouter: MessageRouter,
        private logger: Logger
    ) {
        this.initialize();
    }

    private initialize() {
        this.logger.info('Initializing Repository Scanner Manager');

        // Create core scanner (always active)
        this.createScanner('core', 'continuous');

        // Setup message handlers
        this.setupMessageHandlers();
    }

    private setupMessageHandlers() {
        // Listen for scanner allocation requests from O4-Mini
        this.messageRouter.on('SCANNER_ALLOCATION', async (message) => {
            await this.handleScannerAllocation(message.payload);
        });

        // Listen for targeted scan requests
        this.messageRouter.on('TARGETED_SCAN', async (message) => {
            await this.handleTargetedScan(message.payload);
        });
    }

    private async handleScannerAllocation(payload: any) {
        const { requestedScanners, mode, focusAreas, priority } = payload;

        this.logger.info(`O4-Mini requested ${requestedScanners} scanners in ${mode} mode`);

        // Adjust scanner count
        await this.adjustScannerCount(requestedScanners);

        // Set scanner modes and focus areas
        await this.configureScanners(mode, focusAreas);

        // Execute scanning based on mode
        await this.executeScanningStrategy(mode, focusAreas, priority);
    }

    private async adjustScannerCount(requested: number) {
        const current = this.scanners.size;

        if (requested > current) {
            // Spawn additional scanners
            for (let i = current; i < Math.min(requested, this.maxScanners); i++) {
                this.createScanner(`scanner_${i}`, 'targeted');
            }
        } else if (requested < current && current > 1) {
            // Deactivate excess scanners (keep core scanner)
            const toRemove = current - requested;
            const scannerIds = Array.from(this.scanners.keys()).filter(id => id !== 'core');

            for (let i = 0; i < toRemove && i < scannerIds.length; i++) {
                const scannerId = scannerIds[i];
                if (scannerId) {
                    await this.deactivateScanner(scannerId);
                }
            }
        }

        this.activeScanners = this.scanners.size;
    }

    private createScanner(id: string, mode: string) {
        const scanner = new RepositoryScanner(
            id,
            this.db,
            this.messageRouter,
            this.logger
        );

        this.scanners.set(id, scanner);
        this.scannerModes.set(id, mode);

        this.logger.info(`Created scanner ${id} in ${mode} mode`);
    }
    private async deactivateScanner(id: string) {
        const scanner = this.scanners.get(id);
        if (scanner) {
            await scanner.cleanup();
            this.scanners.delete(id);
            this.scannerModes.delete(id);
            this.logger.info(`Deactivated scanner ${id}`);
        }
    }

    private async configureScanners(mode: string, focusAreas: string[]) {
        let scannerIndex = 0;

        for (const [id, scanner] of this.scanners) {
            if (id === 'core') {
                // Core scanner maintains continuous monitoring
                await scanner.setMode('continuous');
            } else {
                // Assign focus areas to other scanners
                const focusArea = focusAreas[scannerIndex % focusAreas.length];
                await scanner.setMode(mode);
                if (focusArea) {
                    await scanner.setFocusArea(focusArea);
                }
                scannerIndex++;
            }
        }
    }

    private async executeScanningStrategy(mode: string, focusAreas: string[], priority: string) {
        switch (mode) {
            case 'minimal':
                await this.executeMinimalScan();
                break;
            case 'targeted':
                await this.executeTargetedScan(focusAreas);
                break;
            case 'comprehensive':
                await this.executeComprehensiveScan();
                break;
            case 'deep_dive':
                await this.executeDeepDiveScan(focusAreas);
                break;
            default:
                await this.executeContinuousScan();
        }
    }

    private async executeMinimalScan() {
        const coreScanner = this.scanners.get('core');
        if (coreScanner) {
            await coreScanner.performScan({
                depth: 'shallow',
                focus: 'changes_only',
                includeMetrics: false
            });
        }
    }

    private async executeTargetedScan(focusAreas: string[]) {
        const promises = [];

        for (const [id, scanner] of this.scanners) {
            const focusArea = focusAreas.shift() || 'general';
            promises.push(scanner.performScan({
                depth: 'medium',
                focus: focusArea,
                includeMetrics: true,
                analyzeDependencies: true
            }));
        }

        await Promise.all(promises);
    }

    private async executeComprehensiveScan() {
        const areas = ['security', 'performance', 'architecture', 'dependencies', 'quality'];
        const promises = [];

        let areaIndex = 0;
        for (const [id, scanner] of this.scanners) {
            const area = areas[areaIndex % areas.length];
            promises.push(scanner.performScan({
                depth: 'deep',
                focus: area,
                includeMetrics: true,
                analyzeDependencies: true,
                detectPatterns: true
            }));
            areaIndex++;
        }

        await Promise.all(promises);
    }

    private async executeDeepDiveScan(focusAreas: string[]) {
        // All scanners focus on critical areas with maximum depth
        const promises = [];

        for (const [id, scanner] of this.scanners) {
            promises.push(scanner.performScan({
                depth: 'maximum',
                focus: focusAreas,
                includeMetrics: true,
                analyzeDependencies: true,
                detectPatterns: true,
                vulnerabilityAnalysis: true,
                performanceProfile: true,
                architectureReview: true
            }));
        }

        const results = await Promise.all(promises);
        await this.aggregateAndReportResults(results);
    }

    private async executeContinuousScan() {
        const coreScanner = this.scanners.get('core');
        if (coreScanner) {
            await coreScanner.performScan({
                depth: 'medium',
                focus: 'incremental',
                includeMetrics: true
            });
        }
    }

    private async handleTargetedScan(payload: any) {
        const { target, reason, requester } = payload;

        // Find available scanner or create new one
        const scanner = this.getAvailableScanner() || await this.createTemporaryScanner();

        const result = await scanner.performTargetedScan(target);

        // Report results back to requester
        await this.messageRouter.sendMessage({
            type: 'SCAN_RESULT',
            source: 'repository_scanner_manager',
            target: requester,
            payload: result,
            priority: 2,
            timestamp: Date.now()
        });
    }

    private getAvailableScanner(): RepositoryScanner | null {
        for (const [id, scanner] of this.scanners) {
            if (!scanner.isBusy() && id !== 'core') {
                return scanner;
            }
        }
        return null;
    }

    private async createTemporaryScanner(): Promise<RepositoryScanner> {
        const id = `temp_${Date.now()}`;
        this.createScanner(id, 'targeted');

        // Schedule cleanup after use
        setTimeout(() => this.deactivateScanner(id), 300000); // 5 minutes

        return this.scanners.get(id)!;
    }

    private async aggregateAndReportResults(results: any[]) {
        const aggregated = {
            timestamp: Date.now(),
            scannerCount: results.length,
            findings: this.mergeFindings(results),
            metrics: this.aggregateMetrics(results),
            recommendations: this.consolidateRecommendations(results)
        };

        // Send to Progress Coordinator
        await this.messageRouter.sendMessage({
            type: 'REPOSITORY_ANALYSIS',
            source: 'repository_scanner_manager',
            target: 'progress_coordinator',
            payload: aggregated,
            priority: 2,
            timestamp: Date.now()
        });

        // Send summary to Decision Engine
        await this.messageRouter.sendMessage({
            type: 'SCAN_SUMMARY',
            source: 'repository_scanner_manager',
            target: 'decision_engine',
            payload: {
                criticalFindings: aggregated.findings.filter((f: any) => f.severity === 'critical'),
                overallHealth: this.calculateOverallHealth(aggregated.metrics)
            },
            priority: 1,
            timestamp: Date.now()
        });
    }

    private mergeFindings(results: any[]): any[] {
        const findings: any[] = [];
        const seen = new Set();

        for (const result of results) {
            if (result.findings) {
                for (const finding of result.findings) {
                    const key = `${finding.type}_${finding.location}`;
                    if (!seen.has(key)) {
                        findings.push(finding);
                        seen.add(key);
                    }
                }
            }
        }

        return findings;
    }

    private aggregateMetrics(results: any[]): any {
        const metrics: any = {
            totalFiles: 0,
            totalLines: 0,
            complexity: [],
            coverage: [],
            performance: []
        };

        for (const result of results) {
            if (result.metrics) {
                metrics.totalFiles += result.metrics.files || 0;
                metrics.totalLines += result.metrics.lines || 0;
                if (result.metrics.complexity) metrics.complexity.push(result.metrics.complexity);
                if (result.metrics.coverage) metrics.coverage.push(result.metrics.coverage);
                if (result.metrics.performance) metrics.performance.push(result.metrics.performance);
            }
        }

        // Calculate averages
        metrics.avgComplexity = metrics.complexity.length > 0
            ? metrics.complexity.reduce((a: number, b: number) => a + b, 0) / metrics.complexity.length
            : 0;

        return metrics;
    }

    private consolidateRecommendations(results: any[]): any[] {
        const recommendations: any[] = [];
        const priorityMap = new Map();

        for (const result of results) {
            if (result.recommendations) {
                for (const rec of result.recommendations) {
                    const existing = priorityMap.get(rec.type);
                    if (!existing || rec.priority > existing.priority) {
                        priorityMap.set(rec.type, rec);
                    }
                }
            }
        }

        return Array.from(priorityMap.values());
    }

    private calculateOverallHealth(metrics: any): number {
        // Simple health score calculation (0-100)
        let score = 100;

        if (metrics.avgComplexity > 10) score -= 20;
        if (metrics.avgComplexity > 20) score -= 20;
        if (metrics.coverage && metrics.coverage[0] < 80) score -= 15;
        if (metrics.performance && metrics.performance[0] > 1000) score -= 10;

        return Math.max(0, score);
    }

    async getStatus() {
        return {
            activeScanners: this.scanners.size,
            scannerStatus: Array.from(this.scanners.entries()).map(([id, scanner]) => ({
                id,
                mode: this.scannerModes.get(id),
                isBusy: scanner.isBusy()
            }))
        };
    }
}
