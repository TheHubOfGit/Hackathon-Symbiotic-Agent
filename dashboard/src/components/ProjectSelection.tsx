// dashboard/src/components/ProjectSelection.tsx
import { ArrowRight, Clock, Plus, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { firebaseFunctions } from '../utils/firebaseFunctions';

interface Project {
    id: string;
    name: string;
    description: string;
    techStack: string[];
    deadline: string;
    organizerId: string;
    organizerName: string;
    participantCount: number;
    status: 'open' | 'in_progress' | 'completed';
    maxParticipants?: number;
    goals: Array<{
        id: string;
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high';
    }>;
}

interface ProjectSelectionProps {
    user: {
        id: string;
        name: string;
        role: 'participant' | 'mentor' | 'organizer';
    };
    onProjectSelected: (project: Project) => void;
    onCreateProject: () => void;
}

export const ProjectSelection: React.FC<ProjectSelectionProps> = ({
    user,
    onProjectSelected,
    onCreateProject
}) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joiningProjectId, setJoiningProjectId] = useState<string | null>(null);

    useEffect(() => {
        const fetchAvailableProjects = async () => {
            const timestamp = new Date().toISOString();
            console.log(`🔍 [${timestamp}] PROJECTSELECTION: Fetching real projects from Firestore for user ${user.id} (${user.role})`);

            try {
                setIsLoading(true);
                setError(null);

                console.log(`📡 [${timestamp}] PROJECTSELECTION: Calling getAllProjects API`);

                const result = await firebaseFunctions.getAllProjects();
                console.log(`✅ [${timestamp}] PROJECTSELECTION: getAllProjects returned:`, result);

                if (result?.projects && Array.isArray(result.projects)) {
                    const formattedProjects: Project[] = result.projects.map((project: any) => ({
                        id: project.id,
                        name: project.name || 'Unnamed Project',
                        description: project.description || 'No description available',
                        techStack: project.techStack || [],
                        deadline: project.deadline || '2025-12-31T23:59:59Z',
                        organizerId: project.organizerId || '',
                        organizerName: project.organizerName || 'Unknown Organizer',
                        participantCount: project.participantCount || 0,
                        maxParticipants: project.maxParticipants || 10,
                        status: project.status || 'open',
                        goals: project.goals || []
                    }));

                    setProjects(formattedProjects);
                    console.log(`✅ [${timestamp}] PROJECTSELECTION: Successfully loaded ${formattedProjects.length} real projects from Firestore`);
                } else {
                    console.log(`⚠️ [${timestamp}] PROJECTSELECTION: No projects found in result:`, result);
                    setProjects([]);
                }

            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to load projects from Firestore';
                console.error(`❌ [${timestamp}] PROJECTSELECTION: Error fetching real projects:`, err);
                setError(errorMsg);
                setProjects([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAvailableProjects();
    }, [user.id, user.role]);

    const handleJoinProject = async (project: Project) => {
        const timestamp = new Date().toISOString();
        console.log(`🚀 [${timestamp}] PROJECTSELECTION: User ${user.id} joining project ${project.id}`);

        try {
            setJoiningProjectId(project.id);
            setError(null);

            // Here you would typically call an API to join the project
            // For now, we'll simulate the join process
            console.log(`📝 [${timestamp}] PROJECTSELECTION: Adding user to project participants`);

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Update the project with the user as a participant
            const updatedProject = {
                ...project,
                participantCount: project.participantCount + 1
            };

            console.log(`✅ [${timestamp}] PROJECTSELECTION: Successfully joined project ${project.id}`);
            onProjectSelected(updatedProject);

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to join project';
            console.error(`❌ [${timestamp}] PROJECTSELECTION: Error joining project:`, err);
            setError(errorMsg);
        } finally {
            setJoiningProjectId(null);
        }
    };

    const formatDeadline = (deadline: string) => {
        const date = new Date(deadline);
        const now = new Date();
        const diffHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60));

        if (diffHours < 24) {
            return `${diffHours} hours remaining`;
        } else {
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays} days remaining`;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading available projects...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Welcome, {user.name}! 🎉
                            </h1>
                            <p className="text-gray-600 mt-1">
                                {user.role === 'organizer'
                                    ? 'Create a new project or join an existing one'
                                    : user.role === 'mentor'
                                        ? 'Choose a project to mentor and guide teams'
                                        : 'Select a project to join and start collaborating'
                                }
                            </p>
                        </div>

                        {user.role === 'organizer' && (
                            <button
                                onClick={onCreateProject}
                                className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Plus size={20} />
                                <span>Create Project</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Available Projects */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Available Projects ({projects.length})
                    </h2>

                    {projects.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                            <p className="text-gray-600 mb-4">No available projects found</p>
                            {user.role === 'organizer' && (
                                <button
                                    onClick={onCreateProject}
                                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Create the First Project
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                                >
                                    {/* Project Header */}
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {project.name}
                                        </h3>
                                        <p className="text-gray-600 text-sm line-clamp-3">
                                            {project.description}
                                        </p>
                                    </div>

                                    {/* Tech Stack */}
                                    <div className="mb-4">
                                        <div className="flex flex-wrap gap-1">
                                            {project.techStack.slice(0, 4).map((tech) => (
                                                <span
                                                    key={tech}
                                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                                >
                                                    {tech}
                                                </span>
                                            ))}
                                            {project.techStack.length > 4 && (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                    +{project.techStack.length - 4} more
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Project Stats */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center space-x-1 text-gray-600">
                                                <Users size={16} />
                                                <span>
                                                    {project.participantCount}
                                                    {project.maxParticipants && `/${project.maxParticipants}`} participants
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-1 text-gray-600 text-sm">
                                            <Clock size={16} />
                                            <span>{formatDeadline(project.deadline)}</span>
                                        </div>

                                        <div className="text-sm text-gray-600">
                                            <span className="font-medium">Organizer:</span> {project.organizerName}
                                        </div>
                                    </div>

                                    {/* Goals Preview */}
                                    {project.goals.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-sm font-medium text-gray-700 mb-2">Key Goals:</p>
                                            <ul className="space-y-1">
                                                {project.goals.slice(0, 2).map((goal) => (
                                                    <li key={goal.id} className="flex items-center space-x-2 text-sm">
                                                        <div className={`w-2 h-2 rounded-full ${goal.priority === 'high' ? 'bg-red-400' :
                                                                goal.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                                                            }`} />
                                                        <span className="text-gray-600 truncate">{goal.title}</span>
                                                    </li>
                                                ))}
                                                {project.goals.length > 2 && (
                                                    <li className="text-xs text-gray-500">
                                                        +{project.goals.length - 2} more goals
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Join Button */}
                                    <button
                                        onClick={() => handleJoinProject(project)}
                                        disabled={joiningProjectId === project.id}
                                        className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {joiningProjectId === project.id ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Joining...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>{user.role === 'mentor' ? 'Mentor Project' : 'Join Project'}</span>
                                                <ArrowRight size={16} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
