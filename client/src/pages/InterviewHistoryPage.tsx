import { useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Mic, Trash2, Clock, MessageSquare, TrendingUp, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useInterviewHistoryStore, type InterviewHistoryEntry } from '../lib/store';

const scoreLabel: Record<string, string> = {
    technical_accuracy: '기술 정확성',
    communication: '커뮤니케이션',
    problem_solving: '문제 해결력',
    job_fit: '직무 적합성',
    overall: '종합',
};

const scoreColors: Record<string, string> = {
    overall: '#a78bfa',
    technical_accuracy: '#34d399',
    communication: '#60a5fa',
    problem_solving: '#fbbf24',
    job_fit: '#f87171',
};

function ScoreBadge({ value }: { value: number }) {
    if (value >= 90) return <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 font-medium">우수</span>;
    if (value >= 80) return <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-400">양호</span>;
    if (value >= 60) return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-400">보통</span>;
    return <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-400">개선 필요</span>;
}

export default function InterviewHistoryPage() {
    const { entries, clearHistory } = useInterviewHistoryStore();
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // 차트 데이터: 날짜순 (오래된 것부터)
    const chartData = [...entries].reverse().map((entry, idx) => ({
        name: `#${idx + 1}`,
        date: new Date(entry.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        overall: entry.scores.overall ?? 0,
        technical_accuracy: entry.scores.technical_accuracy ?? 0,
        communication: entry.scores.communication ?? 0,
        problem_solving: entry.scores.problem_solving ?? 0,
        job_fit: entry.scores.job_fit ?? 0,
    }));

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
                            <Mic className="w-3.5 h-3.5" />
                            면접 시작
                        </Link>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-20 px-6">
                <div className="container mx-auto max-w-3xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <History className="w-8 h-8 text-violet-400" />
                                면접 히스토리
                            </h1>
                            <p className="text-neutral-400 mt-1">과거 면접 기록과 성장 추이를 확인하세요.</p>
                        </div>
                        {entries.length > 0 && (
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg flex items-center gap-1.5 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                초기화
                            </button>
                        )}
                    </div>

                    {entries.length === 0 ? (
                        <div className="text-center py-20">
                            <History className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-neutral-400 mb-2">아직 면접 기록이 없습니다</h2>
                            <p className="text-neutral-500 mb-6">AI 면접을 완료하면 자동으로 기록됩니다.</p>
                            <Link
                                to="/interview"
                                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition-colors"
                            >
                                <Mic className="w-4 h-4" />
                                첫 면접 시작하기
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Score Trend Chart */}
                            {chartData.length >= 2 && (
                                <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                                    <div className="flex items-center gap-3 mb-5">
                                        <TrendingUp className="w-5 h-5 text-violet-400" />
                                        <h3 className="font-semibold">점수 추이</h3>
                                        <span className="text-xs text-neutral-500">{chartData.length}회 면접</span>
                                    </div>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData}>
                                                <XAxis dataKey="date" tick={{ fill: '#a3a3a3', fontSize: 11 }} />
                                                <YAxis domain={[0, 100]} tick={{ fill: '#a3a3a3', fontSize: 11 }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                                                    labelStyle={{ color: '#a3a3a3' }}
                                                />
                                                <Legend
                                                    formatter={(value: string) => scoreLabel[value] || value}
                                                    wrapperStyle={{ fontSize: '11px' }}
                                                />
                                                <Line type="monotone" dataKey="overall" stroke={scoreColors.overall} strokeWidth={2.5} dot={{ r: 4 }} />
                                                <Line type="monotone" dataKey="technical_accuracy" stroke={scoreColors.technical_accuracy} strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 2" />
                                                <Line type="monotone" dataKey="communication" stroke={scoreColors.communication} strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 2" />
                                                <Line type="monotone" dataKey="problem_solving" stroke={scoreColors.problem_solving} strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 2" />
                                                <Line type="monotone" dataKey="job_fit" stroke={scoreColors.job_fit} strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 2" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* History List */}
                            <div className="space-y-3">
                                {entries.map((entry) => (
                                    <HistoryCard key={entry.id} entry={entry} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Clear Confirm Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-sm mx-4 shadow-2xl">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-7 h-7 text-red-400" />
                            </div>
                            <h2 className="text-lg font-bold mb-2">히스토리를 초기화하시겠습니까?</h2>
                            <p className="text-sm text-neutral-400">{entries.length}개의 면접 기록이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-sm transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => { clearHistory(); setShowClearConfirm(false); }}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-medium transition-colors"
                            >
                                초기화
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed inset-0 -z-10 h-full w-full bg-neutral-950">
                <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            </div>
        </div>
    );
}

function HistoryCard({ entry }: { entry: InterviewHistoryEntry }) {
    const overall = entry.scores.overall ?? 0;
    const borderColor = overall >= 80 ? 'border-emerald-500/20' : overall >= 60 ? 'border-amber-500/20' : 'border-red-500/20';
    const date = new Date(entry.date);

    return (
        <Link
            to={`/interview/feedback/${entry.sessionId}`}
            className={`block p-5 rounded-2xl border ${borderColor} bg-white/5 hover:bg-white/[0.07] transition-colors group`}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold" style={{ color: overall >= 80 ? '#34d399' : overall >= 60 ? '#fbbf24' : '#f87171' }}>
                            {overall}
                        </span>
                        <ScoreBadge value={overall} />
                        {entry.companyName && (
                            <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                                {entry.companyName}
                            </span>
                        )}
                    </div>
                    {entry.feedbackSummary && (
                        <p className="text-sm text-neutral-400 truncate mb-2">{entry.feedbackSummary}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                        <span>{date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {entry.totalQuestions}문항
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {Math.floor(entry.durationSeconds / 60)}분
                        </span>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-neutral-400 transition-colors shrink-0 ml-4" />
            </div>
            {/* Mini score bar */}
            <div className="mt-3 flex gap-2">
                {Object.entries(entry.scores)
                    .filter(([key]) => key !== 'overall')
                    .map(([key, value]) => (
                        <div key={key} className="flex-1">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] text-neutral-600">{scoreLabel[key]?.slice(0, 4)}</span>
                                <span className="text-[10px] text-neutral-500">{value}</span>
                            </div>
                            <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${value}%`,
                                        backgroundColor: scoreColors[key] || '#a3a3a3',
                                    }}
                                />
                            </div>
                        </div>
                    ))}
            </div>
        </Link>
    );
}
