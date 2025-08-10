// functions/src/agents/communication/userMessageProcessor.ts
import { Firestore, Timestamp } from '@google-cloud/firestore';
import { OpenAI } from 'openai';
import { MessageRouter } from '../../core/messageRouter';
import {
    MessageAnalysis,
    MessageClassification,
    ProcessedMessage,
    UserMessage
} from '../../models/communication.types';
import { Logger } from '../../utils/logger';

export class UserMessageProcessor {
    private openai: OpenAI;
    private agentId: string;
    private processingQueue: Map<string, Promise<any>> = new Map();
    private isProcessing: boolean = false;

    constructor(
        agentId: 'gpt5mini_1' | 'gpt5mini_2',
        private db: Firestore,
        private messageRouter: MessageRouter,
        private logger: Logger
    ) {
        this.agentId = agentId;
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.initialize();
    }

    private initialize() {
        this.logger.info(`Initializing UserMessageProcessor ${this.agentId}`);
    }

    async processUserMessage(message: UserMessage): Promise<ProcessedMessage> {
        try {
            this.isProcessing = true;

            // Parallel analysis for efficiency
            const [analysis, classification] = await Promise.all([
                this.analyzeMessage(message),
                this.classifyMessage(message)
            ]);

            // Report to O4-Mini
            await this.reportToDecisionEngine(analysis, classification);

            // Store processed message
            await this.storeProcessedMessage(message, analysis, classification);

            return {
                originalMessage: message,
                intent: analysis.intent,
                entities: analysis.entities,
                urgency: classification.urgency,
                suggestedAction: classification.action,
                agentId: this.agentId,
                processedAt: Date.now()
            };
        } finally {
            this.isProcessing = false;
        }
    }

    private async analyzeMessage(message: UserMessage): Promise<MessageAnalysis> {
        const prompt = `
    Analyze this hackathon participant message:
    User: ${message.userName}
    Message: ${message.content}
    Context: ${JSON.stringify(message.context)}
    Current Tasks: ${JSON.stringify(message.context?.currentTasks || [])}
    
    Extract and return as JSON:
    {
      "intent": "question|request|feedback|issue|help|status_update|collaboration",
      "entities": {
        "tasks": ["list of mentioned task names"],
        "users": ["mentioned user names"],
        "technical_terms": ["technical concepts mentioned"],
        "files": ["mentioned file paths"]
      },
      "emotional_tone": "frustrated|neutral|positive|urgent|confused",
      "requires_action": true/false,
      "action_type": "immediate|scheduled|informational|none",
      "expertise_needed": ["areas of expertise required"]
    }`;

        const response = await this.openai.chat.completions.create({
            model: 'gpt-5-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 500,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response content received from OpenAI');
        }
        return JSON.parse(content);
    }

    private async classifyMessage(message: UserMessage): Promise<MessageClassification> {
        const prompt = `
    Classify urgency and routing for this message:
    Content: ${message.content}
    User Status: ${message.context?.userStatus || 'active'}
    
    Return JSON:
    {
      "urgency": "critical|high|medium|low",
      "category": "technical|coordination|planning|help",
      "route_to": ["roadmap_orchestrator", "progress_coordinator", "code_extractor"],
      "action": "notify_team|update_roadmap|assign_help|provide_info|escalate",
      "confidence": 0.0-1.0
    }`;

        const response = await this.openai.chat.completions.create({
            model: 'gpt-5-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 200,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response content received from OpenAI for classification');
        }
        return JSON.parse(content);
    }

    private async reportToDecisionEngine(
        analysis: MessageAnalysis,
        classification: MessageClassification
    ) {
        await this.messageRouter.sendMessage({
            type: 'USER_COMMUNICATION',
            source: `user_message_processor_${this.agentId}`,
            target: 'decision_engine',
            payload: {
                analysis,
                classification,
                timestamp: Date.now()
            },
            priority: this.mapUrgencyToPriority(classification.urgency),
            timestamp: Date.now(),
            correlationId: analysis.messageId
        });
    }

    private mapUrgencyToPriority(urgency: string): number {
        const priorityMap: Record<string, number> = {
            critical: 1,
            high: 2,
            medium: 3,
            low: 4
        };
        return priorityMap[urgency] || 3;
    }

    private async storeProcessedMessage(
        message: UserMessage,
        analysis: MessageAnalysis,
        classification: MessageClassification
    ) {
        await this.db.collection('processed_messages').add({
            ...message,
            analysis,
            classification,
            processedBy: this.agentId,
            processedAt: Timestamp.now()
        });
    }

    isAvailable(): boolean {
        return !this.isProcessing && this.processingQueue.size < 5;
    }

    get queueSize(): number {
        return this.processingQueue.size;
    }
}
