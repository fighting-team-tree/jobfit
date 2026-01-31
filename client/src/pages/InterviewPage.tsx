import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Loader2, AlertCircle } from 'lucide-react';
import { interviewAPI, type InterviewSession } from '../lib/api';
import { useProfileStore, useInterviewStore } from '../lib/store';

export default function InterviewPage() {
    const navigate = useNavigate();
    const { resumeAnalysis, jdText } = useProfileStore();
    const {
        sessionId, isActive, currentQuestion, questionNumber, totalQuestions,
        conversation, startSession, setQuestion, addMessage, endSession
    } = useInterviewStore();

    const [isStarting, setIsStarting] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioPlaying, setAudioPlaying] = useState(false);

    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize speech recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'ko-KR';

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setTranscript((prev) => prev + finalTranscript);
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const handleStartInterview = async () => {
        if (!resumeAnalysis || !jdText) {
            setError('프로필과 채용공고 분석을 먼저 완료해주세요.');
            return;
        }

        setIsStarting(true);
        setError(null);

        try {
            const session = await interviewAPI.startInterview(
                resumeAnalysis,
                jdText,
                'professional',
                5
            );

            startSession(session.session_id, session.total_questions);
            setQuestion(session.question, session.question_number);
            addMessage('interviewer', session.question);
        } catch (err) {
            setError(err instanceof Error ? err.message : '면접 시작에 실패했습니다.');
        } finally {
            setIsStarting(false);
        }
    };

    const toggleListening = () => {
        if (!recognitionRef.current) {
            setError('음성 인식이 지원되지 않는 브라우저입니다.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!sessionId || !transcript.trim()) return;

        setIsSending(true);
        addMessage('candidate', transcript);
        const answer = transcript;
        setTranscript('');

        try {
            const response = await interviewAPI.respond(sessionId, answer);

            if (response.status === 'completed') {
                endSession();
                // Navigate to feedback page
                navigate(`/interview/feedback/${sessionId}`);
            } else if (response.question) {
                setQuestion(response.question, response.question_number);
                addMessage('interviewer', response.question);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '답변 전송에 실패했습니다.');
        } finally {
            setIsSending(false);
        }
    };

    const handleEndInterview = async () => {
        if (sessionId) {
            endSession();
            navigate(`/interview/feedback/${sessionId}`);
        }
    };

    // Check prerequisites
    if (!resumeAnalysis) {
        return (
            <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">프로필 설정이 필요합니다</h1>
                    <Link to="/profile" className="text-indigo-400 hover:underline">
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
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-white">J</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight">JobFit</span>
                    </Link>
                    {isActive && (
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-neutral-400">
                                질문 {questionNumber} / {totalQuestions}
                            </span>
                            <button
                                onClick={handleEndInterview}
                                className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                            >
                                <PhoneOff className="w-4 h-4" />
                                종료
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6">
                {!isActive ? (
                    // Start Screen
                    <div className="text-center w-full max-w-2xl">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <Mic className="w-12 h-12 text-violet-400" />
                        </div>
                        <h1 className="text-3xl font-bold mb-4">AI 모의 면접</h1>
                        <p className="text-neutral-400 mb-8">
                            실시간 음성 AI 면접관과 함께 면접 연습을 시작하세요.
                        </p>

                        <button
                            onClick={handleStartInterview}
                            disabled={isStarting}
                            className="px-8 py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-700 rounded-xl font-medium text-lg flex items-center gap-3 mx-auto transition-colors"
                        >
                            {isStarting ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    면접 준비 중...
                                </>
                            ) : (
                                <>
                                    <Phone className="w-6 h-6" />
                                    면접 시작하기
                                </>
                            )}
                        </button>

                        {error && (
                            <p className="mt-4 text-red-400">{error}</p>
                        )}
                    </div>
                ) : (
                    // Interview Session - Two Column Layout
                    <div className="w-full max-w-6xl flex gap-6">
                        {/* Left Column - Interview Area */}
                        <div className="flex-1 max-w-2xl">
                            {/* Interviewer Avatar */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                    <Volume2 className={`w-8 h-8 ${audioPlaying ? 'animate-pulse' : ''}`} />
                                </div>
                                <div>
                                    <h3 className="font-semibold">AI 면접관</h3>
                                    <p className="text-sm text-neutral-400">전문적 · 친절한 면접관</p>
                                </div>
                            </div>

                            {/* Current Question */}
                            <div className="p-6 bg-neutral-900 rounded-2xl mb-6">
                                <p className="text-lg">{currentQuestion}</p>
                            </div>

                            {/* Answer Input */}
                            <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm text-neutral-400">나의 답변</span>
                                    <button
                                        onClick={toggleListening}
                                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isListening
                                            ? 'bg-red-500 animate-pulse'
                                            : 'bg-violet-600 hover:bg-violet-500'
                                            }`}
                                    >
                                        {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                                    </button>
                                </div>

                                <textarea
                                    value={transcript}
                                    onChange={(e) => setTranscript(e.target.value)}
                                    placeholder={isListening ? '듣고 있습니다...' : '마이크 버튼을 누르거나 직접 입력하세요'}
                                    className="w-full h-32 bg-transparent border-none resize-none focus:outline-none text-lg placeholder:text-neutral-600"
                                />

                                <div className="flex justify-end mt-4">
                                    <button
                                        onClick={handleSubmitAnswer}
                                        disabled={isSending || !transcript.trim()}
                                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-xl font-medium flex items-center gap-2 transition-colors"
                                    >
                                        {isSending ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                전송 중...
                                            </>
                                        ) : (
                                            '답변 제출'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Conversation History */}
                        <div className="w-80 flex-shrink-0">
                            <div className="sticky top-24 p-4 bg-white/5 rounded-2xl border border-white/10 h-[calc(100vh-150px)]">
                                <h4 className="text-sm font-medium text-neutral-400 mb-4 flex items-center gap-2">
                                    💬 대화 기록
                                    <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded-full text-xs">
                                        {conversation.length}
                                    </span>
                                </h4>
                                <div className="space-y-3 overflow-y-auto h-[calc(100%-40px)] pr-2">
                                    {conversation.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`p-3 rounded-lg text-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${msg.role === 'interviewer'
                                                ? 'bg-violet-500/10 text-violet-200 border-l-2 border-violet-500'
                                                : 'bg-indigo-500/10 text-indigo-200 border-l-2 border-indigo-500'
                                                }`}
                                        >
                                            <span className="font-medium text-xs block mb-1 opacity-60">
                                                {msg.role === 'interviewer' ? '🎤 면접관' : '👤 나'}
                                            </span>
                                            <span className="line-clamp-4">{msg.content}</span>
                                        </div>
                                    ))}
                                    {conversation.length === 0 && (
                                        <p className="text-neutral-500 text-sm text-center py-8">
                                            대화가 시작되면 여기에 표시됩니다
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Background */}
            <div className="fixed inset-0 -z-10 h-full w-full bg-neutral-950">
                <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
                <div className="absolute top-0 w-full h-[400px] bg-gradient-to-b from-violet-500/10 to-transparent blur-3xl opacity-30"></div>
            </div>
        </div>
    );
}
