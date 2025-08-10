// functions/src/services/aiProviders.ts
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as functions from 'firebase-functions';
import { OpenAI } from 'openai';

export class AIProviders {
    private static instance: AIProviders;
    private gemini: GoogleGenerativeAI;
    private openai: OpenAI;
    private anthropic: Anthropic;

    private constructor() {
        // Use Firebase Functions config or fallback to process.env for local development
        const config = functions.config();

        const geminiKey = config.gemini?.api_key || process.env.GEMINI_API_KEY;
        const openaiKey = config.openai?.api_key || process.env.OPENAI_API_KEY;
        const claudeKey = config.claude?.api_key || process.env.CLAUDE_API_KEY;

        if (!geminiKey || !openaiKey || !claudeKey) {
            console.warn('Missing AI API keys. Some features may not work.');
        }

        this.gemini = new GoogleGenerativeAI(geminiKey!);
        this.openai = new OpenAI({ apiKey: openaiKey });
        this.anthropic = new Anthropic({ apiKey: claudeKey! });
    }

    static getInstance(): AIProviders {
        if (!AIProviders.instance) {
            AIProviders.instance = new AIProviders();
        }
        return AIProviders.instance;
    }

    getGemini(model: string) {
        return this.gemini.getGenerativeModel({ model });
    }

    getOpenAI() {
        return this.openai;
    }

    getAnthropic() {
        return this.anthropic;
    }
}
