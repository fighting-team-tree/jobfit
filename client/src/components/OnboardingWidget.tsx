import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Loader2, CheckCircle, ArrowRight, FileUp, X, Search, RotateCcw, Users, AlertCircle } from 'lucide-react';
import { analysisAPI } from '../lib/api';
import type { FixtureProfile } from '../lib/api';
import { useProfileStore } from '../lib/store';

const analysisSteps = [
    '문서를 읽어 텍스트를 추출하는 중...',
    'NVIDIA VLM 모델이 이력서 레이아웃을 파악하는 중...',
    '보유 역량 및 기술 스택 키워드를 선별하는 중...',
    '경력 사항 및 프로젝트 세부 정보를 정리하는 중...',
    '최종 프로필 구조화 데이터를 생성하는 중...'
];

export default function OnboardingWidget() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {
        resumeText, setResumeText,
        resumeFile, setResumeFile,
        setResumeFileResult,
        profile, setProfile,
        githubUrl, setGitHubUrl,
        githubAnalysis, setGitHubAnalysis,
        clearAll
    } = useProfileStore();

    const [isAnalyzingResume, setIsAnalyzingResume] = useState(false);
    const [isAnalyzingGithub, setIsAnalyzingGithub] = useState(false);
    const [resumeError, setResumeError] = useState<string | null>(null);
    const [githubError, setGithubError] = useState<string | null>(null);
    const [uploadMode, setUploadMode] = useState<'file' | 'text' | 'github'>('file');
    const [isDragging, setIsDragging] = useState(false);

    // TEST_MODE states
    const [testMode, setTestMode] = useState(false);
    const [fixtures, setFixtures] = useState<FixtureProfile[]>([]);
    const [isLoadingFixture, setIsLoadingFixture] = useState(false);

    // AI Analysis status text rotator
    const [analysisStep, setAnalysisStep] = useState(0);

    useEffect(() => {
        let interval: ReturnType<typeof setTimeout>;
        if (isAnalyzingResume || isAnalyzingGithub) {
            setAnalysisStep(0);
            interval = setInterval(() => {
                setAnalysisStep((prev) => (prev + 1) % analysisSteps.length);
            }, 2500);
        }
        return () => clearInterval(interval);
    }, [isAnalyzingResume, isAnalyzingGithub]);

    // Load fixtures on mount
    useEffect(() => {
        analysisAPI.getFixtures()
            .then((res) => {
                setTestMode(res.test_mode);
                setFixtures(res.profiles);
            })
            .catch((err) => {
                console.warn('Failed to load test fixtures:', err);
            });
    }, []);

    const handleLoadFixture = async (name: string) => {
        setIsLoadingFixture(true);
        setResumeError(null);
        try {
            const result = await analysisAPI.loadFixture(name);
            setResumeFileResult(result);
            if (result.structured) {
                setProfile(result.structured);
            }
        } catch (err) {
            setResumeError(err instanceof Error ? err.message : '샘플 프로필 로드 실패');
        } finally {
            setIsLoadingFixture(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            validateAndSetFile(file);
        }
    };

    const validateAndSetFile = (file: File) => {
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
        if (!allowedTypes.includes(file.type)) {
            setResumeError('PDF, PNG, JPG 파일만 업로드 가능합니다.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setResumeError('파일 크기는 10MB를 초과할 수 없습니다.');
            return;
        }

        setResumeFile(file);
        setResumeError(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            validateAndSetFile(file);
        }
    };

    const handleRemoveFile = () => {
        setResumeFile(null);
        setResumeFileResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleAnalyzeResume = async () => {
        setIsAnalyzingResume(true);
        setResumeError(null);

        try {
            if (uploadMode === 'file' && resumeFile) {
                const result = await analysisAPI.analyzeResumeFile(resumeFile, true);
                setResumeFileResult(result);
                if (result.structured) {
                    setProfile(result.structured);
                }
            } else if (uploadMode === 'text' && resumeText.trim()) {
                const result = await analysisAPI.analyzeResume(resumeText);
                const profileData = {
                    name: result.name,
                    contact: result.contact,
                    skills: result.skills,
                    experience: result.experience,
                    education: result.education,
                    projects: result.projects,
                    certifications: result.certifications,
                    awards: result.awards,
                };
                setProfile(profileData);

                const structuredResult = {
                    skills: profileData.skills,
                    experience: profileData.experience,
                    education: profileData.education,
                    projects: profileData.projects,
                    certifications: profileData.certifications,
                    awards: profileData.awards,
                };
                setResumeFileResult({
                    markdown: resumeText,
                    structured: structuredResult,
                    pages: 1,
                    success: true
                });
            } else {
                setResumeError('이력서 파일을 업로드하거나 텍스트를 입력해주세요.');
                return;
            }
        } catch (err) {
            setResumeError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
        } finally {
            setIsAnalyzingResume(false);
        }
    };

    const handleAnalyzeGithub = async () => {
        if (!githubUrl.trim()) {
            setGithubError('GitHub URL을 입력해주세요.');
            return;
        }

        if (!githubUrl.includes('github.com')) {
            setGithubError('올바른 GitHub URL을 입력해주세요.');
            return;
        }

        setIsAnalyzingGithub(true);
        setGithubError(null);

        try {
            const result = await analysisAPI.analyzeGitHub(githubUrl);
            setGitHubAnalysis(result);
            const githubSkills = [
                result.primary_language,
                ...(result.frameworks ?? []),
                ...(result.skills_identified ?? [])
            ].filter(Boolean) as string[];
            
            setProfile({
                skills: githubSkills,
                experience: [],
                education: [],
                projects: [],
                certifications: [],
            });
        } catch (err) {
            setGithubError(err instanceof Error ? err.message : 'GitHub 분석 중 오류가 발생했습니다.');
        } finally {
            setIsAnalyzingGithub(false);
        }
    };

    const handleReset = () => {
        if (window.confirm('프로필 데이터를 초기화하고 다시 업로드하시겠습니까?')) {
            clearAll();
            setResumeError(null);
            setGithubError(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const hasAnyAnalysis = Boolean(profile && (profile.skills?.length > 0 || profile.experience?.length > 0) || githubAnalysis);
    const isWorking = isAnalyzingResume || isAnalyzingGithub || isLoadingFixture;

    // 분석 완료 상태인 경우 요약 화면 렌더링
    if (hasAnyAnalysis && !isWorking) {
        return (
            <div className="w-full max-w-2xl mx-auto p-8 rounded-3xl border border-emerald-500/20 bg-neutral-900/60 backdrop-blur-xl relative overflow-hidden animate-fade-in">
                {/* 배경 네온 발광 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-6 h-6 text-emerald-400 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-neutral-100">이력서 분석 완료!</h2>
                        <p className="text-neutral-400 text-xs mt-0.5">성공적으로 내 역량을 파악했습니다.</p>
                    </div>
                </div>

                {/* 프로필 요약 카드 */}
                <div className="p-6 rounded-2xl border border-white/5 bg-white/5 space-y-5 mb-8">
                    {profile?.name && (
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <span className="text-xs text-neutral-400">이름</span>
                            <span className="text-sm font-semibold text-neutral-200">{profile.name}</span>
                        </div>
                    )}

                    {profile?.skills && profile.skills.length > 0 && (
                        <div>
                            <span className="text-xs text-neutral-400 block mb-2">분석된 핵심 기술 스택 ({profile.skills.length})</span>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                                {profile.skills.map((skill, i) => (
                                    <span key={i} className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {profile?.experience && profile.experience.length > 0 ? (
                        <div className="border-t border-white/5 pt-4">
                            <span className="text-xs text-neutral-400 block mb-2">주요 경력 사항 ({profile.experience.length}건)</span>
                            <ul className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                                {profile.experience.map((exp, i) => (
                                    <li key={i} className="text-xs flex items-center justify-between text-neutral-300">
                                        <span className="truncate max-w-[280px] font-medium">{exp.company} {exp.role ? `· ${exp.role}` : ''}</span>
                                        <span className="text-neutral-500 shrink-0 font-mono text-[10px]">{exp.duration || '기간 미지정'}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : githubAnalysis ? (
                        <div className="border-t border-white/5 pt-4">
                            <span className="text-xs text-neutral-400 block mb-1">GitHub 분석 결과</span>
                            <p className="text-xs text-neutral-300">
                                주 언어: <span className="text-violet-400 font-semibold">{githubAnalysis.primary_language || '미확인'}</span>
                                {githubAnalysis.skill_level && ` (레벨: ${githubAnalysis.skill_level})`}
                            </p>
                            {githubAnalysis.summary && (
                                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed italic">
                                    "{githubAnalysis.summary.length > 100 ? `${githubAnalysis.summary.slice(0, 100)}...` : githubAnalysis.summary}"
                                </p>
                            )}
                        </div>
                    ) : null}
                </div>

                <div className="space-y-3.5">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-indigo-500/10 text-sm"
                    >
                        대시보드로 이동하여 갭 분석하기
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <div className="flex justify-center">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-1.5 transition-all"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            다시 업로드 / 다른 이력서 입력
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto p-6 md:p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl relative overflow-hidden animate-fade-in">
            {/* 네온 배경 효과 */}
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

            {isWorking ? (
                // ============ 분석 중 로딩 화면 ============
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-indigo-400 animate-pulse" />
                        </div>
                    </div>
                    <div className="space-y-2 max-w-md">
                        <h3 className="text-lg font-semibold text-neutral-100">이력서를 파싱 및 분석하고 있습니다</h3>
                        <p className="text-indigo-400 text-sm font-medium animate-pulse transition-all">
                            {analysisSteps[analysisStep]}
                        </p>
                        <p className="text-neutral-500 text-xs pt-2">이 작업은 약 10~20초 정도 소요될 수 있습니다.</p>
                    </div>
                </div>
            ) : (
                // ============ 일반 업로드/입력 위젯 ============
                <div>
                    <h2 className="text-xl font-bold mb-2 text-center text-neutral-100">
                        1분 만에 내 커리어 데이터 분석하기
                    </h2>
                    <p className="text-neutral-400 text-xs text-center mb-6">
                        이력서 파일 또는 GitHub URL을 통해 내 역량 프로필을 자동으로 구성합니다.
                    </p>

                    {/* 탭 전환 버튼 */}
                    <div className="flex bg-neutral-900/60 p-1.5 rounded-xl border border-white/5 mb-6 text-xs md:text-sm font-medium">
                        <button
                            onClick={() => { setUploadMode('file'); setResumeError(null); }}
                            className={`flex-1 py-2.5 rounded-lg transition-all ${
                                uploadMode === 'file'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            📄 이력서 파일 업로드
                        </button>
                        <button
                            onClick={() => { setUploadMode('text'); setResumeError(null); }}
                            className={`flex-1 py-2.5 rounded-lg transition-all ${
                                uploadMode === 'text'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            ✏️ 직접 텍스트 입력
                        </button>
                        <button
                            onClick={() => { setUploadMode('github'); setGithubError(null); }}
                            className={`flex-1 py-2.5 rounded-lg transition-all ${
                                uploadMode === 'github'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-neutral-400 hover:text-white'
                            }`}
                        >
                            🐙 GitHub 분석
                        </button>
                    </div>

                    {/* 업로드 모드 별 콘텐츠 */}
                    <div className="min-h-[220px]">
                        {uploadMode === 'file' && (
                            <div className="space-y-4">
                                {!resumeFile ? (
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                                            isDragging
                                                ? 'border-indigo-500 bg-indigo-500/10'
                                                : 'border-white/10 hover:border-indigo-500/50 hover:bg-white/5'
                                        }`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf,.png,.jpg,.jpeg"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <FileUp className="w-10 h-10 text-neutral-400 mb-3" />
                                        <span className="text-neutral-300 text-sm font-medium">
                                            PDF, PNG, JPG 파일 드래그 앤 드롭 또는 클릭
                                        </span>
                                        <span className="text-neutral-500 text-xs mt-1">최대 10MB</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4 bg-neutral-900/80 border border-white/5 rounded-xl animate-fade-in">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div className="truncate max-w-[320px] md:max-w-[420px]">
                                                <p className="text-sm font-medium text-neutral-200 truncate">{resumeFile.name}</p>
                                                <p className="text-xs text-neutral-500 font-mono">
                                                    {(resumeFile.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleRemoveFile}
                                            className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-2">
                                    <span className="text-[11px] text-neutral-500">
                                        {resumeFile ? '✓ 파일이 선택되었습니다.' : '이력서 원본 파일을 준비해주세요.'}
                                    </span>
                                    <button
                                        onClick={handleAnalyzeResume}
                                        disabled={!resumeFile}
                                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        이력서 분석하기
                                    </button>
                                </div>
                                {resumeError && (
                                    <p className="text-red-400 text-xs flex items-center gap-1.5 mt-2 bg-red-500/5 border border-red-500/10 p-2.5 rounded-lg">
                                        <AlertCircle className="w-4 h-4" /> {resumeError}
                                    </p>
                                )}
                            </div>
                        )}

                        {uploadMode === 'text' && (
                            <div className="space-y-4">
                                <textarea
                                    value={resumeText}
                                    onChange={(e) => setResumeText(e.target.value)}
                                    placeholder="이력서 텍스트 또는 포트폴리오 요약을 직접 입력하거나 붙여넣어주세요..."
                                    className="w-full h-44 px-4 py-3 bg-neutral-900 border border-white/10 rounded-2xl text-xs md:text-sm resize-none focus:outline-none focus:border-indigo-500 placeholder:text-neutral-600 text-neutral-200"
                                />
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-neutral-500 font-mono">
                                        {resumeText.length} 글자 입력됨
                                    </span>
                                    <button
                                        onClick={handleAnalyzeResume}
                                        disabled={!resumeText.trim()}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        텍스트 분석하기
                                    </button>
                                </div>
                                {resumeError && (
                                    <p className="text-red-400 text-xs flex items-center gap-1.5 mt-2 bg-red-500/5 border border-red-500/10 p-2.5 rounded-lg">
                                        <AlertCircle className="w-4 h-4" /> {resumeError}
                                    </p>
                                )}
                            </div>
                        )}

                        {uploadMode === 'github' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-neutral-400">GitHub 프로필 또는 리포지토리 URL</label>
                                    <input
                                        type="url"
                                        value={githubUrl}
                                        onChange={(e) => setGitHubUrl(e.target.value)}
                                        placeholder="https://github.com/username"
                                        className="w-full px-4 py-3 bg-neutral-900 border border-white/10 rounded-2xl text-xs md:text-sm focus:outline-none focus:border-indigo-500 placeholder:text-neutral-600 text-neutral-200"
                                    />
                                </div>
                                <p className="text-[11px] text-neutral-500 leading-relaxed">
                                    지정한 GitHub 저장소를 분석하여 코딩 패턴, 주로 사용된 주 프로그래밍 언어, 프레임워크 리스트를 추출하고 자동으로 기술 스택을 구성합니다.
                                </p>
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleAnalyzeGithub}
                                        disabled={!githubUrl.trim()}
                                        className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2"
                                    >
                                        <Search className="w-4 h-4" />
                                        레포지토리 분석하기
                                    </button>
                                </div>
                                {githubError && (
                                    <p className="text-red-400 text-xs flex items-center gap-1.5 mt-2 bg-red-500/5 border border-red-500/10 p-2.5 rounded-lg">
                                        <AlertCircle className="w-4 h-4" /> {githubError}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* TEST_MODE Fixtures */}
                    {testMode && fixtures.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-semibold text-amber-400">TEST MODE — 샘플 이력서 로드</span>
                                <span className="text-[10px] text-neutral-500">
                                    (파일을 직접 업로드하지 않고 테스트 가능)
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {fixtures.map((fixture) => (
                                    <button
                                        key={fixture.name}
                                        onClick={() => handleLoadFixture(fixture.name)}
                                        disabled={isWorking}
                                        className="px-3 py-1.5 bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/20 text-amber-300 rounded-lg text-xs transition-colors"
                                    >
                                        {fixture.name} ({fixture.skills_count}개 역량)
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
