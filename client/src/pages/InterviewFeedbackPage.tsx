import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, TrendingUp, Target, Lightbulb, Clock, MessageSquare, RotateCcw, LayoutDashboard } from 'lucide-react';
import { interviewAPI, type InterviewFeedback } from '../lib/api';
import { useInterviewStore } from '../lib/store';

// ============ 원형 점수 게이지 ============

function ScoreGauge({ value, label, size = 100 }: { value: number; label: string; size?: number }) {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    const color = value >= 80 ? '#34d399' : value >= 60 ? '#fbbf24' : '#f87171';
    const bgColor = value >= 80 ? 'rgba(52,211,153,0.1)' : value >= 60 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)';

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6"
                    />
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none" stroke={color} strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold" style={{ color }}>{value}</span>
                </div>
            </div>
            <span className="text-xs text-neutral-400 text-center">{label}</span>
        </div>
    );
}

// ============ 점수 등급 배지 ============

function ScoreBadge({ value }: { value: number }) {
    if (value >= 90) return <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 font-medium">우수</span>;
    if (value >= 80) return <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-400">양호</span>;
    if (value >= 60) return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-400">보통</span>;
    return <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-400">개선 필요</span>;
}

// ============ 메인 컴포넌트 ============

export default function InterviewFeedbackPage() {
    const { sessionId } = useParams();
    const { clearConversation } = useInterviewStore();
    const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showConversation, setShowConversation] = useState(false);

    useEffect(() => {
        if (!sessionId) {
            setError('세션 정보를 찾을 수 없습니다.');
            return;
        }

        const loadFeedback = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await interviewAPI.getFeedback(sessionId);
                setFeedback(result);
                clearConversation();
            } catch (err) {
                setError(err instanceof Error ? err.message : '피드백을 불러오지 못했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        loadFeedback();
    }, [sessionId, clearConversation]);

    const scoreLabel: Record<string, string> = {
        technical_accuracy: '기술 정확성',
        communication: '커뮤니케이션',
        problem_solving: '문제 해결력',
        job_fit: '직무 적합성',
        overall: '종합 평가',
    };

    // overall 점수 기반 헤더 색상
    const overallScore = feedback?.scores?.overall ?? 0;
    const headerBorder = overallScore >= 80 ? 'border-emerald-500/30' : overallScore >= 60 ? 'border-amber-500/30' : 'border-red-500/30';
    const headerBg = overallScore >= 80 ? 'bg-emerald-500/5' : overallScore >= 60 ? 'bg-amber-500/5' : 'bg-red-500/5';

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100">
            <header className="fixed top-0 w-full border-b border-white/10 bg-neutral-950/80 backdrop-blur-md z-50">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-white">J</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight">JobFit</span>
                    </Link>
                    <div className="flex gap-4">
                        <Link to="/interview" className="text-neutral-400 hover:text-white text-sm flex items-center gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5" />
                            다시 면접하기
                        </Link>
                        <Link to="/dashboard" className="text-neutral-400 hover:text-white text-sm flex items-center gap-1.5">
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            대시보드
                        </Link>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-20 px-6">
                <div className="container mx-auto max-w-3xl">
                    <h1 className="text-3xl font-bold mb-2">면접 피드백</h1>
                    <p className="text-neutral-400 mb-8">AI가 분석한 모의 면접 결과를 확인하세요.</p>

                    {isLoading && (
                        <div className="flex flex-col items-center gap-4 text-neutral-400 py-20">
                            <div className="relative">
                                <Loader2 className="w-12 h-12 animate-spin text-violet-400" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-6 h-6 bg-violet-500/20 rounded-full animate-ping" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-medium text-neutral-200">AI가 면접 내용을 분석하고 있습니다</p>
                                <p className="text-sm text-neutral-500 mt-1">답변 품질, 기술 정확성, 직무 적합도를 종합 평가합니다...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            {error}
                        </div>
                    )}

                    {feedback && (
                        <div className="space-y-6">
                            {/* Summary + Overall Score */}
                            <div className={`p-6 rounded-2xl border ${headerBorder} ${headerBg}`}>
                                <div className="flex items-start justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                            <h2 className="text-lg font-semibold">종합 평가</h2>
                                            <ScoreBadge value={overallScore} />
                                        </div>
                                        <p className="text-neutral-200 whitespace-pre-line">{feedback.feedback_summary}</p>
                                        <div className="flex items-center gap-4 mt-4 text-xs text-neutral-400">
                                            <span className="flex items-center gap-1">
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                {feedback.total_questions}문항
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {Math.floor(feedback.duration_seconds / 60)}분 {feedback.duration_seconds % 60}초
                                            </span>
                                        </div>
                                    </div>
                                    <ScoreGauge value={overallScore} label="종합" size={110} />
                                </div>
                            </div>

                            {/* Score Gauges */}
                            <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                                <h3 className="text-sm font-semibold text-neutral-400 mb-5">영역별 점수</h3>
                                <div className="flex justify-around flex-wrap gap-4">
                                    {Object.entries(feedback.scores)
                                        .filter(([key]) => key !== 'overall')
                                        .map(([key, value]) => (
                                            <ScoreGauge
                                                key={key}
                                                value={value}
                                                label={scoreLabel[key] || key}
                                                size={90}
                                            />
                                        ))}
                                </div>
                            </div>

                            {/* Strengths & Improvements side by side */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Strengths */}
                                {feedback.strengths && feedback.strengths.length > 0 && (
                                    <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                                        <div className="flex items-center gap-2 mb-3">
                                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                                            <h3 className="font-semibold">강점</h3>
                                        </div>
                                        <ul className="space-y-2">
                                            {feedback.strengths.map((s, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-neutral-200">
                                                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs shrink-0 mt-0.5">+</span>
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Improvements */}
                                {feedback.improvements && feedback.improvements.length > 0 && (
                                    <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Target className="w-5 h-5 text-amber-400" />
                                            <h3 className="font-semibold">개선점</h3>
                                        </div>
                                        <ul className="space-y-2">
                                            {feedback.improvements.map((imp, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-neutral-200">
                                                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs shrink-0 mt-0.5">!</span>
                                                    {imp}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Sample Answers */}
                            {feedback.sample_answers && feedback.sample_answers.length > 0 && (
                                <div className="p-6 rounded-2xl border border-violet-500/20 bg-violet-500/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Lightbulb className="w-5 h-5 text-violet-400" />
                                        <h3 className="text-lg font-semibold">답변 개선 제안</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {feedback.sample_answers.map((sa, i) => (
                                            <div key={i} className="bg-neutral-900/50 rounded-xl p-4 border border-white/5">
                                                <p className="text-xs text-violet-400 font-medium mb-2">Q. {sa.question}</p>
                                                <p className="text-sm text-neutral-200 leading-relaxed">{sa.suggestion}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Conversation Log (Collapsible) */}
                            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                                <button
                                    onClick={() => setShowConversation(!showConversation)}
                                    className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <MessageSquare className="w-5 h-5 text-neutral-400" />
                                        <h3 className="font-semibold">대화 기록</h3>
                                        <span className="text-xs text-neutral-500">{feedback.conversation.length}개 메시지</span>
                                    </div>
                                    <span className={`text-neutral-500 transition-transform ${showConversation ? 'rotate-180' : ''}`}>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                                    </span>
                                </button>
                                {showConversation && (
                                    <div className="px-5 pb-5 space-y-3">
                                        {feedback.conversation.map((item, index) => (
                                            <div key={`${item.timestamp}-${index}`} className={`p-3 rounded-lg ${
                                                item.role === 'interviewer' ? 'bg-neutral-900' : 'bg-violet-900/30'
                                            }`}>
                                                <p className="text-xs text-neutral-500 mb-1">
                                                    {item.role === 'interviewer' ? '면접관' : '지원자'}
                                                </p>
                                                <p className="text-sm text-neutral-200">{item.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <div className="fixed inset-0 -z-10 h-full w-full bg-neutral-950">
                <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            </div>
        </div>
    );
}
