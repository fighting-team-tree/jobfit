import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, Github, FileText, Loader2, CheckCircle, ArrowRight, FileUp, X, Search, RotateCcw, Users } from 'lucide-react';
import { analysisAPI } from '../lib/api';
import type { FixtureProfile } from '../lib/api';
import { useProfileStore } from '../lib/store';

export default function ProfilePage() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {
        resumeText, setResumeText,
        resumeFile, setResumeFile,
        resumeFileResult, setResumeFileResult,
        setProfile,
        githubUrl, setGitHubUrl,
        githubAnalysis, setGitHubAnalysis,
        clearAll
    } = useProfileStore();

    const [isAnalyzingResume, setIsAnalyzingResume] = useState(false);
    const [isAnalyzingGithub, setIsAnalyzingGithub] = useState(false);
    const [resumeError, setResumeError] = useState<string | null>(null);
    const [githubError, setGithubError] = useState<string | null>(null);
    const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
    const resetLockRef = useRef(false);

    // TEST_MODE: fixture profiles
    const [testMode, setTestMode] = useState(false);
    const [fixtures, setFixtures] = useState<FixtureProfile[]>([]);
    const [isLoadingFixture, setIsLoadingFixture] = useState(false);

    useEffect(() => {
        analysisAPI.getFixtures().then((res) => {
            setTestMode(res.test_mode);
            setFixtures(res.profiles);
        }).catch(() => {});
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
            setResumeError(err instanceof Error ? err.message : 'Fixture 로드 실패');
        } finally {
            setIsLoadingFixture(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
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

    const handleContinue = () => {
        if (resumeFileResult?.success || githubAnalysis) {
            navigate('/dashboard');
        }
    };

    const structured = resumeFileResult?.structured;
    const hasAnyAnalysis = Boolean(resumeFileResult?.success || githubAnalysis);
    const resumeCompleted = Boolean(resumeFileResult?.success);

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
                        <span className="text-indigo-400">1. 프로필</span>
                        <span>2. 분석</span>
                        <span>3. 면접</span>
                    </nav>
                </div>
            </header>

            <main className="pt-24 pb-20 px-6">
                <div className="container mx-auto max-w-4xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">프로필 설정</h1>
                            <p className="text-neutral-400">
                                이력서 또는 GitHub을 분석하여 당신의 역량을 파악합니다.
                                <span className="text-indigo-400"> 둘 중 하나만 입력해도 됩니다!</span>
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                if (resetLockRef.current) return;
                                resetLockRef.current = true;
                                try {
                                    if (window.confirm('모든 입력 데이터를 초기화하시겠습니까?')) {
                                        clearAll();
                                        setResumeError(null);
                                        setGithubError(null);
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

                    {/* TEST_MODE: Fixture Profile Selector */}
                    {testMode && fixtures.length > 0 && (
                        <div className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="w-5 h-5 text-amber-400" />
                                <span className="text-sm font-semibold text-amber-400">TEST MODE</span>
                                <span className="text-xs text-neutral-400">
                                    — 업로드 없이 샘플 이력서로 바로 테스트
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {fixtures.map((f) => (
                                    <button
                                        key={f.name}
                                        onClick={() => handleLoadFixture(f.name)}
                                        disabled={isLoadingFixture}
                                        className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 rounded-lg text-sm font-medium text-amber-200 transition-colors disabled:opacity-50"
                                    >
                                        {isLoadingFixture ? (
                                            <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                                        ) : null}
                                        {f.name} ({f.skills_count} skills)
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mode Toggle */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setUploadMode('file')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                uploadMode === 'file'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white/5 text-neutral-400 hover:text-white'
                            }`}
                        >
                            📄 파일 업로드
                        </button>
                        <button
                            onClick={() => setUploadMode('text')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                uploadMode === 'text'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white/5 text-neutral-400 hover:text-white'
                            }`}
                        >
                            ✏️ 텍스트 입력
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Resume Input */}
                        <div className={`p-6 rounded-2xl border ${resumeCompleted ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-xl ${resumeCompleted ? 'bg-emerald-500/10' : 'bg-blue-500/10'} flex items-center justify-center`}>
                                    {resumeCompleted ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <FileText className="w-5 h-5 text-blue-400" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        {uploadMode === 'file' ? '이력서 파일' : '이력서 텍스트'}
                                    </h2>
                                    {resumeCompleted && (
                                        <span className="text-xs text-emerald-400">분석 완료!</span>
                                    )}
                                </div>
                            </div>

                            {uploadMode === 'file' ? (
                                <div>
                                    {!resumeFile ? (
                                        <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".pdf,.png,.jpg,.jpeg"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                            <FileUp className="w-10 h-10 text-neutral-500 mb-3" />
                                            <span className="text-neutral-400 text-sm">PDF, PNG, JPG 파일 업로드</span>
                                            <span className="text-neutral-500 text-xs mt-1">최대 10MB</span>
                                        </label>
                                    ) : (
                                        <div className="flex items-center justify-between p-4 bg-neutral-900 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{resumeFile.name}</p>
                                                    <p className="text-xs text-neutral-500">
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
                                </div>
                            ) : (
                                <textarea
                                    value={resumeText}
                                    onChange={(e) => setResumeText(e.target.value)}
                                    placeholder="이력서 내용을 붙여넣어주세요..."
                                    className="w-full h-48 px-4 py-3 bg-neutral-900 border border-white/10 rounded-xl text-sm resize-none focus:outline-none focus:border-indigo-500 placeholder:text-neutral-600"
                                />
                            )}

                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-xs text-neutral-500">
                                    {uploadMode === 'file'
                                        ? (resumeFile ? '파일 선택됨' : '파일을 선택하세요')
                                        : `${resumeText.length} 글자`
                                    }
                                </span>
                                <button
                                    onClick={handleAnalyzeResume}
                                    disabled={isAnalyzingResume || (uploadMode === 'file' ? !resumeFile : !resumeText.trim())}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                    {isAnalyzingResume ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            분석 중...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" />
                                            분석하기
                                        </>
                                    )}
                                </button>
                            </div>

                            {resumeError && (
                                <p className="mt-4 text-red-400 text-sm">{resumeError}</p>
                            )}
                        </div>

                        {/* GitHub Input */}
                        <div className={`p-6 rounded-2xl border ${githubAnalysis ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-xl ${githubAnalysis ? 'bg-emerald-500/10' : 'bg-violet-500/10'} flex items-center justify-center`}>
                                    {githubAnalysis ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <Github className="w-5 h-5 text-violet-400" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">GitHub 연동</h2>
                                    {githubAnalysis && (
                                        <span className="text-xs text-emerald-400">분석 완료!</span>
                                    )}
                                </div>
                            </div>

                            <input
                                type="url"
                                value={githubUrl}
                                onChange={(e) => setGitHubUrl(e.target.value)}
                                placeholder="https://github.com/username"
                                className="w-full px-4 py-3 bg-neutral-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 placeholder:text-neutral-600"
                            />

                            <p className="mt-3 text-xs text-neutral-500">
                                GitHub 프로필 또는 리포지토리 URL을 입력하세요.
                            </p>

                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={handleAnalyzeGithub}
                                    disabled={isAnalyzingGithub || !githubUrl.trim()}
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                    {isAnalyzingGithub ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            분석 중...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-4 h-4" />
                                            분석하기
                                        </>
                                    )}
                                </button>
                            </div>

                            {githubError && (
                                <p className="mt-4 text-red-400 text-sm">{githubError}</p>
                            )}

                            {githubAnalysis && (
                                <div className="mt-4 p-4 bg-neutral-900/50 rounded-xl">
                                    <h3 className="text-sm font-medium text-neutral-400 mb-2">분석 결과</h3>
                                    <div className="space-y-2">
                                        {githubAnalysis.primary_language && (
                                            <p className="text-sm">
                                                <span className="text-neutral-500">주 언어:</span>{' '}
                                                <span className="text-indigo-400">{githubAnalysis.primary_language}</span>
                                            </p>
                                        )}
                                        {githubAnalysis.skill_level && (
                                            <p className="text-sm">
                                                <span className="text-neutral-500">레벨:</span>{' '}
                                                <span className="text-emerald-400 capitalize">{githubAnalysis.skill_level}</span>
                                            </p>
                                        )}
                                        {(() => {
                                            const frameworks = githubAnalysis.frameworks ?? [];
                                            if (frameworks.length === 0) return null;
                                            return (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {frameworks.slice(0, 5).map((fw: string, i: number) => (
                                                        <span key={i} className="px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded text-xs">
                                                            {fw}
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {resumeFileResult?.success && structured && (
                        <div className="mt-8 p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle className="w-6 h-6 text-emerald-400" />
                                <h2 className="text-lg font-semibold">분석 완료</h2>
                                {resumeFileResult.pages > 1 && (
                                    <span className="text-xs text-neutral-400">
                                        ({resumeFileResult.pages}페이지)
                                    </span>
                                )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {structured.name && (
                                    <div>
                                        <h3 className="text-sm font-medium text-neutral-400 mb-2">이름</h3>
                                        <p className="text-lg font-semibold">{structured.name}</p>
                                    </div>
                                )}

                                {structured.skills && structured.skills.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium text-neutral-400 mb-2">기술 스택</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {structured.skills.slice(0, 10).map((skill: string, i: number) => (
                                                <span key={i} className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm">
                                                    {skill}
                                                </span>
                                            ))}
                                            {structured.skills.length > 10 && (
                                                <span className="px-3 py-1 bg-neutral-700 text-neutral-300 rounded-full text-sm">
                                                    +{structured.skills.length - 10}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {structured.experience && structured.experience.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium text-neutral-400 mb-2">경력</h3>
                                        <ul className="space-y-2">
                                            {structured.experience.slice(0, 3).map((exp: { company: string; role?: string; duration?: string }, i: number) => (
                                                <li key={i} className="text-sm">
                                                    <span className="text-white">{exp.company}</span>
                                                    {exp.role && (
                                                        <span className="text-neutral-400"> - {exp.role}</span>
                                                    )}
                                                    {exp.duration && (
                                                        <span className="text-neutral-500 text-xs ml-2">({exp.duration})</span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {structured.education && structured.education.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium text-neutral-400 mb-2">학력</h3>
                                        <ul className="space-y-2">
                                            {structured.education.map((edu: { school: string; major?: string }, i: number) => (
                                                <li key={i} className="text-sm">
                                                    <span className="text-white">{edu.school}</span>
                                                    {edu.major && (
                                                        <span className="text-neutral-400"> {edu.major}</span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {hasAnyAnalysis && (
                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={handleContinue}
                                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl font-medium flex items-center gap-3 transition-all transform hover:scale-105"
                            >
                                다음: 채용공고 분석
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {!hasAnyAnalysis && (
                        <div className="mt-8 text-center text-neutral-500 text-sm">
                            이력서 또는 GitHub 중 하나를 분석하면 다음 단계로 이동할 수 있습니다.
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
