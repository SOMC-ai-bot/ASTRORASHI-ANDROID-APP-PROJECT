'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AIConversation, AIMessage, LanguageCode } from '@/types';
import {
  createInitialConversation,
  loadSavedConversations,
  saveConversations,
  getActiveConversationId,
  setActiveConversationId,
} from '@/lib/ai/memory';
import { useAstrology } from './astrology-context';
import { useI18n } from '@/lib/i18n/i18n-context';
import type { AICompletionResponse } from '@/lib/ai/provider';
import { classifyIntent } from '@/lib/ai/routing';

interface ChatContextType {
  conversations: AIConversation[];
  activeConversation: AIConversation;
  isStreaming: boolean;
  useAstrologyContext: boolean;
  toggleAstrologyContext: () => void;
  sendMessage: (text: string) => Promise<void>;
  stopGeneration: () => void;
  regenerateLastMessage: () => void;
  createNewConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  rateMessage: (msgId: string, feedback: 'like' | 'dislike') => void;
  toggleSaveMessage: (msgId: string) => void;
  askAboutPlacement: (prompt: string, navigateToChat?: () => void) => void;
  selectedAstrologerMode: string;
  setSelectedAstrologerMode: (modeId: string) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { natalChart } = useAstrology();
  const { language } = useI18n();

  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [useAstrologyContext, setUseAstrologyContext] = useState<boolean>(true);
  const [selectedAstrologerMode, setSelectedAstrologerMode] = useState<string>('vedic-master');

  const abortFlagRef = useRef<boolean>(false);
  const fetchAbortRef = useRef<AbortController | null>(null);

  // Initialize conversations from storage
  useEffect(() => {
    const saved = loadSavedConversations();
    if (saved.length > 0) {
      setConversations(saved);
      const savedActiveId = getActiveConversationId();
      if (savedActiveId && saved.some((c) => c.id === savedActiveId)) {
        setActiveId(savedActiveId);
      } else {
        setActiveId(saved[0].id);
      }
    } else {
      const initial = createInitialConversation(language);
      setConversations([initial]);
      setActiveId(initial.id);
      saveConversations([initial]);
      setActiveConversationId(initial.id);
    }
  }, [language]);

  const activeConversation =
    conversations.find((c) => c.id === activeId) ||
    conversations[0] ||
    createInitialConversation(language);

  const updateActiveConversation = (updated: AIConversation) => {
    const next = conversations.map((c) => (c.id === updated.id ? updated : c));
    setConversations(next);
    saveConversations(next);
  };

  const createNewConversation = () => {
    const newConv = createInitialConversation(language);
    const updated = [newConv, ...conversations];
    setConversations(updated);
    setActiveId(newConv.id);
    setActiveConversationId(newConv.id);
    saveConversations(updated);
  };

  const selectConversation = (id: string) => {
    setActiveId(id);
    setActiveConversationId(id);
  };

  const deleteConversation = (id: string) => {
    const filtered = conversations.filter((c) => c.id !== id);
    if (filtered.length === 0) {
      const fresh = createInitialConversation(language);
      setConversations([fresh]);
      setActiveId(fresh.id);
      saveConversations([fresh]);
      setActiveConversationId(fresh.id);
    } else {
      setConversations(filtered);
      if (activeId === id) {
        setActiveId(filtered[0].id);
        setActiveConversationId(filtered[0].id);
      }
      saveConversations(filtered);
    }
  };

  const stopGeneration = () => {
    abortFlagRef.current = true;
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = null;
    setIsStreaming(false);
  };

