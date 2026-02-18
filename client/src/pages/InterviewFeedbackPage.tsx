import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, TrendingUp, Target, Lightbulb } from 'lucide-react';
import { interviewAPI, type InterviewFeedback } from '../lib/api';
import { useInterviewStore } from '../lib/store';

export default function InterviewFeedbackPage() {
    const { sessionId } = useParams();
    const { clearConversation } = useInterviewStore();
    const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

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

    const scoreColor = (value: number) => {
        if (value >= 80) return 'text-emerald-400';
        if (value >= 60) return 'text-amber-400';
        return 'text-red-400';
    };

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
                        <Link to="/interview" className="text-neutral-400 hover:text-white text-sm">
                            다시 면접하기
                        </Link>
                        <Link to="/dashboard" className="text-neutral-400 hover:text-white text-sm">
                            대시보드로 이동
                        </Link>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-20 px-6">
                <div className="container mx-auto max-w-3xl">
                    <h1 className="text-3xl font-bold mb-2">면접 피드백</h1>
                    <p className="text-neutral-400 mb-8">AI가 분석한 모의 면접 결과를 확인하세요.</p>

                    {isLoading && (
                        <div className="flex flex-col items-center gap-3 text-neutral-400 py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                            <p>AI가 면접 내용을 분석하고 있습니다...</p>
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
                            {/* Summary */}
                            <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                                <div className="flex items-center gap-3 mb-3">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                    <h2 className="text-lg font-semibold">종합 평가</h2>
                                </div>
                                <p className="text-neutral-200 whitespace-pre-line">{feedback.feedback_summary}</p>
                                <p className="text-xs text-neutral-400 mt-3">
                                    총 {feedback.total_questions}문항 · {Math.floor(feedback.duration_seconds / 60)}분 {feedback.duration_seconds % 60}초
                                </p>
                            </div>

                            {/* Scores */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {Object.entries(feedback.scores).map(([key, value]) => (
                                    <div key={key} className={`p-4 rounded-xl bg-white/5 border border-white/10 ${key === 'overall' ? 'col-span-2 sm:col-span-1' : ''}`}>
                                        <p className="text-xs text-neutral-400">{scoreLabel[key] || key}</p>
                                        <p className={`text-2xl font-bold mt-1 ${scoreColor(value)}`}>{value}<span className="text-sm text-neutral-500">/100</span></p>
                                    </div>
                                ))}
                            </div>

                            {/* Strengths */}
                            {feedback.strengths && feedback.strengths.length > 0 && (
                                <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                                        <h3 className="text-lg font-semibold">강점</h3>
                                    </div>
                                    <ul className="space-y-2">
                                        {feedback.strengths.map((s, i) => (
                                            <li key={i} className="flex items-start gap-2 text-neutral-200 text-sm">
                                                <span className="text-emerald-400 mt-0.5 shrink-0">+</span>
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Improvements */}
                            {feedback.improvements && feedback.improvements.length > 0 && (
                                <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Target className="w-5 h-5 text-amber-400" />
                                        <h3 className="text-lg font-semibold">개선점</h3>
                                    </div>
                                    <ul className="space-y-2">
                                        {feedback.improvements.map((imp, i) => (
                                            <li key={i} className="flex items-start gap-2 text-neutral-200 text-sm">
                                                <span className="text-amber-400 mt-0.5 shrink-0">!</span>
                                                {imp}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Sample Answers */}
                            {feedback.sample_answers && feedback.sample_answers.length > 0 && (
                                <div className="p-6 rounded-2xl border border-violet-500/20 bg-violet-500/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Lightbulb className="w-5 h-5 text-violet-400" />
                                        <h3 className="text-lg font-semibold">답변 개선 제안</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {feedback.sample_answers.map((sa, i) => (
                                            <div key={i} className="bg-neutral-900/50 rounded-xl p-4">
                                                <p className="text-xs text-neutral-500 mb-1">Q. {sa.question}</p>
                                                <p className="text-sm text-neutral-200">{sa.suggestion}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Conversation Log */}
                            <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                                <h3 className="text-lg font-semibold mb-4">대화 기록</h3>
                                <div className="space-y-3">
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
