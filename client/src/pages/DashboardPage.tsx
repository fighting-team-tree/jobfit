import { useRef, useState, useMemo, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Target, Loader2, AlertCircle, CheckCircle2, BookOpen, Mic, RotateCcw } from 'lucide-react';
import { analysisAPI, roadmapAPI, type Roadmap } from '../lib/api';
import { useProfileStore } from '../lib/store';

const SkillRadarChart = lazy(() => import('../components/charts/SkillRadarChart'));

export default function DashboardPage() {
    const navigate = useNavigate();
    const {
        profile,
        jdText,
        setJdText,
        gapAnalysis,
        setGapAnalysis,
        clearAll
    } = useProfileStore();

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isScraping, setIsScraping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
    const [jdUrl, setJdUrl] = useState('');
    const resetLockRef = useRef(false);

    const profileData = profile;
    const hasProfile = !!(profileData && (profileData.skills?.length || profileData.experience?.length));

    const chartData = useMemo(() => {
        if (!gapAnalysis) return [];
        const required = gapAnalysis.jd_analysis?.required_skills || [];
        const preferred = gapAnalysis.jd_analysis?.preferred_skills || [];
        const allJDSkills = Array.from(new Set([...required, ...preferred]));
        const matchedSet = new Set(gapAnalysis.matching_skills.map(s => s.toLowerCase()));
        return allJDSkills.slice(0, 10).map(skill => {
            const isMatched = matchedSet.has(skill.toLowerCase());
            const isRequired = required.includes(skill);
            return {
                subject: skill,
                A: isMatched ? 100 : 20,
                B: isRequired ? 100 : 70,
                fullMark: 100
            };
        });
    }, [gapAnalysis]);

    const handleScrapeJD = async () => {
        if (!jdUrl.trim()) return;
        
        setIsScraping(true);
        setError(null);
        
        try {
            const result = await analysisAPI.scrapeJD(jdUrl);
            if (result.success && result.raw_text) {
                setJdText(result.raw_text);
            } else {
                setError(result.error || 'JD 스크래핑에 실패했습니다. 직접 입력해주세요.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'JD 스크래핑 중 오류가 발생했습니다.');
        } finally {
            setIsScraping(false);
        }
    };

    const handleAnalyzeGap = async () => {
        if (!profileData) {
            setError('먼저 프로필 분석을 완료해주세요.');
            return;
        }
        if (!jdText.trim()) {
            setError('채용공고 내용을 입력해주세요.');
            return;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            const result = await analysisAPI.analyzeGap(profileData, jdText);
            setGapAnalysis(result);

            // Generate roadmap in background (non-blocking)
            roadmapAPI.generate(result)
                .then(roadmapResult => setRoadmap(roadmapResult))
                .catch(() => {});
        } catch (err) {
            setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
        } finally {
            setIsAnalyzing(false);
        }
    };


    if (!hasProfile) {
        return (
            <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">프로필을 먼저 설정해주세요</h1>
                    <Link to="/profile" className="text-indigo-400 hover:underline">
                        프로필 설정으로 이동
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
                    <nav className="flex items-center gap-6 text-sm font-medium text-neutral-400">
                        <Link to="/profile" className="text-emerald-400">✓ 프로필</Link>
                        <span className="text-indigo-400">2. 분석</span>
                        <span>3. 면접</span>
                    </nav>
                </div>
            </header>

            <main className="pt-24 pb-20 px-6">
                <div className="container mx-auto max-w-5xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">갭 분석 대시보드</h1>
                            <p className="text-neutral-400">채용공고와 프로필을 비교하여 부족한 역량을 파악합니다.</p>
                        </div>
                        <button
                            onClick={() => {
                                if (resetLockRef.current) return;
                                resetLockRef.current = true;
                                try {
                                    if (window.confirm('모든 입력 데이터를 초기화하시겠습니까?')) {
                                        clearAll();
                                        setRoadmap(null);
                                        setError(null);
                                        setJdUrl('');
                                    }
                                } finally {
                                    resetLockRef.current = false;
                                }
                            }}
                            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-white/10 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors text-neutral-400 hover:text-white"
                        >
                            <RotateCcw className="w-4 h-4" />
                            초기화
                        </button>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* JD Input */}
                        <div className="lg:col-span-2 p-6 rounded-2xl border border-white/10 bg-white/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                    <Target className="w-5 h-5 text-orange-400" />
                                </div>
                                <h2 className="text-lg font-semibold">채용공고(JD) 입력</h2>
                            </div>

                            {/* URL Input */}
                            <div className="mb-4 flex gap-2">
                                <input
                                    type="url"
                                    value={jdUrl}
                                    onChange={(e) => setJdUrl(e.target.value)}
                                    placeholder="채용공고 URL 입력 (선택사항)"
                                    className="flex-1 px-4 py-2 bg-neutral-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-indigo-500 placeholder:text-neutral-600"
                                />
                                <button
                                    onClick={handleScrapeJD}
                                    disabled={isScraping || !jdUrl.trim()}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
                                >
                                    {isScraping ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            불러오는 중...
                                        </>
                                    ) : (
                                        '불러오기'
                                    )}
                                </button>
                            </div>

                            <textarea
                                value={jdText}
                                onChange={(e) => setJdText(e.target.value)}
                                placeholder="채용공고 내용을 붙여넣거나 위 URL에서 불러오세요...

예시:
[토스] 백엔드 엔지니어

자격요건:
- Python, Java 등 백엔드 언어 경험
- REST API 설계 경험
- PostgreSQL, Redis 경험

우대사항:
- Kubernetes 경험
- 대용량 트래픽 처리 경험"
                                className="w-full h-48 px-4 py-3 bg-neutral-900 border border-white/10 rounded-xl text-sm resize-none focus:outline-none focus:border-indigo-500 placeholder:text-neutral-600"
                            />

                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={handleAnalyzeGap}
                                    disabled={isAnalyzing}
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-neutral-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            분석 중...
                                        </>
                                    ) : (
                                        '갭 분석하기'
                                    )}
                                </button>
                            </div>

                            {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}

                        </div>

                        {/* Profile Summary */}
                        <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                            <h3 className="text-sm font-medium text-neutral-400 mb-3">내 프로필 요약</h3>
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {(profileData?.skills || []).slice(0, 8).map((skill: string, i: number) => (
                                    <span key={i} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                            <p className="text-xs text-neutral-500">
                                경력 {profileData?.experience?.length || 0}건 ·
                                프로젝트 {profileData?.projects?.length || 0}건
                            </p>
                        </div>
                    </div>

                    {/* Gap Analysis Result */}
                    {gapAnalysis && (
                        <div className="mt-8 space-y-6">
                            <div className="grid lg:grid-cols-3 gap-6">
                                {/* Match Score */}
                                <div className="p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center justify-center">
                                    <h2 className="text-lg font-semibold mb-6">매칭 점수</h2>
                                    <div className="relative w-40 h-40 mb-4">
                                        <svg className="transform -rotate-90 w-40 h-40">
                                            <circle
                                                cx="80"
                                                cy="80"
                                                r="70"
                                                stroke="currentColor"
                                                strokeWidth="12"
                                                fill="transparent"
                                                className="text-neutral-800"
                                            />
                                            <circle
                                                cx="80"
                                                cy="80"
                                                r="70"
                                                stroke="currentColor"
                                                strokeWidth="12"
                                                fill="transparent"
                                                strokeDasharray={439.8}
                                                strokeDashoffset={439.8 * (1 - gapAnalysis.match_score / 100)}
                                                className={gapAnalysis.match_score >= 70 ? 'text-emerald-500' : gapAnalysis.match_score >= 40 ? 'text-yellow-500' : 'text-red-500'}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-4xl font-bold">{gapAnalysis.match_score}</span>
                                            <span className="text-sm text-neutral-500">점</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-neutral-400 text-center">
                                        {gapAnalysis.match_score >= 70
                                            ? '직무 적합도가 매우 높습니다! 🎉'
                                            : gapAnalysis.match_score >= 40
                                                ? '일부분은 잘 맞지만 보완이 필요해요.'
                                                : '직무와 핏을 맞추기 위해 노력이 필요해요.'}
                                    </p>
                                </div>

                                {/* Radar Chart (New) */}
                                <div className="lg:col-span-2 p-6 rounded-2xl border border-white/10 bg-white/5">
                                    <h2 className="text-lg font-semibold mb-4">역량 분석 차트</h2>
                                    <div className="w-full h-full min-h-[300px]">
                                        <Suspense fallback={<div className="w-full h-[300px] flex items-center justify-center text-neutral-500">차트 로딩 중...</div>}>
                                            <SkillRadarChart data={chartData} />
                                        </Suspense>
                                    </div>
                                </div>
                            </div>

                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* Detailed Skills List */}
                                <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                                    <h3 className="text-lg font-semibold mb-4">상세 분석 결과</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-1">
                                                <CheckCircle2 className="w-4 h-4" /> 매칭된 역량
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {gapAnalysis.matching_skills.length > 0 ? (
                                                    gapAnalysis.matching_skills.map((skill: string, i: number) => (
                                                        <span key={i} className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-md text-sm border border-emerald-500/20">
                                                            {skill}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-neutral-500 text-sm">매칭된 항목이 없습니다.</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-1">
                                                <AlertCircle className="w-4 h-4" /> 부족한 역량
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {gapAnalysis.missing_skills.length > 0 ? (
                                                    gapAnalysis.missing_skills.map((skill: string, i: number) => (
                                                        <span key={i} className="px-2.5 py-1 bg-red-500/20 text-red-300 rounded-md text-sm border border-red-500/20">
                                                            {skill}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-neutral-500 text-sm">완벽합니다!</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold mb-4">Action Plan</h2>
                                        <p className="text-neutral-400 text-sm mb-6">
                                            분석된 갭을 바탕으로 <strong>맞춤형 학습 로드맵</strong>을 생성하거나,
                                            부족한 부분을 보완하기 위한 <strong>AI 모의 면접</strong>을 진행해보세요.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <button
                                            onClick={() => navigate('/roadmap')}
                                            className="w-full px-4 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                                        >
                                            <BookOpen className="w-5 h-5" />
                                            학습 로드맵 생성하기
                                        </button>
                                        <button
                                            onClick={() => navigate('/interview')}
                                            className="w-full px-4 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-900/20"
                                        >
                                            <Mic className="w-5 h-5" />
                                            AI 면접 연습하기
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Roadmap Preview */}
                    {roadmap && roadmap.weekly_plans.length > 0 && (
                        <div className="mt-8 p-6 rounded-2xl border border-white/10 bg-white/5">
                            <h2 className="text-lg font-semibold mb-4">{roadmap.title}</h2>
                            <p className="text-neutral-400 text-sm mb-6">{roadmap.summary}</p>

                            <div className="grid md:grid-cols-4 gap-4">
                                {roadmap.weekly_plans.map((week) => (
                                    <div key={week.week_number} className="p-4 bg-neutral-900 rounded-xl">
                                        <h4 className="font-medium mb-2">Week {week.week_number}</h4>
                                        <p className="text-xs text-neutral-400 mb-2">{week.theme}</p>
                                        <p className="text-xs text-indigo-400">{week.total_hours}시간</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Background */}
            <div className="fixed inset-0 -z-10 h-full w-full bg-neutral-950">
                <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            </div>
        </div>
    );
}