  const toggleAstrologyContext = () => {
    setUseAstrologyContext((prev) => !prev);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    abortFlagRef.current = false;
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    const userMsgId = 'msg_' + Date.now();
    const assistantMsgId = 'msg_' + (Date.now() + 1);

    const userMessage: AIMessage = {
      id: userMsgId,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const intent = classifyIntent(text, useAstrologyContext);

    // Initial placeholder assistant message
    const initialAssistantMessage: AIMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      intent,
      astrologyContextUsed: useAstrologyContext && intent !== 'GENERAL_CHAT' && intent !== 'SAFETY_DISCLAIMER',
    };

    // Update conversation title if first user message
    let title = activeConversation.title;
    if (activeConversation.messages.filter((m) => m.role === 'user').length === 0) {
      title = text.slice(0, 36) + (text.length > 36 ? '...' : '');
    }

    const conversationWithUserMsg: AIConversation = {
      ...activeConversation,
      title,
      updatedAt: new Date().toISOString(),
      messages: [...activeConversation.messages, userMessage, initialAssistantMessage],
    };

    updateActiveConversation(conversationWithUserMsg);
    setIsStreaming(true);

    try {
      const apiRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: conversationWithUserMsg.messages.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          natalChart,
          userLanguage: language,
          useAstrologyContext,
          intent,
          specialistId: selectedAstrologerMode,
        }),
      });

      const response: AICompletionResponse & { error?: string } = await apiRes.json();
      if (!apiRes.ok) {
        throw new Error(response?.error || 'Failed to process AI request');
      }

      // Smooth progressive reveal for responsive reading
      const fullContent = response.content || response.text || '';
      const words = fullContent.split(' ');
      let accumulatedContent = '';

      for (let i = 0; i < words.length; i += 5) {
        if (abortFlagRef.current) break;
        const slice = words.slice(i, i + 5).join(' ');
        accumulatedContent += (accumulatedContent ? ' ' : '') + slice;

        const currentText = accumulatedContent;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeConversation.id) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, content: currentText } : m
              ),
            };
          })
        );
        await new Promise((r) => setTimeout(r, 8));
      }

      // Finalize message once streaming completes
      setConversations((prev) => {
        const finalConvs = prev.map((c) => {
          if (c.id !== activeConversation.id) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: accumulatedContent || fullContent,
                    astrologyContextUsed: response.astrologyContextUsed,
                    astrologyContextData: response.contextPill,
                  }
                : m
            ),
          };
        });
        saveConversations(finalConvs);
        return finalConvs;
      });
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        return;
      }
      console.error('Error generating AI response:', e);
      const errorMsg =
        e?.message ||
        'I apologize, but an unexpected issue occurred while synthesizing this reply. Please try asking again.';
      setConversations((prev) => {
        const next = prev.map((c) => {
          if (c.id !== activeConversation.id) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, content: errorMsg } : m
            ),
          };
        });
        saveConversations(next);
        return next;
      });
    } finally {
      fetchAbortRef.current = null;
      setIsStreaming(false);
    }
  };

  const regenerateLastMessage = async () => {
    const msgs = activeConversation.messages;
    const lastUserIndex = [...msgs].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIndex === -1) return;

    const actualIdx = msgs.length - 1 - lastUserIndex;
    const lastUserMsg = msgs[actualIdx];

    // Remove anything after that user message
    const trimmedMessages = msgs.slice(0, actualIdx);
    const updatedConv: AIConversation = {
      ...activeConversation,
      messages: trimmedMessages,
    };
    updateActiveConversation(updatedConv);

    await sendMessage(lastUserMsg.content);
  };

  const rateMessage = (msgId: string, feedback: 'like' | 'dislike') => {
    const updated: AIConversation = {
      ...activeConversation,
      messages: activeConversation.messages.map((m) =>
        m.id === msgId ? { ...m, feedback: m.feedback === feedback ? undefined : feedback } : m
      ),
    };
    updateActiveConversation(updated);
  };

  const toggleSaveMessage = (msgId: string) => {
    const updated: AIConversation = {
      ...activeConversation,
      messages: activeConversation.messages.map((m) =>
        m.id === msgId ? { ...m, isSaved: !m.isSaved } : m
      ),
    };
    updateActiveConversation(updated);
  };

  const askAboutPlacement = (prompt: string, navigateToChat?: () => void) => {
    if (navigateToChat) {
      navigateToChat();
    }
    setTimeout(() => {
      sendMessage(prompt);
    }, 150);
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        isStreaming,
        useAstrologyContext,
        toggleAstrologyContext,
        sendMessage,
        stopGeneration,
        regenerateLastMessage,
        createNewConversation,
        selectConversation,
        deleteConversation,
        rateMessage,
        toggleSaveMessage,
        askAboutPlacement,
        selectedAstrologerMode,
        setSelectedAstrologerMode,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return ctx;
}
