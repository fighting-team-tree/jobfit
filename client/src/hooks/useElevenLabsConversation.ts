import { useConversation } from '@elevenlabs/react';
import { useCallback, useState } from 'react';

/**
 * Hook to manage ElevenLabs Conversational AI
 */
export const useElevenLabsConversation = () => {
    const conversation = useConversation({
        onConnect: () => console.log('Connected to ElevenLabs Agent'),
        onDisconnect: () => console.log('Disconnected from ElevenLabs Agent'),
        onMessage: (message) => {
            // Handle text messages (transcripts) if needed
            // message format: { source: 'user' | 'agent', text: '...' }
            console.log('[Conversation]', message);
        },
        onError: (error) => console.error('Conversation Error:', error),
    });

    const [agentStatus, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening'>('disconnected');

    // Override internal status logic if needed, or expose directly

    return conversation;
};
