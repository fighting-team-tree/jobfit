import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Mic, Phone, PhoneOff, Volume2, Loader2, AlertCircle, Settings } from 'lucide-react';
import { useConversation } from '@elevenlabs/react';
import { analysisAPI } from '../lib/api';
import { useProfileStore, useInterviewStore } from '../lib/store';

const API_BASE = import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1');

export default function InterviewPage() {
    const { profile: resumeAnalysis, setProfile } = useProfileStore();
    const {
        startSession, endSession, addMessage, conversation: chatHistory
    } = useInterviewStore();

    const [status, setStatus] = useState<string>('준비');
    const [agentIdInput, setAgentIdInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [isAutoLoading, setIsAutoLoading] = useState(false);

    // TEST_MODE: 프로필 없으면 fixture 자동 로드
    useEffect(() => {
        if (!resumeAnalysis) {
            analysisAPI.getFixtures().then(async (res) => {
                if (res.test_mode && res.profiles.length > 0) {
                    setIsAutoLoading(true);
                    try {
                        const result = await analysisAPI.loadFixture(res.profiles[0].name);
                        if (result.structured) {
                            setProfile(result.structured);
                        }
                    } catch {
                        // fixture 로드 실패 시 기존 동작 유지
                    } finally {
                        setIsAutoLoading(false);
                    }
                }
            }).catch(() => {});
        }
    }, [resumeAnalysis, setProfile]);

    // ElevenLabs Conversation Hook
    const conversation = useConversation({
        onConnect: () => setStatus('연결됨'),
        onDisconnect: () => {
            setStatus('연결 종료');
            endSession(); // End internal session state
        },
        onMessage: (message) => {
            // Visualize chat - ElevenLabs SDK uses 'ai' for agent messages
            if (message.source === 'user' || message.source === 'ai') {
                addMessage(
                    message.source === 'ai' ? 'interviewer' : 'user',
                    message.message
                );
            }
        },
        onError: (error) => {
            console.error(error);
            setStatus(`에러: ${error}`);
        },
    });

    // Start Interview Handler
    const handleStartInterview = async () => {
        try {
            setStatus('인증 토큰 요청 중...');

            // 1. Get Authentication (Agent ID & Signed URL) from Backend
            const response = await fetch(`${API_BASE}/interview/agent-auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            let agentId = data.agent_id;

            // Fallback: If backend doesn't have ID, use Input
            if (!agentId && agentIdInput) {
                // If using direct input, we might not have signed URL (insecure but works for local testing)
                agentId = agentIdInput;
            }

            if (!agentId) {
                alert("Agent ID가 설정되지 않았습니다. 설정 버튼을 눌러 ID를 입력하거나 서버 .env를 확인하세요.");
                setStatus('설정 필요');
                return;
            }

            setStatus('연결 중...');

            // 2. Connect to ElevenLabs
            // To pass dynamic variables (Resume, JD), we need to use 'clientTools' or 'overrides'
            // But basic agent just starts here.

            // Dynamic Variables Injection (Best Practice)
            // Need to configure variables in Agent settings first, e.g. {{resume}}, {{job_description}}
            // Then pass them here. 
            // NOTE: @elevenlabs/react v0.0.x might support dynamic variables via 'dynamicVariables' prop in startSession?

            const startOptions: any = {
                agentId: agentId,
            };

            // If we have signed URL (for secured agents)
            // Note: The SDK might not support signedUrl directly in startSession yet? 
            // Check SDK version. Usually it handles auth internally if api key provided OR uses signed url.
            // If using public agent, just agentId is enough.

            await conversation.startSession(startOptions);

            startSession('agent-session', 5); // Start UI session
            setStatus('면접 진행 중');

        } catch (e: any) {
            console.error(e);
            setStatus(`시작 실패: ${e.message}`);
        }
    };

    const handleEndInterview = async () => {
        await conversation.endSession();
        endSession();
        // Navigate or show summary
    };

    // Auto-scroll logic for chat
    const chatContainerRef = useCallback((node: HTMLDivElement) => {
        if (node) {
            node.scrollTop = node.scrollHeight;
        }
    }, [chatHistory]);

    // Check prerequisites
    if (!resumeAnalysis) {
        if (isAutoLoading) {
            return (
                <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-spin" />
                        <h1 className="text-xl font-bold mb-2">테스트 프로필 로딩 중...</h1>
                        <p className="text-neutral-400 text-sm">TEST MODE: fixture 프로필을 자동으로 불러오고 있습니다.</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">프로필 설정이 필요합니다</h1>
                    <Link to="/profile" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg mt-4 inline-block">
                        프로필 설정으로 이동
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
            {/* Header */}
            <header className="border-b border-white/10 bg-neutral-950/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <span className="font-bold text-xl tracking-tight">JobFit AI</span>
                    </Link>

                    <button onClick={() => setShowSettings(!showSettings)} className="text-neutral-400 hover:text-white">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Settings Modal (Temporary) */}
            {showSettings && (
                <div className="absolute top-16 right-6 bg-neutral-800 p-4 rounded-lg border border-white/10 z-50 w-80 shadow-xl">
                    <h3 className="font-medium mb-2">설정 (개발용)</h3>
                    <label className="block text-xs text-neutral-400 mb-1">Agent ID</label>
                    <input
                        type="text"
                        value={agentIdInput}
                        onChange={(e) => setAgentIdInput(e.target.value)}
                        placeholder="ElevenLabs Agent ID 입력"
                        className="w-full bg-neutral-900 border border-white/20 rounded px-2 py-1 text-sm mb-2"
                    />
                    <p className="text-xs text-neutral-500">
                        * 서버 .env에 ELEVENLABS_AGENT_ID를 설정하면 자동 로드됩니다.
                    </p>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6">
                {conversation.status !== 'connected' ? (
                    // Start Screen
                    <div className="text-center w-full max-w-2xl">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-violet-500/20 flex items-center justify-center animate-pulse-slow">
                            <Mic className="w-12 h-12 text-violet-400" />
                        </div>
                        <h1 className="text-3xl font-bold mb-4">AI 실시간 면접 (Agent Ver.)</h1>
                        <p className="text-neutral-400 mb-8">
                            ElevenLabs Conversational AI가 면접을 진행합니다.<br />
                            자연스럽게 대화하고, 언제든 말을 끊을 수 있습니다.
                        </p>

                        <button
                            onClick={handleStartInterview}
                            disabled={conversation.status === 'connecting'}
                            className="px-8 py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-700 rounded-xl font-medium text-lg flex items-center gap-3 mx-auto transition-colors"
                        >
                            {conversation.status === 'connecting' ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    연결 중...
                                </>
                            ) : (
                                <>
                                    <Phone className="w-6 h-6" />
                                    면접 시작하기
                                </>
                            )}
                        </button>
                        <p className="mt-4 text-sm text-neutral-500">{status}</p>
                    </div>
                ) : (
                    // Active Session
                    <div className="w-full max-w-6xl flex gap-6 h-[80vh]">
                        {/* Visualizer */}
                        <div className="flex-1 bg-neutral-900 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden border border-white/5">
                            <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${conversation.isSpeaking ? 'bg-violet-500 shadow-[0_0_80px_rgba(139,92,246,0.6)] scale-110' : 'bg-neutral-800'}`}>
                                <Volume2 className={`w-20 h-20 text-white ${conversation.isSpeaking ? 'animate-bounce' : ''}`} />
                            </div>
                            <div className="mt-8">
                                <span className={`px-3 py-1 rounded-full text-sm ${conversation.isSpeaking ? 'bg-violet-500/20 text-violet-300' : 'bg-neutral-800 text-neutral-400'}`}>
                                    {conversation.isSpeaking ? 'AI가 말하는 중...' : '듣고 있음...'}
                                </span>
                            </div>

                            <button
                                onClick={handleEndInterview}
                                className="absolute bottom-8 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <PhoneOff className="w-4 h-4" />
                                면접 종료
                            </button>
                        </div>

                        {/* Transcript */}
                        <div className="w-full max-w-md bg-white/5 rounded-2xl border border-white/10 flex flex-col">
                            <div className="p-4 border-b border-white/10 bg-neutral-900/50">
                                <h3 className="font-semibold text-sm text-neutral-300">실시간 대화</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
                                {chatHistory.map((msg: any, i: number) => (
                                    <div key={i} className={`flex ${msg.role === 'interviewer' ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'interviewer'
                                            ? 'bg-neutral-800 text-neutral-200 rounded-tl-none'
                                            : 'bg-violet-600 text-white rounded-tr-none'
                                            }`}>
                                            <p className="text-sm">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
