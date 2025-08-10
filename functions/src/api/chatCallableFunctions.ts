// functions/src/api/chatCallableFunctions.ts
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';

// Callable function for getting project data
export const getProject = functions.https.onCall(async (data, context) => {
    console.log('getProject called with data:', data);

    const { userId } = data;

    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
    }

    try {
        const db = getFirestore();

        // Get user's projects (Callable functions run with admin privileges)
        const projectsSnapshot = await db.collection('projects')
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        console.log('Projects found:', projectsSnapshot.size);

        if (projectsSnapshot.empty) {
            return {
                success: false,
                project: null,
                message: 'No projects found for user'
            };
        }

        const projectDoc = projectsSnapshot.docs[0];
        if (!projectDoc) {
            return {
                success: false,
                project: null,
                message: 'No project document found'
            };
        }

        const projectData = projectDoc.data();

        console.log('Returning project:', projectDoc.id);

        return {
            success: true,
            project: {
                id: projectDoc.id,
                ...projectData
            }
        };
    } catch (error) {
        console.error('Error getting project:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get project', error);
    }
});

// Callable function for getting chat history
export const getChatHistory = functions.https.onCall(async (data, context) => {
    console.log('getChatHistory called with data:', data);

    const { userId, projectId, limit = 50, offset = 0 } = data;

    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
    }

    try {
        const db = getFirestore();

        // Build query - if we have a projectId, include it in the filter
        let query = db.collection('processed_messages')
            .where('userId', '==', userId);

        if (projectId) {
            query = query.where('projectId', '==', projectId);
        }

        const messages = await query
            .orderBy('timestamp', 'desc')
            .limit(parseInt(limit))
            .offset(parseInt(offset))
            .get();

        console.log('Messages found:', messages.size);

        const history = messages.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return {
            success: true,
            messages: history,
            total: messages.size,
            hasMore: messages.size === parseInt(limit)
        };
    } catch (error) {
        console.error('Error fetching chat history:', error);
        throw new functions.https.HttpsError('internal', 'Failed to fetch chat history', error);
    }
});

// Callable function for creating a project
export const createProject = functions.https.onCall(async (data, context) => {
    console.log('createProject called with data:', data);

    const { userId, projectData, githubRepo } = data;

    if (!userId || !projectData) {
        throw new functions.https.HttpsError('invalid-argument', 'User ID and project data are required');
    }

    try {
        const db = getFirestore();
        const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Save project to Firestore
        await db.collection('projects').doc(projectId).set({
            ...projectData,
            userId,
            githubRepo: githubRepo || null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: 'active'
        });

        console.log('Project created:', projectId);

        return {
            success: true,
            projectId,
            message: 'Project created successfully'
        };
    } catch (error) {
        console.error('Error creating project:', error);
        throw new functions.https.HttpsError('internal', 'Failed to create project', error);
    }
});

// Callable function for sending messages
export const sendMessage = functions.https.onCall(async (data, context) => {
    console.log('sendMessage called with data:', data);

    const { userId, message, projectContext } = data;

    if (!userId || !message) {
        throw new functions.https.HttpsError('invalid-argument', 'User ID and message are required');
    }

    try {
        const db = getFirestore();
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Save message to Firestore
        await db.collection('processed_messages').doc(messageId).set({
            userId,
            message,
            projectContext: projectContext || {},
            timestamp: Date.now(),
            status: 'received'
        });

        console.log('Message saved:', messageId);

        return {
            success: true,
            messageId,
            message: 'Message received and queued for processing',
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Error sending message:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send message', error);
    }
});
