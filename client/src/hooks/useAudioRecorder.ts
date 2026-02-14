
import { useState, useCallback, useRef } from 'react';

interface AudioRecorderHook {
    isRecording: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    audioData: Blob | null; // For debug/preview if needed
}

export const useAudioRecorder = (
    onAudioData: (data: Blob) => void
): AudioRecorderHook => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioData] = useState<Blob | null>(null);

    const mediaStream = useRef<MediaStream | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const processor = useRef<ScriptProcessorNode | null>(null);
    const source = useRef<MediaStreamAudioSourceNode | null>(null);

    const processAudio = useCallback((e: AudioProcessingEvent) => {
        const inputBuffer = e.inputBuffer;
        const inputData = inputBuffer.getChannelData(0); // Mono

        // Downsample to 16kHz (Standard for STT)
        // Input is usually 44.1kHz or 48kHz
        const targetSampleRate = 16000;
        const sampleRate = inputBuffer.sampleRate;

        // Simple decimation if sample rate is higher
        // For production quality, use a proper resampling filter
        const ratio = sampleRate / targetSampleRate;
        const newLength = Math.floor(inputData.length / ratio);
        const result = new Int16Array(newLength);

        for (let i = 0; i < newLength; i++) {
            const offset = Math.floor(i * ratio);
            // Clamp to 16-bit integer range
            const s = Math.max(-1, Math.min(1, inputData[offset]));
            result[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Create Blob/Buffer to send
        // We send raw PCM bytes (Int16, Little Endian)
        // But WebSocket .send(blob) or .send(arraybuffer) works.
        // Let's send ArrayBuffer directly if possible, or Blob.

        onAudioData(new Blob([result.buffer], { type: 'audio/pcm' }));

    }, [onAudioData]);

    const startRecording = useCallback(async () => {
        try {
            if (isRecording) return;

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1
                }
            });

            mediaStream.current = stream;
            audioContext.current = new AudioContext();
            source.current = audioContext.current.createMediaStreamSource(stream);

            // Buffer size 4096 is manageable latency (~90ms at 44.1kHz)
            // 2048 -> ~45ms. Let's try 4096 for stability first.
            processor.current = audioContext.current.createScriptProcessor(4096, 1, 1);

            processor.current.onaudioprocess = processAudio;

            source.current.connect(processor.current);
            processor.current.connect(audioContext.current.destination); // Needed for Chrome

            setIsRecording(true);

        } catch (err) {
            console.error("Failed to start recording:", err);
            // alert("마이크 권한이 필요합니다.");
        }
    }, [isRecording, processAudio]);

    const stopRecording = useCallback(() => {
        if (!isRecording) return;

        if (processor.current) {
            processor.current.disconnect();
            processor.current = null;
        }

        if (source.current) {
            source.current.disconnect();
            source.current = null;
        }

        if (audioContext.current) {
            audioContext.current.close();
            audioContext.current = null;
        }

        if (mediaStream.current) {
            mediaStream.current.getTracks().forEach(track => track.stop());
            mediaStream.current = null;
        }

        setIsRecording(false);
    }, [isRecording]);

    return {
        isRecording,
        startRecording,
        stopRecording,
        audioData
    };
};
