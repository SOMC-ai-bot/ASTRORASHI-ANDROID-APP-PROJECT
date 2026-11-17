import { NextRequest, NextResponse } from 'next/server';
import { defaultAIProvider } from '@/lib/ai/fallback';
import { classifyIntent } from '@/lib/ai/routing';
import { AICompletionRequest } from '@/lib/ai/provider';

export async function POST(req: NextRequest) {
  try {
    const body: AICompletionRequest = await req.json();
    const {
      messages,
      natalChart,
      userLanguage = 'en',
      useAstrologyContext = true,
      intent: requestedIntent,
      specialistId,
      specialistName,
      specialistSystemPrompt,
      toolResults,
      highThinkingEnabled,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const userMessages = messages.filter((m) => m.role === 'user');
    const lastMsg =
      userMessages[userMessages.length - 1]?.content ||
      messages[messages.length - 1]?.content ||
      '';
    const intent = requestedIntent || classifyIntent(lastMsg, useAstrologyContext);

    const response = await defaultAIProvider.generateResponse({
      messages,
      natalChart,
      userLanguage,
      useAstrologyContext,
      intent,
      specialistId,
      specialistName,
      specialistSystemPrompt,
      toolResults,
      highThinkingEnabled,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    const rawMsg = String(error?.message || error || '');
    let status = 500;
    let clientMessage = 'Failed to process AI conversation request.';

    if (rawMsg.includes('PERMISSION_DENIED') || rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key')) {
      status = 403;
      clientMessage = 'Gemini API authorization failed. Please check your key in Settings > Secrets.';
    } else if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429')) {
      status = 429;
      clientMessage = 'AI quota limit reached temporarily. Please try again in a moment.';
    } else if (rawMsg.includes('NOT_FOUND') || rawMsg.includes('404')) {
      status = 404;
      clientMessage = 'Requested AI model endpoint was not found.';
    }

    return NextResponse.json({ error: clientMessage }, { status });
  }
}
