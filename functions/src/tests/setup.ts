// Test setup file
process.env.OPENAI_API_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.GOOGLE_API_KEY = 'test-key';
process.env.DEBUG = 'false';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    firestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ exists: false })),
                set: jest.fn(() => Promise.resolve()),
                update: jest.fn(() => Promise.resolve()),
            })),
        })),
    })),
}));

// Mock OpenAI
jest.mock('openai', () => {
    return {
        OpenAI: jest.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: jest.fn(() => Promise.resolve({
                        choices: [{
                            message: {
                                content: JSON.stringify({ test: 'response' })
                            }
                        }]
                    }))
                }
            }
        }))
    };
});

// Mock Anthropic
jest.mock('@anthropic-ai/sdk', () => ({
    Anthropic: jest.fn().mockImplementation(() => ({
        messages: {
            create: jest.fn(() => Promise.resolve({
                content: [{ text: 'test response' }]
            }))
        }
    }))
}));

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn(() => ({
            generateContent: jest.fn(() => Promise.resolve({
                response: {
                    text: jest.fn(() => 'test response')
                }
            }))
        }))
    }))
}));
