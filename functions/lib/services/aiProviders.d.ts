import Anthropic from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
export declare class AIProviders {
    private static instance;
    private gemini;
    private openai;
    private anthropic;
    private constructor();
    static getInstance(): AIProviders;
    getGemini(model: string): import("@google/generative-ai").GenerativeModel;
    getOpenAI(): OpenAI;
    getAnthropic(): Anthropic;
}
