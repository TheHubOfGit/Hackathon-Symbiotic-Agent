// dashboard/src/components/ProgressMap.tsx
import React, { useEffect, useState } from 'react';
import { firebaseFunctions } from '../utils/firebaseFunctions';

interface Milestone {
    id: string;
    title?: string;
    name?: string;
    description?: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'pending' | 'in-progress';
    assignee?: string;
    dueDate?: number;
    estimatedHours?: number;
    actualHours?: number;
    dependencies?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface TeamMember {
    id: string;
    name: string;
    skills: string[];
    currentTasks: string[];
    workload: number; // 0-100%
    status: 'available' | 'busy' | 'offline';
}

interface RoadmapData {
    phases: Array<{
        name: string;
        duration?: number;
        tasks: Milestone[];
    }>;
    teamMembers: TeamMember[];
    lastUpdated: number;
    aiRecommendations?: string[];
}

interface ProgressMapProps {
    projectId: string;
    userId: string;
}

export const ProgressMap: React.FC<ProgressMapProps> = ({ projectId, userId }) => {
    const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // const [socket, setSocket] = useState<Socket | null>(null); // Disabled for Firebase Functions
    const [error, setError] = useState<string | null>(null);
    const [nextRefreshIn, setNextRefreshIn] = useState<number>(0); // seconds until next refresh

    // Connect to your real backend system
    useEffect(() => {
        const fetchRoadmapData = async () => {
            const fetchStartTime = new Date().toISOString();
            console.log(`🚀 [${fetchStartTime}] PROGRESSMAP: Starting fetchRoadmapData`, {
                projectId,
                userId,
                component: 'ProgressMap'
            });

            try {
                setIsLoading(true);
                setError(null);

                console.log(`📡 [${fetchStartTime}] PROGRESSMAP: About to call firebaseFunctions.getRoadmap`);

                // Fetch current roadmap using Firebase Functions
                const data = await firebaseFunctions.getRoadmap(projectId);

                console.log(`✅ [${fetchStartTime}] PROGRESSMAP: Successfully received roadmap data:`, {
                    phases: data?.phases?.length || 0,
                    teamMembers: data?.teamMembers?.length || 0,
                    lastUpdated: data?.lastUpdated,
                    aiRecommendations: data?.aiRecommendations?.length || 0,
                    dataSize: JSON.stringify(data).length + ' bytes'
                });

                setRoadmapData(data);

            } catch (err) {
                const errorTime = new Date().toISOString();
                console.error(`❌ [${errorTime}] PROGRESSMAP: Error fetching roadmap:`, {
                    error: err instanceof Error ? err.message : String(err),
                    errorStack: err instanceof Error ? err.stack : 'No stack',
                    projectId,
                    userId
                });

                setError(err instanceof Error ? err.message : 'Failed to load roadmap');

                // Fallback to mock data if backend is not available
                console.log(`🔄 [${errorTime}] PROGRESSMAP: Using mock roadmap data as fallback`);
                setRoadmapData(getMockRoadmapData());

                // Clear error after 3 seconds since we have fallback data
                setTimeout(() => setError(null), 3000);
            } finally {
                setIsLoading(false);
                const endTime = new Date().toISOString();
                console.log(`🏁 [${endTime}] PROGRESSMAP: fetchRoadmapData completed`);
            }
        };

        // Smart refresh strategy - reduce API calls
        const setupSmartRefresh = () => {
            const setupTime = new Date().toISOString();
            console.log(`🔄 [${setupTime}] PROGRESSMAP: Setting up smart roadmap refresh`, {
                projectId,
                userId,
                initialInterval: '2 minutes'
            });

            // Use exponential backoff for new projects with no activity
            // Start with 2 minutes, increase to 5 minutes if no changes detected
            let refreshInterval = 2 * 60 * 1000; // 2 minutes initially
            let lastDataHash = '';
            let consecutiveNoChanges = 0;
            let countdownInterval: NodeJS.Timeout;

            const updateCountdown = (totalSeconds: number) => {
                let remaining = Math.ceil(totalSeconds / 1000);
                setNextRefreshIn(remaining);

                console.log(`⏱️ PROGRESSMAP: Starting countdown from ${remaining} seconds`);

                countdownInterval = setInterval(() => {
                    remaining--;
                    setNextRefreshIn(remaining);
                    if (remaining <= 0) {
                        clearInterval(countdownInterval);
                        console.log(`⏰ PROGRESSMAP: Countdown completed`);
                    }
                }, 1000);
            };

            const scheduleNextRefresh = () => {
                const scheduleTime = new Date().toISOString();
                console.log(`📅 [${scheduleTime}] PROGRESSMAP: Scheduling next refresh`, {
                    intervalMs: refreshInterval,
                    intervalMinutes: Math.round(refreshInterval / 60000),
                    consecutiveNoChanges
                });

                updateCountdown(refreshInterval);

                setTimeout(async () => {
                    const refreshTime = new Date().toISOString();
                    console.log(`🔄 [${refreshTime}] PROGRESSMAP: Executing smart refresh`);

                    try {
                        // Only refresh if user is on the progress tab
                        if (document.visibilityState === 'hidden') {
                            console.log(`👁️ [${refreshTime}] PROGRESSMAP: Page hidden, skipping refresh`);
                            scheduleNextRefresh();
                            return;
                        }

                        console.log(`📡 [${refreshTime}] PROGRESSMAP: Making smart refresh API call`);
                        const data = await firebaseFunctions.getRoadmap(projectId);

                        const currentDataHash = JSON.stringify(data.phases?.map((p: any) => ({
                            id: p.id,
                            status: p.status,
                            progress: p.progress
                        })));

                        console.log(`🔍 [${refreshTime}] PROGRESSMAP: Data comparison`, {
                            currentHashLength: currentDataHash.length,
                            lastHashLength: lastDataHash.length,
                            hashesMatch: currentDataHash === lastDataHash,
                            consecutiveNoChanges
                        });

                        // Check if data actually changed
                        if (currentDataHash === lastDataHash) {
                            consecutiveNoChanges++;
                            console.log(`📊 [${refreshTime}] PROGRESSMAP: No data changes detected`, {
                                consecutiveNoChanges,
                                willIncreaseInterval: consecutiveNoChanges >= 3
                            });

                            // Increase interval if no changes (max 5 minutes)
                            if (consecutiveNoChanges >= 3) {
                                const oldInterval = refreshInterval;
                                refreshInterval = Math.min(5 * 60 * 1000, refreshInterval * 1.5);
                                console.log(`⏰ [${refreshTime}] PROGRESSMAP: Increasing refresh interval`, {
                                    oldIntervalMinutes: Math.round(oldInterval / 60000),
                                    newIntervalMinutes: Math.round(refreshInterval / 60000)
                                });
                            }
                        } else {
                            // Data changed, reset to faster refresh
                            console.log(`🎉 [${refreshTime}] PROGRESSMAP: Data changes detected!`, {
                                oldConsecutiveNoChanges: consecutiveNoChanges,
                                oldIntervalMinutes: Math.round(refreshInterval / 60000)
                            });

                            consecutiveNoChanges = 0;
                            refreshInterval = 2 * 60 * 1000;
                            lastDataHash = currentDataHash;
                            setRoadmapData(data);

                            console.log(`✅ [${refreshTime}] PROGRESSMAP: Updated roadmap data with changes`);
                        }

                        console.log(`📝 [${refreshTime}] PROGRESSMAP: Next refresh scheduled`, {
                            intervalSeconds: refreshInterval / 1000,
                            intervalMinutes: Math.round(refreshInterval / 60000)
                        });

                        scheduleNextRefresh();
                    } catch (error) {
                        const errorTime = new Date().toISOString();
                        console.error(`💥 [${errorTime}] PROGRESSMAP: Smart refresh error:`, {
                            error: error instanceof Error ? error.message : String(error),
                            errorStack: error instanceof Error ? error.stack : 'No stack',
                            willRetryWithLongerInterval: true
                        });

                        // On error, retry with longer interval
                        refreshInterval = 5 * 60 * 1000;
                        scheduleNextRefresh();
                    }
                }, refreshInterval);
            };

            // Start the smart refresh cycle
            console.log(`🚀 [${setupTime}] PROGRESSMAP: Starting smart refresh cycle`);
            scheduleNextRefresh();

            // Return cleanup function
            return () => {
                const cleanupTime = new Date().toISOString();
                console.log(`🧹 [${cleanupTime}] PROGRESSMAP: Smart refresh cleanup started`);

                if (countdownInterval) {
                    clearInterval(countdownInterval);
                    console.log(`🧹 [${cleanupTime}] PROGRESSMAP: Cleared countdown interval`);
                }
                console.log(`🧹 [${cleanupTime}] PROGRESSMAP: Smart refresh cleanup completed`);
            };
        };

        const componentStartTime = new Date().toISOString();
        console.log(`🏗️ [${componentStartTime}] PROGRESSMAP: Component useEffect starting`, {
            projectId,
            userId,
            component: 'ProgressMap'
        });

        fetchRoadmapData();
        const cleanupRefresh = setupSmartRefresh();

        // Cleanup
        return () => {
            const cleanupTime = new Date().toISOString();
            console.log(`🧹 [${cleanupTime}] PROGRESSMAP: Component useEffect cleanup`, {
                projectId,
                userId
            });
            cleanupRefresh();
        };
    }, [projectId, userId]);

    // Fallback mock data for development/demo
    const getMockRoadmapData = (): RoadmapData => {
        return {
            phases: [
                {
                    name: "Setup & Planning",
                    duration: 6,
                    tasks: [
                        {
                            id: 'setup',
                            title: 'Project Setup',
                            description: 'Initialize repository, setup development environment',
                            status: 'completed',
                            assignee: 'alex-123',
                            estimatedHours: 4,
                            actualHours: 3,
                            dependencies: [],
                            priority: 'high'
                        },
                        {
                            id: 'design',
                            title: 'UI/UX Design',
                            description: 'Create wireframes, user flows, and high-fidelity designs',
                            status: 'completed',
                            assignee: 'jordan-789',
                            estimatedHours: 8,
                            actualHours: 6,
                            dependencies: ['setup'],
                            priority: 'high'
                        }
                    ]
                },
                {
                    name: "Development",
                    duration: 20,
                    tasks: [
                        {
                            id: 'backend',
                            title: 'Backend API',
                            description: 'Build REST API, database schema, authentication',
                            status: 'in_progress',
                            assignee: 'sam-456',
                            estimatedHours: 12,
                            actualHours: 8,
                            dependencies: ['setup'],
                            priority: 'critical'
                        },
                        {
                            id: 'frontend',
                            title: 'Frontend Development',
                            description: 'Implement React components, integrate with API',
                            status: 'in_progress',
                            assignee: 'alex-123',
                            estimatedHours: 16,
                            actualHours: 10,
                            dependencies: ['design', 'backend'],
                            priority: 'high'
                        }
                    ]
                }
            ],
            teamMembers: [
                {
                    id: 'alex-123',
                    name: 'Alex Johnson',
                    skills: ['React', 'TypeScript', 'Node.js'],
                    currentTasks: ['frontend'],
                    workload: 85,
                    status: 'busy'
                },
                {
                    id: 'sam-456',
                    name: 'Sam Chen',
                    skills: ['Python', 'PostgreSQL', 'AWS'],
                    currentTasks: ['backend'],
                    workload: 90,
                    status: 'busy'
                }
            ],
            lastUpdated: Date.now(),
            aiRecommendations: [
                "Consider parallelizing frontend and backend development",
                "Sam is at high workload - consider task redistribution"
            ]
        };
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading AI-generated roadmap...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-red-600 mb-2">⚠️ Backend Connection Failed</p>
                    <p className="text-gray-600 text-sm">Showing demo data - Connect backend for real AI coordination</p>
                </div>
            </div>
        );
    }

