// dashboard/src/components/ScannerControl.tsx
import React, { useEffect, useState } from 'react';
import { firebaseFunctions } from '../utils/firebaseFunctions';

interface ScannerControlProps {
    projectId: string;
    userId: string;
}

export const ScannerControl: React.FC<ScannerControlProps> = ({ projectId, userId }) => {
    const [scannerStatus, setScannerStatus] = useState<any>(null);
    const [scanResults, setScanResults] = useState<any>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isLoadingResults, setIsLoadingResults] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanType, setScanType] = useState<string>('medium');
    const [repoUrl, setRepoUrl] = useState<string>('');

    const fetchScannerStatus = async () => {
        const fetchTime = new Date().toISOString();
        console.log(`🔍 [${fetchTime}] SCANNERCONTROL: Starting fetchScannerStatus`);

        setIsLoadingStatus(true);
        setError(null);

        try {
            console.log(`📡 [${fetchTime}] SCANNERCONTROL: Calling getScannerStatus`);
            const status = await firebaseFunctions.getScannerStatus();

            console.log(`✅ [${fetchTime}] SCANNERCONTROL: Scanner status received:`, {
                agentManagerInitialized: status?.agentManagerStatus?.initialized,
                totalAgents: status?.agentManagerStatus?.agents ? Object.keys(status.agentManagerStatus.agents).length : 0,
                scannerManagerFound: status?.scannerDetails?.available
            });

            setScannerStatus(status);
        } catch (err) {
            const errorTime = new Date().toISOString();
            console.error(`❌ [${errorTime}] SCANNERCONTROL: Error fetching scanner status:`, err);
            setError(err instanceof Error ? err.message : 'Failed to get scanner status');
        } finally {
            setIsLoadingStatus(false);
        }
    };

    const triggerScan = async () => {
        const scanTime = new Date().toISOString();
        console.log(`🚀 [${scanTime}] SCANNERCONTROL: Starting triggerScan`, {
            projectId,
            scanType,
            repoUrl: repoUrl || 'none'
        });

        setIsScanning(true);
        setError(null);

        try {
            console.log(`📡 [${scanTime}] SCANNERCONTROL: Calling triggerRepositoryScan`);
            const result = await firebaseFunctions.triggerRepositoryScan(
                projectId,
                scanType,
                repoUrl || undefined
            );

            console.log(`✅ [${scanTime}] SCANNERCONTROL: Scan triggered:`, {
                scanTriggered: result?.scanTriggered,
                hasResult: !!result?.scanResult,
                scanType: result?.scanType
            });

            // Refresh status and results after scan
            await fetchScannerStatus();
            await fetchScanResults();

        } catch (err) {
            const errorTime = new Date().toISOString();
            console.error(`❌ [${errorTime}] SCANNERCONTROL: Error triggering scan:`, err);
            setError(err instanceof Error ? err.message : 'Failed to trigger scan');
        } finally {
            setIsScanning(false);
        }
    };

    const fetchScanResults = async () => {
        const fetchTime = new Date().toISOString();
        console.log(`📊 [${fetchTime}] SCANNERCONTROL: Starting fetchScanResults for project:`, projectId);

        setIsLoadingResults(true);
        setError(null);

        try {
            console.log(`📡 [${fetchTime}] SCANNERCONTROL: Calling getScanResults`);
            const results = await firebaseFunctions.getScanResults(projectId);

            console.log(`✅ [${fetchTime}] SCANNERCONTROL: Scan results received:`, {
                resultsFound: results?.totalResults || 0,
                projectId: results?.projectId
            });

            setScanResults(results);
        } catch (err) {
            const errorTime = new Date().toISOString();
            console.error(`❌ [${errorTime}] SCANNERCONTROL: Error fetching scan results:`, err);
            setError(err instanceof Error ? err.message : 'Failed to get scan results');
        } finally {
            setIsLoadingResults(false);
        }
    };

    useEffect(() => {
        const componentStartTime = new Date().toISOString();
        console.log(`🏗️ [${componentStartTime}] SCANNERCONTROL: Component mounted`, {
            projectId,
            userId
        });

        fetchScannerStatus();
        fetchScanResults();
    }, [projectId, userId]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">🔍 AI Scanner Control Panel</h2>
                <p className="text-gray-600">Monitor and control the AI repository scanners that analyze your code and provide insights.</p>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">⚠️ {error}</p>
                </div>
            )}

            {/* Scanner Status */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">🤖 Scanner Status</h3>
                    <button
                        onClick={fetchScannerStatus}
                        disabled={isLoadingStatus}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isLoadingStatus ? '🔄 Refreshing...' : '🔄 Refresh Status'}
                    </button>
                </div>

                {isLoadingStatus ? (
                    <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-600 mt-2">Loading scanner status...</p>
                    </div>
                ) : scannerStatus ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-medium text-gray-900">Agent Manager</h4>
                                <p className={`text-sm ${scannerStatus.agentManagerStatus?.initialized ? 'text-green-600' : 'text-red-600'}`}>
                                    {scannerStatus.agentManagerStatus?.initialized ? '✅ Initialized' : '❌ Not Initialized'}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Total Agents: {scannerStatus.agentManagerStatus?.agents ? Object.keys(scannerStatus.agentManagerStatus.agents).length : 0}
                                </p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-medium text-gray-900">Scanner Manager</h4>
                                <p className={`text-sm ${scannerStatus.scannerDetails?.available ? 'text-green-600' : 'text-red-600'}`}>
                                    {scannerStatus.scannerDetails?.available ? '✅ Available' : '❌ Not Available'}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Type: {scannerStatus.scannerDetails?.type || 'Unknown'}
                                </p>
                            </div>
                        </div>

                        {scannerStatus.agentManagerStatus?.agents && (
                            <div className="mt-4">
                                <h4 className="font-medium text-gray-900 mb-2">Active Agents:</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {Object.entries(scannerStatus.agentManagerStatus.agents).map(([id, agent]: [string, any]) => (
                                        <div key={id} className="bg-blue-50 px-3 py-2 rounded text-sm">
                                            <div className="font-medium text-blue-900">{id}</div>
                                            <div className="text-blue-600">{agent.type}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-gray-600">No scanner status available</p>
                )}
            </div>

            {/* Scan Trigger */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Trigger Repository Scan</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Scan Type</label>
                        <select
                            value={scanType}
                            onChange={(e) => setScanType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="shallow">🔍 Shallow - Quick overview</option>
                            <option value="medium">🔎 Medium - Standard analysis</option>
                            <option value="deep">🔍 Deep - Detailed analysis</option>
                            <option value="maximum">🔬 Maximum - Full analysis</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Repository URL (Optional)</label>
                        <input
                            type="text"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            placeholder="https://github.com/username/repository"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <button
                        onClick={triggerScan}
                        disabled={isScanning || !scannerStatus?.scannerDetails?.available}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isScanning ? '🔄 Scanning...' : '🚀 Start Scan'}
                    </button>
                </div>
            </div>

            {/* Scan Results */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">📊 Scan Results</h3>
                    <button
                        onClick={fetchScanResults}
                        disabled={isLoadingResults}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isLoadingResults ? '🔄 Loading...' : '🔄 Refresh Results'}
                    </button>
                </div>

                {isLoadingResults ? (
                    <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-600 mt-2">Loading scan results...</p>
                    </div>
                ) : scanResults && scanResults.scanResults && scanResults.scanResults.length > 0 ? (
                    <div className="space-y-4">
                        {scanResults.scanResults.map((result: any, index: number) => (
                            <div key={result.id || index} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-gray-900">Scan #{index + 1}</h4>
                                    <span className="text-sm text-gray-600">
                                        {new Date(result.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-gray-600">No scan results found</p>
                        <p className="text-sm text-gray-500 mt-2">Trigger a scan to see results here</p>
                    </div>
                )}
            </div>
        </div>
    );
};
