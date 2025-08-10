// dashboard/src/components/ProjectSetup.tsx
import { Code, Target } from 'lucide-react';
import React, { useState } from 'react';

interface ProjectGoal {
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ProjectSetupProps {
    onSetupComplete: (projectData: any) => void;
}

export const ProjectSetup: React.FC<ProjectSetupProps> = ({ onSetupComplete }) => {
    const [step, setStep] = useState(1);
    const [projectData, setProjectData] = useState({
        name: '',
        description: '',
        deadline: '',
        techStack: [] as string[],
        goals: [] as ProjectGoal[]
    });

    const [newGoal, setNewGoal] = useState({
        title: '',
        description: '',
        priority: 'medium' as const
    });

    const techOptions = [
        'React', 'TypeScript', 'Node.js', 'Python', 'Express', 'FastAPI',
        'MongoDB', 'PostgreSQL', 'Firebase', 'AWS', 'Docker', 'Kubernetes',
        'GraphQL', 'REST API', 'Socket.io', 'Redis', 'Tailwind CSS', 'Material-UI'
    ];

    const addGoal = () => {
        if (newGoal.title && newGoal.description) {
            setProjectData(prev => ({
                ...prev,
                goals: [...prev.goals, {
                    id: Date.now().toString(),
                    ...newGoal
                }]
            }));
            setNewGoal({ title: '', description: '', priority: 'medium' });
        }
    };

    const removeGoal = (goalId: string) => {
        setProjectData(prev => ({
            ...prev,
            goals: prev.goals.filter(g => g.id !== goalId)
        }));
    };

    const toggleTech = (tech: string) => {
        setProjectData(prev => ({
            ...prev,
            techStack: prev.techStack.includes(tech)
                ? prev.techStack.filter(t => t !== tech)
                : [...prev.techStack, tech]
        }));
    };

    const handleComplete = () => {
        onSetupComplete(projectData);
    };

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Setup</h2>
                <p className="text-gray-600">Define your project goals and tech stack for AI-powered coordination</p>

                {/* Step indicator */}
                <div className="flex items-center mt-6 space-x-4">
                    {[1, 2, 3].map((stepNum) => (
                        <div key={stepNum} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= stepNum ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                                }`}>
                                {stepNum}
                            </div>
                            {stepNum < 3 && <div className="w-8 h-0.5 bg-gray-200 ml-2"></div>}
                        </div>
                    ))}
                </div>
            </div>

            {step === 1 && (
                <div className="space-y-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <Target className="h-5 w-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold">Project Basics</h3>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Project Name *
                        </label>
                        <input
                            type="text"
                            value={projectData.name}
                            onChange={(e) => setProjectData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="My Awesome Hackathon Project"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Project Description *
                        </label>
                        <textarea
                            rows={4}
                            value={projectData.description}
                            onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Describe what you're building, the problem it solves, and your target users..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Deadline
                        </label>
                        <input
                            type="datetime-local"
                            value={projectData.deadline}
                            onChange={(e) => setProjectData(prev => ({ ...prev, deadline: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <button
                        onClick={() => setStep(2)}
                        disabled={!projectData.name || !projectData.description}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next: Tech Stack
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <Code className="h-5 w-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold">Technology Stack</h3>
                    </div>

                    <p className="text-gray-600">Select the technologies you plan to use:</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {techOptions.map(tech => (
                            <button
                                key={tech}
                                onClick={() => toggleTech(tech)}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${projectData.techStack.includes(tech)
                                        ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-200'
                                        : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                                    }`}
                            >
                                {tech}
                            </button>
                        ))}
                    </div>

                    <div className="flex space-x-4">
                        <button
                            onClick={() => setStep(1)}
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            Next: Goals
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <Target className="h-5 w-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold">Project Goals</h3>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium mb-3">Add Goal</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input
                                type="text"
                                value={newGoal.title}
                                onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Goal title"
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                                type="text"
                                value={newGoal.description}
                                onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Goal description"
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex space-x-2">
                                <select
                                    value={newGoal.priority}
                                    onChange={(e) => setNewGoal(prev => ({ ...prev, priority: e.target.value as any }))}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                                <button
                                    onClick={addGoal}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {projectData.goals.map(goal => (
                            <div key={goal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                        <h5 className="font-medium">{goal.title}</h5>
                                        <span className={`px-2 py-1 text-xs rounded-full ${goal.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                                goal.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                                    goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                            }`}>
                                            {goal.priority}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                                </div>
                                <button
                                    onClick={() => removeGoal(goal.id)}
                                    className="text-red-600 hover:text-red-800 ml-4"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex space-x-4">
                        <button
                            onClick={() => setStep(2)}
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleComplete}
                            disabled={projectData.goals.length === 0}
                            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Complete Setup
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
