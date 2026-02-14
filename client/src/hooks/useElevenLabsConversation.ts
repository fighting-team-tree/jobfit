import { useConversation } from '@elevenlabs/react';

/**
 * Hook to manage ElevenLabs Conversational AI
 */
export const useElevenLabsConversation = () => {
    const conversation = useConversation({
        onConnect: () => console.log('Connected to ElevenLabs Agent'),
        onDisconnect: () => console.log('Disconnected from ElevenLabs Agent'),
        onMessage: (message) => {
            console.log('[Conversation]', message);
        },
        onError: (error) => console.error('Conversation Error:', error),
    });

    return conversation;
};
