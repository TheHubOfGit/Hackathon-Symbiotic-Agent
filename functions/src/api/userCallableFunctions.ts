// functions/src/api/userCallableFunctions.ts
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';

// Simplified initialization without complex dependencies
function getDb() {
    return getFirestore();
}

// Firebase Callable Function for user registration
export const registerUser = functions.https.onCall(async (data, context) => {
    try {
        const userData = data;
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Save user to Firestore directly
        const db = getDb();
        await db.collection('users').doc(userId).set({
            ...userData,
            status: 'active',
            joinedAt: Date.now()
        });

        return {
            success: true,
            userId,
            user: {
                id: userId,
                ...userData
            },
            message: 'User registered successfully'
        };
    } catch (error) {
        console.error('Failed to register user:', error);
        throw new functions.https.HttpsError('internal', 'Failed to register user');
    }
});

// Login user
export const loginUser = functions.https.onCall(async (data, context) => {
    try {
        const { email, password } = data;

        if (!email || !password) {
            throw new functions.https.HttpsError('invalid-argument', 'Email and password required');
        }

        const db = getDb();

        // Find user by email
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).get();

        if (snapshot.empty) {
            throw new functions.https.HttpsError('unauthenticated', 'Invalid credentials');
        }

        const userDoc = snapshot.docs[0];
        if (!userDoc) {
            throw new functions.https.HttpsError('unauthenticated', 'Invalid credentials');
        }

        const userData = userDoc.data();
        if (!userData) {
            throw new functions.https.HttpsError('unauthenticated', 'Invalid credentials');
        }

        // Simple password check (in production, use proper hashing)
        if (userData.password !== password) {
            throw new functions.https.HttpsError('unauthenticated', 'Invalid credentials');
        }

        // Return user data without password
        const { password: _, ...userWithoutPassword } = userData;

        console.log('User login successful', { userId: userDoc.id, email });

        return {
            success: true,
            user: {
                id: userDoc.id,
                ...userWithoutPassword
            }
        };
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
});

// Firebase Callable Function for user departure
export const userDeparture = functions.https.onCall(async (data, context) => {
    const { userId } = data;

    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'userId is required');
    }

    try {
        // For now, just mark user as inactive
        const db = getDb();
        await db.collection('users').doc(userId).update({
            status: 'inactive',
            leftAt: Date.now()
        });

        return {
            success: true,
            message: 'User departure processed'
        };
    } catch (error) {
        console.error('Failed to process user departure:', error);
        throw new functions.https.HttpsError('internal', 'Failed to process departure');
    }
});

// Firebase Callable Function for getting all users
export const getUsers = functions.https.onCall(async (data, context) => {
    try {
        const users = await getDb().collection('users').get();

        const userData = users.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        return {
            success: true,
            users: userData,
            total: userData.length
        };
    } catch (error) {
        console.error('Failed to get users:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get users');
    }
});

// Firebase Callable Function for getting a specific user
export const getUser = functions.https.onCall(async (data, context) => {
    const { userId } = data;

    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'userId is required');
    }

    try {
        const user = await getDb().collection('users').doc(userId).get();

        if (!user.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        return {
            success: true,
            user: {
                id: user.id,
                ...user.data()
            }
        };
    } catch (error) {
        console.error('Failed to get user:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to get user');
    }
});

// Firebase Callable Function for updating a user
export const updateUser = functions.https.onCall(async (data, context) => {
    const { userId, updates } = data;

    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'userId is required');
    }

    if (!updates) {
        throw new functions.https.HttpsError('invalid-argument', 'updates are required');
    }

    try {
        await getDb().collection('users').doc(userId).update({
            ...updates,
            lastUpdated: Date.now()
        });

        return {
            success: true,
            message: 'User updated successfully'
        };
    } catch (error) {
        console.error('Failed to update user:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update user');
    }
});
