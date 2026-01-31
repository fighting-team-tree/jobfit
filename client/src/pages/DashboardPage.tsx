import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Target, Loader2, AlertCircle, CheckCircle2, BookOpen, Mic } from 'lucide-react';
import { analysisAPI, roadmapAPI, type Roadmap } from '../lib/api';
import { useProfileStore } from '../lib/store';

export default function DashboardPage() {
    const navigate = useNavigate();
    const { resumeAnalysis, resumeFileResult, jdText, setJdText, gapAnalysis, setGapAnalysis } = useProfileStore();

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isScraping, setIsScraping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
    const [jdUrl, setJdUrl] = useState('');

    // Use file result's structured data if available, otherwise use resumeAnalysis
    const profileData = resumeFileResult?.structured || resumeAnalysis;
    const hasProfile = !!(profileData && (profileData.skills?.length || profileData.experience?.length));

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

            // Also generate roadmap
            const roadmapResult = await roadmapAPI.generate(result);
            setRoadmap(roadmapResult);
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
                    <h1 className="text-3xl font-bold mb-2">갭 분석 대시보드</h1>
                    <p className="text-neutral-400 mb-8">채용공고와 프로필을 비교하여 부족한 역량을 파악합니다.</p>

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
                        <div className="mt-8 grid lg:grid-cols-2 gap-6">
                            {/* Match Score */}
                            <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                                <h2 className="text-lg font-semibold mb-4">매칭 점수</h2>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-24 h-24">
                                        <svg className="transform -rotate-90 w-24 h-24">
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="40"
                                                stroke="currentColor"
                                                strokeWidth="8"
                                                fill="transparent"
                                                className="text-neutral-800"
                                            />
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="40"
                                                stroke="currentColor"
                                                strokeWidth="8"
                                                fill="transparent"
                                                strokeDasharray={251.2}
                                                strokeDashoffset={251.2 * (1 - gapAnalysis.match_score / 100)}
                                                className={gapAnalysis.match_score >= 70 ? 'text-emerald-500' : gapAnalysis.match_score >= 40 ? 'text-yellow-500' : 'text-red-500'}
                                            />
                                        </svg>
                                        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                                            {gapAnalysis.match_score}%
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-neutral-400">
                                            {gapAnalysis.match_score >= 70
                                                ? '좋은 매칭입니다!'
                                                : gapAnalysis.match_score >= 40
                                                    ? '보완이 필요합니다'
                                                    : '갭이 큽니다'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> 보유 역량
                                        </h4>
                                        <div className="flex flex-wrap gap-1">
                                                                                        {gapAnalysis.matching_skills.map((skill: string, i: number) => (
                                                <span key={i} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-xs">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-red-400 mb-2">⚠️ 부족 역량</h4>
                                        <div className="flex flex-wrap gap-1">
                                                                                        {gapAnalysis.missing_skills.map((skill: string, i: number) => (
                                                <span key={i} className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold mb-4">다음 단계</h2>
                                    <p className="text-neutral-400 text-sm mb-4">
                                        갭 분석 결과를 바탕으로 학습하거나, 모의 면접을 시작할 수 있습니다.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => navigate('/roadmap')}
                                        className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <BookOpen className="w-5 h-5" />
                                        학습 로드맵 보기
                                    </button>
                                    <button
                                        onClick={() => navigate('/interview')}
                                        className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Mic className="w-5 h-5" />
                                        모의 면접 시작
                                    </button>
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
