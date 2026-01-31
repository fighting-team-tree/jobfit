import React, { useState, useRef } from 'react';
import { Mic, MicOff, MessageSquare, Info, Play, Pause } from 'lucide-react';

const Interview = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [captions, setCaptions] = useState<string>("안녕하세요! 오늘 면접을 진행하게 된 AI 면접관 Sarah입니다. 준비되셨다면 마이크 버튼을 눌러주세요.");
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const toggleRecording = () => {
        setIsRecording(!isRecording);
        if (!isRecording) {
            // Simulate speech-to-text start
            setCaptions("사용자의 말을 경청하고 있습니다...");
        } else {
            // Simulate processing and ElevenLabs response
            handleServerResponse("흥미롭군요. 그렇다면 본인의 기술적 강점이 실제 팀 프로젝트에서 어떻게 발휘되었는지 구체적인 사례를 들어주실 수 있나요?");
        }
    };

    const handleServerResponse = async (text: string) => {
        setCaptions(text);
        // In a real app, we would call the server TTS endpoint:
        // const response = await fetch('/api/v1/interview/tts', { method: 'POST', body: JSON.stringify({ text }) });
        // const blob = await response.blob();
        // const url = URL.createObjectURL(blob);
        // audioRef.current = new Audio(url);
        // audioRef.current.play();
    };

    return (
        <div className="container mx-auto px-6 pt-24 pb-12 h-[calc(100vh-64px)] flex flex-col">
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
