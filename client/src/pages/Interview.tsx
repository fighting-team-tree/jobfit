import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, MessageSquare, Info } from 'lucide-react';

const Interview = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [captions, setCaptions] = useState<string>("안녕하세요! 오늘 면접을 진행하게 된 AI 면접관 Sarah입니다. 준비되셨다면 마이크 버튼을 눌러주세요.");
    const [ws, setWs] = useState<WebSocket | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    // Initial WebSocket Connection
    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8000/api/v1/interview/session');

        socket.onopen = () => {
            console.log('Connected to Interview Session');
        };

        socket.onmessage = async (event) => {
            // Handle binary audio data
            if (event.data instanceof Blob) {
                const audioUrl = URL.createObjectURL(event.data);
                if (audioRef.current) {
                    audioRef.current.src = audioUrl;
                    audioRef.current.play();
                }
            } else {
                // Handle JSON messages
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'caption') {
                        setCaptions(message.text);
                    }
                } catch (e) {
                    console.error('Failed to parse message', e);
                }
            }
        };

        socket.onclose = () => console.log('Disconnected');

        setWs(socket);

        return () => {
            socket.close();
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && ws && ws.readyState === WebSocket.OPEN) {
                    // Send audio chunk to server (Not fully implemented on server yet, but ready structure)
                    // ws.send(event.data); 
                }
            };

            mediaRecorder.start(100); // Collect 100ms chunks
            setIsRecording(true);
            setCaptions("듣고 있습니다...");
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("마이크 접근 권한이 필요합니다.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);

            // Send end of turn signal
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'audio_end' }));
            }
        }
    };

    const toggleRecording = () => {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    };

    return (
        <div className="container mx-auto px-6 pt-24 pb-12 h-[calc(100vh-64px)] flex flex-col">
            <audio ref={audioRef} className="hidden" />
            <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">

                {/* Left: Avatar Section */}
                <div className="flex-1 rounded-3xl bg-neutral-900 border border-white/10 overflow-hidden relative group">
                    <img
                        src="/avatar.png"
                        alt="AI Interviewer"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                    <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-sm font-medium text-white/80">AI Interviewing... Sarah Chen</span>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors">
                                <Info className="w-5 h-5 text-white/70" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Interaction Section */}
                <div className="w-full lg:w-[450px] flex flex-col gap-6">
                    <div className="flex-1 flex flex-col p-6 rounded-3xl bg-neutral-900 border border-white/10 overflow-hidden">
                        <div className="flex items-center gap-2 mb-6">
                            <MessageSquare className="w-5 h-5 text-indigo-400" />
                            <h2 className="text-lg font-bold">실시간 자막</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-neutral-300 leading-relaxed animate-fade-in">
                                {captions}
                            </div>
                        </div>

                        <div className="mt-6 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                            <h3 className="text-sm font-semibold text-indigo-400 mb-2 flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                면접 가이드
                            </h3>
                            <p className="text-xs text-neutral-400 leading-relaxed">
                                질문에 답변할 때 STAR 기법(Situation, Task, Action, Result)을 활용하여 구체적으로 설명해보세요.
                            </p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center gap-8">
                        <button
                            onClick={toggleRecording}
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isRecording
                                ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)]'
                                }`}
                        >
                            {isRecording ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Interview;
