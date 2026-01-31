import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { interviewAPI, type InterviewFeedback } from '../lib/api';

export default function InterviewFeedbackPage() {
    const { sessionId } = useParams();
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
            } catch (err) {
                setError(err instanceof Error ? err.message : '피드백을 불러오지 못했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        loadFeedback();
    }, [sessionId]);

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
                    <Link to="/dashboard" className="text-neutral-400 hover:text-white text-sm">
                        대시보드로 이동
                    </Link>
                </div>
            </header>

            <main className="pt-24 pb-20 px-6">
                <div className="container mx-auto max-w-3xl">
                    <h1 className="text-3xl font-bold mb-2">면접 피드백</h1>
                    <p className="text-neutral-400 mb-8">모의 면접 결과를 확인하세요.</p>

                    {isLoading && (
                        <div className="flex items-center gap-3 text-neutral-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            피드백 불러오는 중...
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
                            <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                                <div className="flex items-center gap-3 mb-3">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                    <h2 className="text-lg font-semibold">요약</h2>
                                </div>
                                <p className="text-neutral-200 whitespace-pre-line">{feedback.feedback_summary}</p>
                                <p className="text-xs text-neutral-400 mt-3">
                                    총 {feedback.total_questions}문항 · {feedback.duration_seconds}초
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(feedback.scores).map(([key, value]) => (
                                    <div key={key} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                        <p className="text-xs text-neutral-400 uppercase">{key}</p>
                                        <p className="text-2xl font-bold mt-1">{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                                <h3 className="text-lg font-semibold mb-4">대화 기록</h3>
                                <div className="space-y-3">
                                    {feedback.conversation.map((item, index) => (
                                        <div key={`${item.timestamp}-${index}`} className="p-3 rounded-lg bg-neutral-900">
                                            <p className="text-xs text-neutral-500 mb-1">{item.role}</p>
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
