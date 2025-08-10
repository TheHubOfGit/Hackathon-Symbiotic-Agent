// functions/src/api/simpleUsers.ts
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';

export const simpleUsers = functions.https.onRequest(async (req, res) => {
    // Set CORS headers manually
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    const db = getFirestore();

    try {
        const path = req.path || req.url;
        console.log('SimpleUsers request:', req.method, path, req.body);

        if (req.method === 'POST') {
            if (path === '/login' || path.endsWith('/login')) {
                // Handle login
                const { email, password } = req.body;

                if (!email || !password) {
                    res.status(400).json({ error: 'Email and password required' });
                    return;
                }

                // Find user by email
                const usersRef = db.collection('users');
                const snapshot = await usersRef.where('email', '==', email).get();

                if (snapshot.empty) {
                    res.status(401).json({ error: 'Invalid credentials' });
                    return;
                }

                const userDoc = snapshot.docs[0];
                if (!userDoc) {
                    res.status(401).json({ error: 'Invalid credentials' });
                    return;
                }
                const userData = userDoc.data();

                if (!userData) {
                    res.status(401).json({ error: 'Invalid credentials' });
                    return;
                }

                // Simple password check (in production, use proper hashing)
                if (userData.password !== password) {
                    res.status(401).json({ error: 'Invalid credentials' });
                    return;
                }

                // Return user data without password
                const { password: _, ...userWithoutPassword } = userData;
                res.json({
                    success: true,
                    user: {
                        id: userDoc.id,
                        ...userWithoutPassword
                    }
                });
                return;

            } else {
                // Handle registration
                const userData = req.body;
                const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Check if user already exists
                const existingUsers = await db.collection('users')
                    .where('email', '==', userData.email)
                    .get();

                if (!existingUsers.empty) {
                    res.status(400).json({ error: 'User with this email already exists' });
                    return;
                }

                // Save user to Firestore
                await db.collection('users').doc(userId).set({
                    ...userData,
                    joinedAt: Date.now(),
                    status: 'active'
                });

                // Return user data without password
                const { password: _, ...userWithoutPassword } = userData;
                res.json({
                    success: true,
                    user: {
                        id: userId,
                        ...userWithoutPassword
                    },
                    message: 'User registered successfully'
                });
                return;
            }

        } else if (req.method === 'GET') {
            // Handle getting user by ID or all users
            const userId = path.substring(1); // Remove leading slash

            if (userId && userId !== '') {
                const userDoc = await db.collection('users').doc(userId).get();

                if (!userDoc.exists) {
                    res.status(404).json({ error: 'User not found' });
                    return;
                }

                const userData = userDoc.data();

                if (!userData) {
                    res.status(404).json({ error: 'User not found' });
                    return;
                }

                const { password: _, ...userWithoutPassword } = userData as any;

                res.json({
                    success: true,
                    user: {
                        id: userDoc.id,
                        ...userWithoutPassword
                    }
                });
                return;
            } else {
                // Get all users
                const users = await db.collection('users').get();
                const userData = users.docs.map((doc: any) => {
                    const data = doc.data();
                    const { password: _, ...userWithoutPassword } = data as any;
                    return {
                        id: doc.id,
                        ...userWithoutPassword
                    };
                });

                res.json({
                    success: true,
                    users: userData,
                    total: userData.length
                });
                return;
            }

        } else {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

    } catch (error) {
        console.error('SimpleUsers error:', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
});
