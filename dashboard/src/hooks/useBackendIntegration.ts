// User Registration and Authentication Integration
import { useEffect, useState } from 'react';

interface UserRegistrationData {
    name: string;
    skills: string[];
    availableHours: number;
    experience: string;
    role: 'participant' | 'mentor' | 'organizer';
}

export const useUserRegistration = () => {
    const [isRegistered, setIsRegistered] = useState(false);
    const [user, setUser] = useState(null);

    const registerUser = async (userData: UserRegistrationData) => {
        try {
            // Connect to your actual backend API
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const result = await response.json();
            setUser(result.user);
            setIsRegistered(true);

            // This triggers the roadmap update in your backend
            return result;
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    };

    return { isRegistered, user, registerUser };
};

export const useRoadmapData = (projectId: string, userId: string) => {
    const [roadmap, setRoadmap] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRoadmap = async () => {
            try {
                // Connect to your RoadmapOrchestrator
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/chat/roadmap/${projectId}`, {
                    headers: { 'Authorization': `Bearer ${userId}` }
                });

                const data = await response.json();
                setRoadmap(data);
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to fetch roadmap:', error);
                setIsLoading(false);
            }
        };

        fetchRoadmap();
    }, [projectId, userId]);

    return { roadmap, isLoading };
};
