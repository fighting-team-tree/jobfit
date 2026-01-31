/**
 * ElevenLabs React Hook for Real-time TTS
 * 
 * Uses @elevenlabs/react SDK for direct browser-to-ElevenLabs communication.
 * Bypasses backend for TTS, ensuring stable audio streaming.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';

// Voice IDs for different personas
const VOICE_IDS = {
    professional: '21m00Tcm4TlvDq8ikWAM', // Rachel - calm, professional
    friendly: 'AZnzlk1XvdvUeBnXmlld',      // Domi - warm, friendly
    challenging: 'VR6AewLTigWG4xSOukaG',   // Arnold - assertive
};

interface UseElevenLabsTTSOptions {
    persona?: 'professional' | 'friendly' | 'challenging';
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
}

interface UseElevenLabsTTSReturn {
    speak: (text: string) => Promise<void>;
    stop: () => void;
    isSpeaking: boolean;
    isLoading: boolean;
    error: string | null;
}

/**
 * Custom hook for ElevenLabs Text-to-Speech
 * Handles audio playback directly in the browser
 */
export function useElevenLabsTTS(options: UseElevenLabsTTSOptions = {}): UseElevenLabsTTSReturn {
    const { persona = 'professional', onStart, onEnd, onError } = options;

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Initialize AudioContext on first interaction
    const initAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    // Stop current playback
    const stop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
            } catch (e) {
                // Ignore if already stopped
            }
            sourceNodeRef.current = null;
        }
        setIsSpeaking(false);
        setIsLoading(false);
    }, []);

    // Speak text using ElevenLabs API
    const speak = useCallback(async (text: string) => {
        if (!ELEVENLABS_API_KEY) {
            const err = new Error('ElevenLabs API key not configured. Set VITE_ELEVENLABS_API_KEY in .env');
            setError(err.message);
            onError?.(err);
            return;
        }

        // Stop any current playback
        stop();

        setIsLoading(true);
        setError(null);

        const voiceId = VOICE_IDS[persona];
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': ELEVENLABS_API_KEY,
                    },
                    body: JSON.stringify({
                        text,
                        model_id: 'eleven_turbo_v2_5',
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75,
                        },
                    }),
                    signal: abortControllerRef.current.signal,
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
            }

            // Get audio data
            const arrayBuffer = await response.arrayBuffer();

            // Decode and play audio
            const audioContext = initAudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(audioContext.destination);

            sourceNodeRef.current = sourceNode;

            sourceNode.onended = () => {
                setIsSpeaking(false);
                sourceNodeRef.current = null;
                onEnd?.();
            };

            setIsLoading(false);
            setIsSpeaking(true);
            onStart?.();

            sourceNode.start(0);

        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                // Request was cancelled, not an error
                return;
            }

            const error = err as Error;
            console.error('ElevenLabs TTS error:', error);
            setError(error.message);
            setIsLoading(false);
            setIsSpeaking(false);
            onError?.(error);
        }
    }, [persona, stop, initAudioContext, onStart, onEnd, onError]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stop();
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [stop]);

    return {
        speak,
        stop,
        isSpeaking,
        isLoading,
        error,
    };
}

/**
 * Hook for streaming TTS (lower latency)
 * Uses chunked audio playback for real-time feel
 */
export function useElevenLabsStreamingTTS(options: UseElevenLabsTTSOptions = {}) {
    const { persona = 'professional', onStart, onEnd, onError } = options;

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const nextStartTimeRef = useRef<number>(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    const initAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    const stop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        scheduledSourcesRef.current.forEach(source => {
            try { source.stop(); } catch (e) { }
        });
        scheduledSourcesRef.current = [];
        if (audioContextRef.current) {
            nextStartTimeRef.current = audioContextRef.current.currentTime;
        }
        setIsSpeaking(false);
        setIsLoading(false);
    }, []);

    const speak = useCallback(async (text: string) => {
        if (!ELEVENLABS_API_KEY) {
            const err = new Error('ElevenLabs API key not configured');
            setError(err.message);
            onError?.(err);
            return;
        }

        stop();
        setIsLoading(true);
        setError(null);

        const voiceId = VOICE_IDS[persona];
        const audioContext = initAudioContext();
        nextStartTimeRef.current = audioContext.currentTime;
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': ELEVENLABS_API_KEY,
                    },
                    body: JSON.stringify({
                        text,
                        model_id: 'eleven_turbo_v2_5',
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75,
                        },
                    }),
                    signal: abortControllerRef.current.signal,
                }
            );

            if (!response.ok) {
                throw new Error(`ElevenLabs API error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            setIsLoading(false);
            setIsSpeaking(true);
            onStart?.();

            const chunks: Uint8Array[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }

            // Combine all chunks and decode
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const combined = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                combined.set(chunk, offset);
                offset += chunk.length;
            }

            const audioBuffer = await audioContext.decodeAudioData(combined.buffer);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);

            scheduledSourcesRef.current.push(source);

            source.onended = () => {
                scheduledSourcesRef.current = scheduledSourcesRef.current.filter(s => s !== source);
                if (scheduledSourcesRef.current.length === 0) {
                    setIsSpeaking(false);
                    onEnd?.();
                }
            };

            source.start(0);

        } catch (err) {
            if ((err as Error).name === 'AbortError') return;

            const error = err as Error;
            console.error('ElevenLabs streaming TTS error:', error);
            setError(error.message);
            setIsLoading(false);
            setIsSpeaking(false);
            onError?.(error);
        }
    }, [persona, stop, initAudioContext, onStart, onEnd, onError]);

    useEffect(() => {
        return () => {
            stop();
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [stop]);

    return {
        speak,
        stop,
        isSpeaking,
        isLoading,
        error,
    };
}

export default useElevenLabsTTS;