    if (!roadmapData) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-600">No roadmap data available</p>
            </div>
        );
    }

    const allTasks = roadmapData.phases?.flatMap(phase => phase.tasks || []) || [];
    const completedTasks = allTasks.filter(task => task.status === 'completed');
    const progress = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Header with Progress */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">AI-Powered Roadmap</h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Last updated: {new Date(roadmapData.lastUpdated).toLocaleTimeString()}</span>
                        {nextRefreshIn > 0 && (
                            <span className="flex items-center space-x-1 text-xs">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                <span>Next refresh: {Math.floor(nextRefreshIn / 60)}:{(nextRefreshIn % 60).toString().padStart(2, '0')}</span>
                            </span>
                        )}
                    </div>
                </div>

                <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Overall Progress</span>
                        <span>{progress.toFixed(0)}% Complete</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* AI Recommendations */}
                {roadmapData.aiRecommendations && roadmapData.aiRecommendations.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-blue-900 mb-2">🤖 AI Recommendations</h3>
                        <ul className="space-y-1">
                            {roadmapData.aiRecommendations.map((rec, index) => (
                                <li key={index} className="text-blue-800 text-sm">{rec}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Timeline View */}
            <div className="space-y-6">
                {roadmapData.phases?.map((phase, phaseIndex) => (
                    <div key={phaseIndex} className="bg-white rounded-lg p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">{phase.name}</h3>
                            <div className="flex items-center text-sm text-gray-600">
                                {phase.duration ? `${phase.duration}h estimated` : 'In Progress'}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {phase.tasks?.map((task) => (
                                <div
                                    key={task.id}
                                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-3 h-3 rounded-full ${task.status === 'completed' ? 'bg-green-500' :
                                                (task.status === 'in-progress' || task.status === 'in_progress') ? 'bg-blue-500' :
                                                    task.status === 'blocked' ? 'bg-red-500' : 'bg-gray-300'
                                                }`}></div>
                                            <div>
                                                <h4 className="font-medium text-gray-900">{(task as any).title || (task as any).name}</h4>
                                                <p className="text-sm text-gray-600">{(task as any).description || 'No description available'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.status === 'completed' ? 'text-green-600 bg-green-100' :
                                                (task.status === 'in-progress' || task.status === 'in_progress') ? 'text-blue-600 bg-blue-100' :
                                                    task.status === 'blocked' ? 'text-red-600 bg-red-100' :
                                                        'text-gray-600 bg-gray-100'
                                                }`}>
                                                {task.status.replace('_', ' ').replace('-', ' ')}
                                            </span>
                                            <span className={`text-xs font-medium ${task.priority === 'critical' ? 'text-red-600' :
                                                task.priority === 'high' ? 'text-orange-600' :
                                                    task.priority === 'medium' ? 'text-yellow-600' : 'text-gray-600'
                                                }`}>
                                                {task.priority || 'normal'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">Assignee:</span>
                                                <span className="ml-2 font-medium">
                                                    {task.assignee ?
                                                        roadmapData.teamMembers?.find(m => m.id === task.assignee)?.name || task.assignee
                                                        : 'Unassigned'
                                                    }
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Hours:</span>
                                                <span className="ml-2 font-medium">
                                                    {task.actualHours || 0} / {task.estimatedHours ? `${task.estimatedHours}h` : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
