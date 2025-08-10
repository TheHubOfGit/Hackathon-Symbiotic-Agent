// functions/src/models/types.ts
export interface User {
    id: string;
    name: string;
    email: string;
    skills: string[];
    experience: string;
    availableHours: number;
    status: 'active' | 'inactive' | 'blocked';
    joinedAt: number;
    lastActivity?: number;
}

export interface Task {
    id: string;
    name: string;
    description: string;
    assignedTo: string[];
    skills: string[];
    dependencies: string[];
    estimatedHours: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    status: 'not_started' | 'in_progress' | 'blocked' | 'completed';
    progress: number;
    files?: string[];
    startedAt?: number;
    completedAt?: number;
}

export interface Roadmap {
    version: number;
    createdAt: number;
    lastUpdated: number;
    phases: Phase[];
    milestones: Milestone[];
    integrationPoints: IntegrationPoint[];
    riskMitigation: RiskMitigation;
}

export interface Phase {
    id: string;
    name: string;
    duration: number;
    tasks: Task[];
    startTime?: number;
    endTime?: number;
}

export interface Milestone {
    name: string;
    targetTime: string;
    criteria: string[];
    status?: 'pending' | 'completed' | 'overdue';
}

export interface IntegrationPoint {
    time: string;
    teams: string[];
    purpose: string;
}

export interface RiskMitigation {
    identifiedRisks: string[];
    bufferTime: number;
    contingencyPlans: string[];
}

export interface AgentMessage {
    type: string;
    source: string;
    target: string;
    payload: any;
    priority: number;
    timestamp: number;
    correlationId?: string;
}

export interface StrategicSummary {
    timestamp: number;
    analysis: string;
    recommendations: string[];
    risks: string[];
    opportunities: string[];
    resourceAllocation: any;
}

export interface ScanResult {
    scannerId: string;
    duration: number;
    findings: Finding[];
    metrics: any;
    recommendations: any[];
}

export interface Finding {
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    location: string;
    description: string;
    impact: string;
    suggestion: string;
    files?: string[];
}

export interface Notification {
    id: string;
    userId: string;
    type: string;
    message: string;
    data?: any;
    read: boolean;
    timestamp: number;
}
