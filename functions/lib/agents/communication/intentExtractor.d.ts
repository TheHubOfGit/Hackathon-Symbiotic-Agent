export interface ExtractedIntent {
    primary: string;
    secondary: string[];
    entities: {
        tasks: string[];
        users: string[];
        technical: string[];
        files: string[];
        deadlines: string[];
    };
    actionRequired: boolean;
    expertise: string[];
}
export declare class IntentExtractor {
    private openai;
    constructor();
    extractIntent(message: string, context: any): Promise<ExtractedIntent>;
    extractMultipleIntents(messages: string[]): Promise<ExtractedIntent[]>;
    identifyBlockers(message: string): Promise<any>;
}
