import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, Clock, ExternalLink, ArrowLeft, Loader2, AlertCircle, Code2, FileQuestion, Calendar, Send } from 'lucide-react';
import { roadmapAPI, problemAPI, profileAPI, type Roadmap } from '../lib/api';
import { useProfileStore, useProblemStore } from '../lib/store';

export default function RoadmapPage() {
    const navigate = useNavigate();
    const { gapAnalysis } = useProfileStore();
    const { weekProblems, setWeekProblems } = useProblemStore();

    const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [completedTodos, setCompletedTodos] = useState<Set<number>>(new Set());
    const [generatingWeek, setGeneratingWeek] = useState<number | null>(null);
    const [weekErrors, setWeekErrors] = useState<Record<number, string>>({});
    const [showSolution, setShowSolution] = useState<Record<string, boolean>>({});

    // Google Calendar & Discord state
    const [googleConnected, setGoogleConnected] = useState(false);
    const [discordWebhookSet, setDiscordWebhookSet] = useState(false);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
    const [calendarSyncStatus, setCalendarSyncStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [sendingDiscordWeek, setSendingDiscordWeek] = useState<number | null>(null);
    const [discordStatus, setDiscordStatus] = useState<Record<number, { type: 'success' | 'error', text: string } | null>>({});

    const completionRate = useMemo(() => {
        if (!roadmap || roadmap.weekly_plans.length === 0) return 0;
        const totalTodos = roadmap.weekly_plans.reduce((acc, w) => acc + w.todos.length, 0);
        return totalTodos > 0 ? Math.round((completedTodos.size / totalTodos) * 100) : 0;
    }, [roadmap, completedTodos]);

    const generateRoadmap = useCallback(async () => {
        if (!gapAnalysis) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await roadmapAPI.generate(gapAnalysis, 10, 4);
            setRoadmap(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : '로드맵 생성에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [gapAnalysis]);

    useEffect(() => {
        if (gapAnalysis) {
            generateRoadmap();
        }
        profileAPI.getMyProfile().then((res) => {
            setGoogleConnected(!!res.google_connected);
            setDiscordWebhookSet(!!res.discord_webhook_url);
        }).catch((err) => {
            console.error('프로필 상태 확인 실패', err);
        });
    }, [gapAnalysis, generateRoadmap]);

    const handleSyncCalendar = async () => {
        if (!roadmap?.id) {
            setCalendarSyncStatus({ type: 'error', text: '로드맵이 아직 생성되지 않았거나 ID가 없습니다.' });
            return;
        }
        if (!startDate) {
            setCalendarSyncStatus({ type: 'error', text: '시작 날짜를 선택해주세요.' });
            return;
        }
        setIsSyncingCalendar(true);
        setCalendarSyncStatus(null);
        try {
            const res = await roadmapAPI.syncCalendar(roadmap.id, startDate);
            setCalendarSyncStatus({ type: 'success', text: res.message || '구글 캘린더에 학습 일정이 성공적으로 등록되었습니다!' });
        } catch (err) {
            setCalendarSyncStatus({ type: 'error', text: err instanceof Error ? err.message : '캘린더 동기화 중 오류가 발생했습니다.' });
        } finally {
            setIsSyncingCalendar(false);
        }
    };

    const handleNotifyDiscord = async (weekNumber: number) => {
        if (!roadmap?.id) {
            alert('로드맵 ID가 존재하지 않습니다.');
            return;
        }
        setSendingDiscordWeek(weekNumber);
        setDiscordStatus(prev => ({ ...prev, [weekNumber]: null }));
        try {
            const res = await roadmapAPI.notifyDiscord(roadmap.id, weekNumber);
            setDiscordStatus(prev => ({
                ...prev,
                [weekNumber]: { type: 'success', text: res.message || '디스코드 전송 완료!' }
            }));
        } catch (err) {
            setDiscordStatus(prev => ({
                ...prev,
                [weekNumber]: { type: 'error', text: err instanceof Error ? err.message : '전송 실패' }
            }));
        } finally {
            setSendingDiscordWeek(null);
        }
    };

    const toggleTodo = async (todoId: number) => {
        const newCompleted = new Set(completedTodos);
        if (newCompleted.has(todoId)) {
            newCompleted.delete(todoId);
        } else {
            newCompleted.add(todoId);
            await roadmapAPI.completeTodo(todoId);
        }
        setCompletedTodos(newCompleted);
    };

    const generateProblemsForWeek = async (weekNumber: number, skills: string[]) => {
        setGeneratingWeek(weekNumber);
        setWeekErrors(prev => ({ ...prev, [weekNumber]: '' }));
        try {
            const problems = await problemAPI.generateProblems({
                week_number: weekNumber,
                skills,
                count: 3,
            });
            if (problems.length === 0) {
                setWeekErrors(prev => ({ ...prev, [weekNumber]: '문제 생성에 실패했습니다. 다시 시도해 주세요.' }));
            }
            // 스토어에 저장 (persist로 localStorage에도 저장됨)
            setWeekProblems(weekNumber, problems);
        } catch (err) {
            console.error('Failed to generate problems:', err);
            const errorMessage = err instanceof Error ? err.message : '문제 생성 중 오류가 발생했습니다.';
            setWeekErrors(prev => ({ ...prev, [weekNumber]: errorMessage }));
        } finally {
            setGeneratingWeek(null);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-400 bg-red-500/10';
            case 'medium': return 'text-yellow-400 bg-yellow-500/10';
            case 'low': return 'text-green-400 bg-green-500/10';
            default: return 'text-neutral-400 bg-neutral-500/10';
        }
    };

    if (!gapAnalysis) {
        return (
            <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">갭 분석을 먼저 완료해주세요</h1>
                    <p className="text-neutral-400 mb-4">로드맵 생성을 위해 프로필 분석과 JD 갭 분석이 필요합니다.</p>
                    <Link to="/dashboard" className="text-indigo-400 hover:underline">
                        대시보드로 이동
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* Header */}
            <header className="fixed top-0 w-full border-b border-white/10 bg-neutral-950/80 backdrop-blur-md z-50">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-white">J</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight">JobFit</span>
                    </Link>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        대시보드로 돌아가기
                    </button>
                </div>
            </header>

            <main className="pt-24 pb-20 px-6">
                <div className="container mx-auto max-w-5xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                            <BookOpen className="w-7 h-7 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">{roadmap?.title || '학습 로드맵'}</h1>
                            <p className="text-neutral-400">{roadmap?.summary || '맞춤형 학습 계획을 생성합니다.'}</p>
                        </div>
                    </div>

                    {isLoading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                            <span className="ml-3 text-neutral-400">로드맵 생성 중...</span>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                            {error}
                        </div>
                    )}

                    {roadmap && (
                        <>
                            {/* Stats Overview */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-sm text-neutral-400">총 학습 시간</p>
                                    <p className="text-2xl font-bold">{roadmap.total_estimated_hours}시간</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-sm text-neutral-400">학습 주차</p>
                                    <p className="text-2xl font-bold">{roadmap.weekly_plans.length}주</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-sm text-neutral-400">완료율</p>
                                    <p className="text-2xl font-bold">
                                        {completionRate}%
                                    </p>
                                </div>
                            </div>

                            {/* Google Calendar Sync Panel */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 mb-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                            <Calendar className="w-5 h-5 text-red-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold">Google Calendar 연동</h3>
                                            <p className="text-xs text-neutral-400">
                                                {googleConnected 
                                                    ? '학습 시작일을 선택하고 캘린더에 전체 일정을 등록해보세요.'
                                                    : '구글 캘린더에 일정을 동기화하려면 먼저 프로필에서 Google 계정을 연동해주세요.'}
                                            </p>
                                        </div>
                                    </div>

                                    {googleConnected ? (
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-neutral-400 whitespace-nowrap">시작일:</span>
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-red-500"
                                                />
                                            </div>
                                            <button
                                                onClick={handleSyncCalendar}
                                                disabled={isSyncingCalendar}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-xs font-semibold rounded-lg text-white flex items-center justify-center gap-1.5 transition-colors disabled:cursor-not-allowed"
                                            >
                                                {isSyncingCalendar ? (
                                                    <>
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        동기화 중...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        캘린더에 등록
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <Link
                                            to="/profile"
                                            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold rounded-lg text-neutral-200 text-center transition-colors border border-white/10"
                                        >
                                            계정 연동하러 가기
                                        </Link>
                                    )}
                                </div>
                                {calendarSyncStatus && (
                                    <div className={`text-xs mt-3 p-3 rounded-lg border ${
                                        calendarSyncStatus.type === 'success' 
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                                    }`}>
                                        {calendarSyncStatus.text}
                                    </div>
                                )}
                            </div>

                            {/* Weekly Plans */}
                            <div className="space-y-6">
                                {roadmap.weekly_plans.map((week) => (
                                    <div key={week.week_number} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                                            <div className="flex-1 min-w-[200px]">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h3 className="text-lg font-semibold">Week {week.week_number}</h3>
                                                    
                                                    {discordWebhookSet ? (
                                                        <button
                                                            onClick={() => handleNotifyDiscord(week.week_number)}
                                                            disabled={sendingDiscordWeek === week.week_number}
                                                            className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 disabled:opacity-50 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                                                        >
                                                            {sendingDiscordWeek === week.week_number ? (
                                                                <>
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                    알림 전송 중...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Send className="w-3 h-3" />
                                                                    Discord 알림 전송
                                                                </>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <Link
                                                            to="/profile"
                                                            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-300 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors border border-white/5"
                                                        >
                                                            <Send className="w-3 h-3" />
                                                            Discord 연동 필요
                                                        </Link>
                                                    )}
                                                </div>
                                                <p className="text-sm text-neutral-400 mt-1">{week.theme}</p>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-neutral-400">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {week.total_hours}시간
                                                </div>
                                            </div>
                                        </div>

                                        {discordStatus[week.week_number] && (
                                            <div className={`text-xs mb-4 p-2 rounded-lg border ${
                                                discordStatus[week.week_number]?.type === 'success'
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                                            }`}>
                                                {discordStatus[week.week_number]?.text}
                                            </div>
                                        )}

                                        {/* Goals */}
                                        <div className="mb-4">
                                            <p className="text-xs text-neutral-500 mb-2">이번 주 목표</p>
                                            <div className="flex flex-wrap gap-2">
                                                {week.goals.map((goal, i) => (
                                                    <span key={i} className="px-2 py-1 bg-indigo-500/10 text-indigo-300 rounded-full text-xs">
                                                        {goal}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Todos */}
                                        <div className="space-y-2">
                                            {week.todos.map((todo) => (
                                                <div
                                                    key={todo.id}
                                                    className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${completedTodos.has(todo.id) ? 'bg-emerald-500/10' : 'bg-neutral-900'
                                                        }`}
                                                >
                                                    <button
                                                        onClick={() => toggleTodo(todo.id)}
                                                        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${completedTodos.has(todo.id)
                                                                ? 'bg-emerald-500 border-emerald-500'
                                                                : 'border-neutral-600 hover:border-emerald-500'
                                                            }`}
                                                    >
                                                        {completedTodos.has(todo.id) && <CheckCircle className="w-3 h-3 text-white" />}
                                                    </button>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className={`font-medium ${completedTodos.has(todo.id) ? 'line-through text-neutral-500' : ''}`}>
                                                                {todo.task}
                                                            </p>
                                                            <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(todo.priority)}`}>
                                                                {todo.priority}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 mt-1 text-xs text-neutral-500">
                                                            <span>{todo.skill}</span>
                                                            <span>{todo.estimated_hours}시간</span>
                                                        </div>
                                                        {todo.resources.length > 0 && (
                                                            <div className="flex items-center gap-2 mt-2">
                                                                {todo.resources.filter(r => r).map((resource, i) => (
                                                                    <a
                                                                        key={i}
                                                                        href={resource.startsWith('http') ? resource : '#'}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-1 text-xs text-indigo-400 hover:underline"
                                                                    >
                                                                        <ExternalLink className="w-3 h-3" />
                                                                        {resource.length > 30 ? resource.substring(0, 30) + '...' : resource}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Practice Problems Section */}
                                        <div className="mt-4 pt-4 border-t border-white/10">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                                                    <Code2 className="w-4 h-4" />
                                                    연습 문제
                                                </h4>
                                                <button
                                                    onClick={() => generateProblemsForWeek(
                                                        week.week_number,
                                                        [...new Set(week.todos.map(t => t.skill))]
                                                    )}
                                                    disabled={generatingWeek === week.week_number}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed rounded-lg transition-colors"
                                                >
                                                    {generatingWeek === week.week_number ? (
                                                        <>
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            생성 중...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FileQuestion className="w-3 h-3" />
                                                            문제 생성
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {weekProblems[week.week_number] && weekProblems[week.week_number].length > 0 ? (
                                                <div className="space-y-3">
                                                    {weekProblems[week.week_number].map((problem) => (
                                                        <div key={problem.id} className="rounded-lg bg-neutral-900 overflow-hidden">
                                                            <div className="flex items-center justify-between p-3 hover:bg-neutral-800 transition-colors">
                                                                <Link
                                                                    to={`/problem/${problem.id}`}
                                                                    className="flex items-center gap-3 flex-1"
                                                                >
                                                                    <div className={`w-2 h-2 rounded-full ${
                                                                        problem.difficulty === 'easy' ? 'bg-green-400' :
                                                                        problem.difficulty === 'medium' ? 'bg-yellow-400' : 'bg-red-400'
                                                                    }`} />
                                                                    <span className="text-sm font-medium">{problem.title}</span>
                                                                    <span className="text-xs text-neutral-500">{problem.skill}</span>
                                                                </Link>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                                                        problem.type === 'coding' ? 'bg-blue-500/20 text-blue-300' :
                                                                        problem.type === 'quiz' ? 'bg-purple-500/20 text-purple-300' :
                                                                        'bg-orange-500/20 text-orange-300'
                                                                    }`}>
                                                                        {problem.type}
                                                                    </span>
                                                                    {problem.solution && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                setShowSolution(prev => ({
                                                                                    ...prev,
                                                                                    [problem.id]: !prev[problem.id]
                                                                                }));
                                                                            }}
                                                                            className={`text-xs px-2 py-1 rounded transition-colors ${
                                                                                showSolution[problem.id]
                                                                                    ? 'bg-green-500/30 text-green-300'
                                                                                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                                                                            }`}
                                                                        >
                                                                            {showSolution[problem.id] ? '해답 숨기기' : '해답 보기'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {showSolution[problem.id] && problem.solution && (
                                                                <div className="px-3 pb-3 space-y-2 border-t border-neutral-800">
                                                                    <div className="pt-2">
                                                                        <h5 className="text-xs font-semibold text-green-400 mb-1">💡 정답 코드</h5>
                                                                        <pre className="text-xs bg-neutral-950 p-2 rounded overflow-x-auto text-neutral-200">
                                                                            <code>{problem.solution}</code>
                                                                        </pre>
                                                                    </div>
                                                                    {problem.explanation && (
                                                                        <div>
                                                                            <h5 className="text-xs font-semibold text-blue-400 mb-1">📝 풀이 설명</h5>
                                                                            <p className="text-xs text-neutral-400 whitespace-pre-wrap">{problem.explanation}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : weekErrors[week.week_number] ? (
                                                <p className="text-xs text-red-400 text-center py-2">
                                                    {weekErrors[week.week_number]}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-neutral-500 text-center py-2">
                                                    아직 생성된 문제가 없습니다. "문제 생성" 버튼을 클릭하세요.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-8 flex gap-4">
                                <button
                                    onClick={() => navigate('/interview')}
                                    className="flex-1 px-6 py-4 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    🎙️ 모의 면접 시작하기
                                </button>
                                <button
                                    onClick={generateRoadmap}
                                    disabled={isLoading}
                                    className="px-6 py-4 bg-neutral-800 hover:bg-neutral-700 rounded-xl font-medium transition-colors"
                                >
                                    🔄 다시 생성
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Background */}
            <div className="fixed inset-0 -z-10 h-full w-full bg-neutral-950">
                <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
                <div className="absolute top-0 w-full h-[400px] bg-gradient-to-b from-emerald-500/10 to-transparent blur-3xl opacity-30"></div>
            </div>
        </div>
    );
}
