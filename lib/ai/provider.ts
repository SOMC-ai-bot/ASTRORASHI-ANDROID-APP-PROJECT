import { AIIntent, LanguageCode, NatalChart } from '@/types';

export interface GoogleSearchGrounding {
  query: string;
  sourceTitle: string;
  url: string;
  snippet: string;
  verifiedAt: string;
}

export interface GoogleMapsGrounding {
  placeName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  elevationMeters: number;
  localSiderealTime: string;
}

export interface AIMessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessagePayload[];
  natalChart?: NatalChart;
  userLanguage?: LanguageCode;
  useAstrologyContext?: boolean;
  intent?: AIIntent;
  specialistId?: string;
  specialistName?: string;
  specialistSystemPrompt?: string;
  toolResults?: Record<string, any>;
  highThinkingEnabled?: boolean;
}

export interface AICompletionResponse {
  content: string;
  text: string; // convenient alias
  intent: AIIntent;
  astrologyContextUsed: boolean;
  contextPill?: {
    planet?: string;
    house?: string;
    sign?: string;
    theme?: string;
  };
  thinking?: string;
  thoughtDuration?: number;
  searchGrounding?: GoogleSearchGrounding[];
  mapsGrounding?: GoogleMapsGrounding;
  model?: string;
}

export interface AIProvider {
  name: string;
  isConfigured(): boolean;
  generateResponse(request: AICompletionRequest): Promise<AICompletionResponse>;
  generateStream?(
    request: AICompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<AICompletionResponse>;
}
