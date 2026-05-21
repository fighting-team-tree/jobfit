import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Upload,
  Github,
  FileText,
  Loader2,
  CheckCircle,
  ArrowRight,
  FileUp,
  X,
  Search,
  RotateCcw,
  Users,
  AlertCircle,
  User,
  Code,
  Briefcase,
  GraduationCap,
  Link2,
  Plus,
  Trash2,
  Globe
} from 'lucide-react';
import { analysisAPI, profileAPI, API_BASE_URL } from '../lib/api';
import type { FixtureProfile, ProfileStructured, ProfileExperience, ProfileProject, ProfileEducation, ProfileContact } from '../lib/api';
import { useProfileStore } from '../lib/store';

export default function ProfilePage() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {
        profile, setProfile,
        resumeText, setResumeText,
        resumeFile, setResumeFile,
        resumeFileResult, setResumeFileResult,
        githubUrl, setGitHubUrl,
        githubAnalysis, setGitHubAnalysis,
        isServerSyncing, serverSyncError,
        clearAll
    } = useProfileStore();

    const [isAnalyzingResume, setIsAnalyzingResume] = useState(false);
    const [isAnalyzingGithub, setIsAnalyzingGithub] = useState(false);
    const [resumeError, setResumeError] = useState<string | null>(null);
    const [githubError, setGithubError] = useState<string | null>(null);
    const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
    const resetLockRef = useRef(false);

    // Google Calendar & Discord Webhook states
    const [googleConnected, setGoogleConnected] = useState(false);
    const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
    const [isSavingWebhook, setIsSavingWebhook] = useState(false);
    const [webhookMessage, setWebhookMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // TEST_MODE: fixture profiles
    const [testMode, setTestMode] = useState(false);
    const [fixtures, setFixtures] = useState<FixtureProfile[]>([]);
    const [isLoadingFixture, setIsLoadingFixture] = useState(false);

    // Active tab for manager mode
    const [activeTab, setActiveTab] = useState<'contact' | 'skills' | 'experience' | 'projects' | 'education' | 'integrations' | 'reanalyze'>('contact');

    // Input values for new items
    const [newSkill, setNewSkill] = useState('');
    const [newCert, setNewCert] = useState('');
    const [newAward, setNewAward] = useState('');

    useEffect(() => {
        profileAPI.getMyProfile().then((res) => {
            setGoogleConnected(!!res.google_connected);
            setDiscordWebhookUrl(res.discord_webhook_url || '');
            if (res.profile_data) {
                setProfile(res.profile_data);
            }
        }).catch((err) => {
            console.error('프로필 로드 실패', err);
        });

        analysisAPI.getFixtures().then((res) => {
            setTestMode(res.test_mode);
            setFixtures(res.profiles);
        }).catch(() => {});
    }, [setProfile]);

    const handleSaveWebhook = async () => {
        setIsSavingWebhook(true);
        setWebhookMessage(null);
        try {
            await profileAPI.saveDiscordWebhook(discordWebhookUrl.trim() || null);
            setWebhookMessage({ type: 'success', text: '디스코드 웹훅 URL이 성공적으로 저장되었습니다.' });
        } catch (err) {
            setWebhookMessage({ type: 'error', text: err instanceof Error ? err.message : '저장 실패' });
        } finally {
            setIsSavingWebhook(false);
        }
    };

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
                const profileData: ProfileStructured = {
                    name: result.name,
                    contact: result.contact,
                    skills: result.skills || [],
                    experience: result.experience || [],
                    education: result.education || [],
                    projects: result.projects || [],
                    certifications: result.certifications || [],
                    awards: result.awards || [],
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
                awards: [],
            });
        } catch (err) {
            setGithubError(err instanceof Error ? err.message : 'GitHub 분석 중 오류가 발생했습니다.');
        } finally {
            setIsAnalyzingGithub(false);
        }
    };

    // Helper to update profile fields helper safely
    const updateProfile = (updatedFields: Partial<ProfileStructured>) => {
        if (!profile) return;
        setProfile({
            ...profile,
            ...updatedFields,
        });
    };

    // Handlers for profile editing
    const handleContactChange = (field: keyof ProfileContact, value: string) => {
        if (!profile) return;
        const currentContact = profile.contact || {};
        updateProfile({
            contact: {
                ...currentContact,
                [field]: value,
            }
        });
    };

    // Skills handlers
    const handleAddSkill = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newSkill.trim() || !profile) return;
        if (profile.skills.includes(newSkill.trim())) {
            setNewSkill('');
            return;
        }
        updateProfile({
            skills: [...profile.skills, newSkill.trim()]
        });
        setNewSkill('');
    };

    const handleRemoveSkill = (skillToRemove: string) => {
        if (!profile) return;
        updateProfile({
            skills: profile.skills.filter(s => s !== skillToRemove)
        });
    };

    // Certifications & Awards handlers
    const handleAddCert = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newCert.trim() || !profile) return;
        const currentCerts = profile.certifications || [];
        if (currentCerts.includes(newCert.trim())) {
            setNewCert('');
            return;
        }
        updateProfile({
            certifications: [...currentCerts, newCert.trim()]
        });
        setNewCert('');
    };

    const handleRemoveCert = (certToRemove: string) => {
        if (!profile) return;
        updateProfile({
            certifications: (profile.certifications || []).filter(c => c !== certToRemove)
        });
    };

    const handleAddAward = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newAward.trim() || !profile) return;
        const currentAwards = profile.awards || [];
        if (currentAwards.includes(newAward.trim())) {
            setNewAward('');
            return;
        }
        updateProfile({
            awards: [...currentAwards, newAward.trim()]
        });
        setNewAward('');
    };

    const handleRemoveAward = (awardToRemove: string) => {
        if (!profile) return;
        updateProfile({
            awards: (profile.awards || []).filter(a => a !== awardToRemove)
        });
    };

    // Experience handlers
    const handleAddExperience = () => {
        if (!profile) return;
        const newExp: ProfileExperience = {
            company: '새 회사명',
            role: '',
            duration: '',
            description: ''
        };
        updateProfile({
            experience: [...profile.experience, newExp]
        });
    };

    const handleUpdateExperience = (index: number, updatedExp: Partial<ProfileExperience>) => {
        if (!profile) return;
        const updatedList = profile.experience.map((exp, i) => {
            if (i === index) {
                return { ...exp, ...updatedExp };
            }
            return exp;
        });
        updateProfile({ experience: updatedList });
    };

    const handleRemoveExperience = (index: number) => {
        if (!profile) return;
        updateProfile({
            experience: profile.experience.filter((_, i) => i !== index)
        });
    };

    // Project handlers
    const handleAddProject = () => {
        if (!profile) return;
        const newProj: ProfileProject = {
            name: '새 프로젝트명',
            description: '',
            tech_stack: [],
            role: ''
        };
        updateProfile({
            projects: [...profile.projects, newProj]
        });
    };

    const handleUpdateProject = (index: number, updatedProj: Partial<ProfileProject>) => {
        if (!profile) return;
        const updatedList = profile.projects.map((proj, i) => {
            if (i === index) {
                return { ...proj, ...updatedProj };
            }
            return proj;
        });
        updateProfile({ projects: updatedList });
    };

    const handleRemoveProject = (index: number) => {
        if (!profile) return;
        updateProfile({
            projects: profile.projects.filter((_, i) => i !== index)
        });
    };

    // Education handlers
    const handleAddEducation = () => {
        if (!profile) return;
        const newEdu: ProfileEducation = {
            school: '학교명',
            degree: '',
            major: '',
            year: '',
            gpa: ''
        };
        updateProfile({
            education: [...profile.education, newEdu]
        });
    };

    const handleUpdateEducation = (index: number, updatedEdu: Partial<ProfileEducation>) => {
        if (!profile) return;
        const updatedList = profile.education.map((edu, i) => {
            if (i === index) {
                return { ...edu, ...updatedEdu };
            }
            return edu;
        });
        updateProfile({ education: updatedList });
    };

    const handleRemoveEducation = (index: number) => {
        if (!profile) return;
        updateProfile({
            education: profile.education.filter((_, i) => i !== index)
        });
    };

    const handleContinue = () => {
        navigate('/dashboard');
    };

    // Check if user has profile data
    const hasProfileData = profile !== null && (
        !!profile.name ||
        (profile.skills && profile.skills.length > 0) ||
        (profile.experience && profile.experience.length > 0) ||
        (profile.education && profile.education.length > 0) ||
        (profile.projects && profile.projects.length > 0)
    );

    // Onboarding UI section
    const renderOnboarding = () => {
        const resumeCompleted = Boolean(resumeFileResult?.success);
        const hasStructuredParseError = Boolean(resumeFileResult?.success && resumeFileResult?.structured_parse_error);

        return (
            <div className="space-y-8">
                {/* TEST_MODE: Fixture Profile Selector */}
                {testMode && fixtures.length > 0 && (
                    <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
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
                <div className="flex gap-2">
                    <button
                        onClick={() => setUploadMode('file')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            uploadMode === 'file'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                    >
                        📄 이력서 파일 업로드
                    </button>
                    <button
                        onClick={() => setUploadMode('text')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            uploadMode === 'text'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                    >
                        ✏️ 이력서 텍스트 직접 입력
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
                                                <p className="text-sm font-medium truncate max-w-[180px]">{resumeFile.name}</p>
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

                {/* 구조화 파싱 실패 시 에러 + 마크다운 폴백 */}
                {hasStructuredParseError && resumeFileResult && (
                    <div className="p-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-6 h-6 text-yellow-400" />
                                <div>
                                    <h2 className="text-lg font-semibold">이력서 파싱 부분 실패</h2>
                                    <p className="text-sm text-neutral-400">
                                        파일은 읽었으나 구조화 변환에 실패했습니다. 다시 시도해주세요.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleAnalyzeResume}
                                disabled={isAnalyzingResume}
                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-neutral-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                                {isAnalyzingResume ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RotateCcw className="w-4 h-4" />
                                )}
                                재시도
                            </button>
                        </div>
                        {resumeFileResult.markdown && (
                            <details className="mt-4">
                                <summary className="text-sm text-neutral-400 cursor-pointer hover:text-neutral-200">
                                    추출된 원본 텍스트 보기
                                </summary>
                                <pre className="mt-2 p-4 bg-neutral-900 rounded-xl text-xs text-neutral-300 overflow-auto max-h-64 whitespace-pre-wrap">
                                    {resumeFileResult.markdown}
                                </pre>
                            </details>
                        )}
                    </div>
                )}

                {/* Summary View for Newly Loaded Resume */}
                {resumeCompleted && resumeFileResult?.structured && (
                    <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                        <div className="flex items-center gap-3 mb-4">
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                            <h2 className="text-lg font-semibold">분석 완료 및 임시 저장됨</h2>
                            {resumeFileResult.pages > 1 && (
                                <span className="text-xs text-neutral-400">({resumeFileResult.pages}페이지)</span>
                            )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {resumeFileResult.structured.name && (
                                <div>
                                    <h3 className="text-sm font-medium text-neutral-400 mb-1">이름</h3>
                                    <p className="text-base font-semibold">{resumeFileResult.structured.name}</p>
                                </div>
                            )}

                            {resumeFileResult.structured.skills && resumeFileResult.structured.skills.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-neutral-400 mb-1">기술 스택</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {resumeFileResult.structured.skills.slice(0, 8).map((skill: string, i: number) => (
                                            <span key={i} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handleContinue}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium flex items-center gap-2 transition-all"
                            >
                                프로필 편집기 시작
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {!resumeCompleted && !githubAnalysis && (
                    <div className="text-center text-neutral-500 text-sm py-12 border border-dashed border-white/10 rounded-2xl">
                        이력서를 분석하거나 GitHub을 연동하여 첫 프로필을 등록하세요.
                    </div>
                )}
            </div>
        );
    };

    // Profiles Manager UI tabs content
    const renderManager = () => {
        if (!profile) return null;

        return (
            <div className="grid md:grid-cols-4 gap-8">
                {/* Tabs Sidebar */}
                <div className="space-y-1 md:col-span-1">
                    <button
                        onClick={() => setActiveTab('contact')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5 ${
                            activeTab === 'contact' ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                    >
                        <User className="w-4 h-4" />
                        인적 사항
                    </button>
                    <button
                        onClick={() => setActiveTab('skills')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5 ${
                            activeTab === 'skills' ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                    >
                        <Code className="w-4 h-4" />
                        기술 스택
                    </button>
                    <button
                        onClick={() => setActiveTab('experience')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5 ${
                            activeTab === 'experience' ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                    >
                        <Briefcase className="w-4 h-4" />
                        경력 사항
                    </button>
                    <button
                        onClick={() => setActiveTab('projects')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5 ${
                            activeTab === 'projects' ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                    >
                        <Globe className="w-4 h-4" />
                        프로젝트
                    </button>
                    <button
                        onClick={() => setActiveTab('education')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5 ${
                            activeTab === 'education' ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                    >
                        <GraduationCap className="w-4 h-4" />
                        학력 및 자격
                    </button>
                    <button
                        onClick={() => setActiveTab('integrations')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5 ${
                            activeTab === 'integrations' ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                    >
                        <Link2 className="w-4 h-4" />
                        외부 연동
                    </button>
                    <button
                        onClick={() => setActiveTab('reanalyze')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5 border border-indigo-500/20 ${
                            activeTab === 'reanalyze' ? 'bg-indigo-950 text-indigo-400 border-indigo-500/40' : 'hover:bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                    >
                        <Upload className="w-4 h-4" />
                        이력서 재분석
                    </button>
                </div>

                {/* Tab Pane */}
                <div className="md:col-span-3 bg-white/[0.02] border border-white/10 rounded-2xl p-6 min-h-[400px]">
                    {activeTab === 'contact' && (
                        <div className="space-y-6">
                            <div className="border-b border-white/5 pb-4">
                                <h2 className="text-xl font-bold">인적 사항 설정</h2>
                                <p className="text-xs text-neutral-400 mt-1">이력서에서 추출된 기본 인적 정보 및 연락처입니다.</p>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-neutral-400 font-medium">이름</label>
                                    <input
                                        type="text"
                                        value={profile.name || ''}
                                        onChange={(e) => updateProfile({ name: e.target.value })}
                                        className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-neutral-400 font-medium">이메일</label>
                                    <input
                                        type="email"
                                        value={profile.contact?.email || ''}
                                        onChange={(e) => handleContactChange('email', e.target.value)}
                                        className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-neutral-400 font-medium">연락처 / 전화번호</label>
                                    <input
                                        type="text"
                                        value={profile.contact?.phone || ''}
                                        onChange={(e) => handleContactChange('phone', e.target.value)}
                                        className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-neutral-400 font-medium">GitHub URL</label>
                                    <input
                                        type="url"
                                        value={profile.contact?.github || ''}
                                        onChange={(e) => handleContactChange('github', e.target.value)}
                                        className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs text-neutral-400 font-medium">블로그 / 개인 홈페이지</label>
                                    <input
                                        type="url"
                                        value={profile.contact?.blog || ''}
                                        onChange={(e) => handleContactChange('blog', e.target.value)}
                                        className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'skills' && (
                        <div className="space-y-6">
                            <div className="border-b border-white/5 pb-4 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">기술 스택 편집</h2>
                                    <p className="text-xs text-neutral-400 mt-1">핵심 개발 역량 스택을 추가하거나 삭제할 수 있습니다.</p>
                                </div>
                            </div>

                            <form onSubmit={handleAddSkill} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="예: React, Python, Docker..."
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    className="flex-1 px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-1 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    추가
                                </button>
                            </form>

                            <div>
                                <h3 className="text-xs text-neutral-400 mb-3 font-semibold">등록된 역량 ({profile.skills.length})</h3>
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-sm flex items-center gap-1.5 group hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all cursor-pointer"
                                            onClick={() => handleRemoveSkill(skill)}
                                            title="클릭하여 삭제"
                                        >
                                            {skill}
                                            <X className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                                        </span>
                                    ))}
                                    {profile.skills.length === 0 && (
                                        <p className="text-sm text-neutral-500">등록된 기술 스택이 없습니다. 역량을 추가해 보세요.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'experience' && (
                        <div className="space-y-6">
                            <div className="border-b border-white/5 pb-4 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">경력 사항</h2>
                                    <p className="text-xs text-neutral-400 mt-1">이전 직장 경력과 상세 담당 직무 정보입니다.</p>
                                </div>
                                <button
                                    onClick={handleAddExperience}
                                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    경력 추가
                                </button>
                            </div>

                            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                                {profile.experience.map((exp, index) => (
                                    <div key={index} className="p-4 rounded-xl border border-white/10 bg-neutral-900/50 space-y-4 relative group">
                                        <button
                                            onClick={() => handleRemoveExperience(index)}
                                            className="absolute top-4 right-4 p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            title="경력 삭제"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-neutral-400">회사명</label>
                                                <input
                                                    type="text"
                                                    value={exp.company}
                                                    onChange={(e) => handleUpdateExperience(index, { company: e.target.value })}
                                                    className="w-full px-3 py-2 bg-neutral-900 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-neutral-400">역할 / 직무</label>
                                                <input
                                                    type="text"
                                                    value={exp.role || ''}
                                                    onChange={(e) => handleUpdateExperience(index, { role: e.target.value })}
                                                    className="w-full px-3 py-2 bg-neutral-900 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-xs text-neutral-400">재직 기간</label>
                                                <input
                                                    type="text"
                                                    value={exp.duration || ''}
                                                    placeholder="예: 2022.01 ~ 2023.12"
                                                    onChange={(e) => handleUpdateExperience(index, { duration: e.target.value })}
                                                    className="w-full px-3 py-2 bg-neutral-900 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-xs text-neutral-400">담당 업무 및 성과</label>
                                                <textarea
                                                    value={exp.description || ''}
                                                    onChange={(e) => handleUpdateExperience(index, { description: e.target.value })}
                                                    rows={3}
                                                    className="w-full px-3 py-2 bg-neutral-900 border border-white/5 rounded-xl text-sm resize-none focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {profile.experience.length === 0 && (
                                    <div className="text-center text-neutral-500 py-12 text-sm border border-dashed border-white/5 rounded-xl">
                                        등록된 경력 사항이 없습니다. "경력 추가" 버튼을 눌러 새 이력을 입력해보세요.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'projects' && (
                        <div className="space-y-6">
                            <div className="border-b border-white/5 pb-4 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">프로젝트</h2>
                                    <p className="text-xs text-neutral-400 mt-1">개인 프로젝트 및 팀 프로젝트 참여 이력입니다.</p>
                                </div>
                                <button
                                    onClick={handleAddProject}
                                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    프로젝트 추가
                                </button>
                            </div>

                            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                                {profile.projects.map((proj, index) => (
                                    <div key={index} className="p-4 rounded-xl border border-white/10 bg-neutral-900/50 space-y-4 relative group">
                                        <button
                                            onClick={() => handleRemoveProject(index)}
                                            className="absolute top-4 right-4 p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            title="프로젝트 삭제"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-neutral-400">프로젝트명</label>
                                                <input
                                                    type="text"
                                                    value={proj.name}
                                                    onChange={(e) => handleUpdateProject(index, { name: e.target.value })}
                                                    className="w-full px-3 py-2 bg-neutral-900 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-neutral-400">담당 역할</label>
                                                <input
                                                    type="text"
                                                    value={proj.role || ''}
                                                    onChange={(e) => handleUpdateProject(index, { role: e.target.value })}
                                                    className="w-full px-3 py-2 bg-neutral-900 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-xs text-neutral-400">사용 기술 스택 (쉼표로 구분)</label>
                                                <input
                                                    type="text"
                                                    value={(proj.tech_stack || []).join(', ')}
                                                    placeholder="예: React, NestJS, MySQL"
                                                    onChange={(e) => {
                                                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                                        handleUpdateProject(index, { tech_stack: arr });
                                                    }}
                                                    className="w-full px-3 py-2 bg-neutral-900 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-xs text-neutral-400">상세 프로젝트 설명</label>
                                                <textarea
                                                    value={proj.description || ''}
                                                    onChange={(e) => handleUpdateProject(index, { description: e.target.value })}
                                                    rows={3}
                                                    className="w-full px-3 py-2 bg-neutral-900 border border-white/5 rounded-xl text-sm resize-none focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {profile.projects.length === 0 && (
                                    <div className="text-center text-neutral-500 py-12 text-sm border border-dashed border-white/5 rounded-xl">
                                        등록된 프로젝트 이력이 없습니다. "프로젝트 추가"를 눌러 시작해보세요.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'education' && (
                        <div className="space-y-6">
                            {/* Education List */}
                            <div className="space-y-4">
                                <div className="border-b border-white/5 pb-2 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-base font-bold">학력 사항</h2>
                                        <p className="text-xs text-neutral-400">학력 및 취득 학위 목록입니다.</p>
                                    </div>
                                    <button
                                        onClick={handleAddEducation}
                                        className="px-2 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-white/10 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        학력 추가
                                    </button>
                                </div>
                                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
                                    {profile.education.map((edu, index) => (
                                        <div key={index} className="p-3 rounded-lg border border-white/5 bg-neutral-900/30 grid grid-cols-5 gap-3 relative group">
                                            <button
                                                onClick={() => handleRemoveEducation(index)}
                                                className="absolute top-2 right-2 p-1 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                            <div className="col-span-2 space-y-0.5">
                                                <label className="text-[10px] text-neutral-400">학교명</label>
                                                <input
                                                    type="text"
                                                    value={edu.school}
                                                    onChange={(e) => handleUpdateEducation(index, { school: e.target.value })}
                                                    className="w-full px-2 py-1 bg-neutral-950 border border-white/5 rounded text-xs focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-[10px] text-neutral-400">전공</label>
                                                <input
                                                    type="text"
                                                    value={edu.major || ''}
                                                    onChange={(e) => handleUpdateEducation(index, { major: e.target.value })}
                                                    className="w-full px-2 py-1 bg-neutral-950 border border-white/5 rounded text-xs focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-[10px] text-neutral-400">학위 / 과정</label>
                                                <input
                                                    type="text"
                                                    value={edu.degree || ''}
                                                    placeholder="예: 학사, 석사"
                                                    onChange={(e) => handleUpdateEducation(index, { degree: e.target.value })}
                                                    className="w-full px-2 py-1 bg-neutral-950 border border-white/5 rounded text-xs focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <label className="text-[10px] text-neutral-400">학점 (GPA)</label>
                                                <input
                                                    type="text"
                                                    value={edu.gpa || ''}
                                                    placeholder="예: 3.8/4.5"
                                                    onChange={(e) => handleUpdateEducation(index, { gpa: e.target.value })}
                                                    className="w-full px-2 py-1 bg-neutral-950 border border-white/5 rounded text-xs focus:outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {profile.education.length === 0 && (
                                        <p className="text-xs text-neutral-500 py-4 text-center">등록된 학력 사항이 없습니다.</p>
                                    )}
                                </div>
                            </div>

                            {/* Certifications List */}
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <div>
                                    <h2 className="text-base font-bold">자격증</h2>
                                    <p className="text-xs text-neutral-400">기타 자격 및 어학 취득 내역입니다.</p>
                                </div>
                                <form onSubmit={handleAddCert} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="자격증 또는 어학 시험명 입력..."
                                        value={newCert}
                                        onChange={(e) => setNewCert(e.target.value)}
                                        className="flex-1 px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                                    />
                                    <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold">
                                        추가
                                    </button>
                                </form>
                                <div className="flex flex-wrap gap-1.5">
                                    {(profile.certifications || []).map((cert) => (
                                        <span
                                            key={cert}
                                            className="px-2 py-1 bg-neutral-900 border border-white/5 rounded text-xs flex items-center gap-1 cursor-pointer hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/10 transition-colors"
                                            onClick={() => handleRemoveCert(cert)}
                                            title="클릭하여 삭제"
                                        >
                                            {cert}
                                            <X className="w-3 h-3 opacity-60" />
                                        </span>
                                    ))}
                                    {(profile.certifications || []).length === 0 && (
                                        <p className="text-xs text-neutral-500">등록된 자격증이 없습니다.</p>
                                    )}
                                </div>
                            </div>

                            {/* Awards List */}
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <div>
                                    <h2 className="text-base font-bold">수상 내역 및 대외 활동</h2>
                                    <p className="text-xs text-neutral-400">해커톤, 공모전 등의 수상 및 참여 내용입니다.</p>
                                </div>
                                <form onSubmit={handleAddAward} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="수상 내역 또는 활동 내용 입력..."
                                        value={newAward}
                                        onChange={(e) => setNewAward(e.target.value)}
                                        className="flex-1 px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                                    />
                                    <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold">
                                        추가
                                    </button>
                                </form>
                                <div className="flex flex-wrap gap-1.5">
                                    {(profile.awards || []).map((award) => (
                                        <span
                                            key={award}
                                            className="px-2 py-1 bg-neutral-900 border border-white/5 rounded text-xs flex items-center gap-1 cursor-pointer hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/10 transition-colors"
                                            onClick={() => handleRemoveAward(award)}
                                            title="클릭하여 삭제"
                                        >
                                            {award}
                                            <X className="w-3 h-3 opacity-60" />
                                        </span>
                                    ))}
                                    {(profile.awards || []).length === 0 && (
                                        <p className="text-xs text-neutral-500">등록된 수상 내역이 없습니다.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'integrations' && (
                        <div className="space-y-6">
                            <div className="border-b border-white/5 pb-4">
                                <h2 className="text-xl font-bold">외부 서비스 연동</h2>
                                <p className="text-xs text-neutral-400 mt-1">캘린더 등록 및 알림 기능을 연동하여 면접 및 학습 계획을 체계적으로 관리하세요.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                {/* 구글 캘린더 연동 카드 */}
                                <div className={`p-4 rounded-xl border ${googleConnected ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5 bg-neutral-900/50'} transition-all`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 font-bold">G</div>
                                            <div>
                                                <h3 className="text-xs font-semibold">Google Calendar</h3>
                                                <p className="text-[10px] text-neutral-400">학습 일정을 캘린더에 동기화</p>
                                            </div>
                                        </div>
                                        {googleConnected ? (
                                            <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full text-[10px] font-medium">연동 완료</span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 bg-neutral-800 text-neutral-400 rounded-full text-[10px] font-medium">미연동</span>
                                        )}
                                    </div>
                                    <a
                                        href={`${API_BASE_URL}/auth/login/google`}
                                        className={`w-full py-2 px-4 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                                            googleConnected
                                                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                        }`}
                                    >
                                        {googleConnected ? '계정 재연동' : 'Google 계정 연동하기'}
                                    </a>
                                </div>

                                {/* 디스코드 웹훅 연동 카드 */}
                                <div className={`p-4 rounded-xl border ${discordWebhookUrl ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-white/5 bg-neutral-900/50'} transition-all`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold">D</div>
                                            <div>
                                                <h3 className="text-xs font-semibold">Discord 알림</h3>
                                                <p className="text-[10px] text-neutral-400">학습 계획 알림 웹훅 전송</p>
                                            </div>
                                        </div>
                                        {discordWebhookUrl ? (
                                            <span className="px-2.5 py-0.5 bg-indigo-500/15 text-indigo-400 rounded-full text-[10px] font-medium">설정 완료</span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 bg-neutral-800 text-neutral-400 rounded-full text-[10px] font-medium">미설정</span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            placeholder="https://discord.com/api/webhooks/..."
                                            value={discordWebhookUrl}
                                            onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-neutral-950 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-indigo-500 placeholder:text-neutral-700 text-neutral-300"
                                        />
                                        <button
                                            onClick={handleSaveWebhook}
                                            disabled={isSavingWebhook}
                                            className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-900 text-neutral-200 rounded-lg text-xs font-medium transition-colors"
                                        >
                                            {isSavingWebhook ? '저장 중...' : '웹훅 URL 저장'}
                                        </button>
                                    </div>
                                    {webhookMessage && (
                                        <p className={`mt-2 text-[10px] ${webhookMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {webhookMessage.text}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reanalyze' && (
                        <div className="space-y-6">
                            <div className="border-b border-white/5 pb-4">
                                <h2 className="text-xl font-bold">이력서 다시 분석하기</h2>
                                <p className="text-xs text-neutral-400 mt-1">
                                    새로운 이력서를 업로드하여 기존 데이터를 덮어씁니다.
                                    <span className="text-red-400"> (⚠️ 기존 데이터가 소실됩니다)</span>
                                </p>
                            </div>
                            {renderOnboarding()}
                        </div>
                    )}
                </div>
            </div>
        );
    };

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
                        <Link to="/dashboard" className="hover:text-white transition-colors">2. 분석</Link>
                        <Link to="/interview" className="hover:text-white transition-colors">3. 면접</Link>
                    </nav>
                </div>
            </header>

            <main className="pt-24 pb-20 px-6">
                <div className="container mx-auto max-w-5xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">
                                {hasProfileData ? '내 프로필 매니저' : '프로필 초기 설정'}
                            </h1>
                            <p className="text-neutral-400 text-sm">
                                {hasProfileData
                                    ? '등록한 이력서 기반의 세부 경력 스택을 직접 편집하고 최신 상태로 유지하세요.'
                                    : '이력서 또는 GitHub을 분석하여 AI 취업 매칭 서비스를 시작해보세요.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Sync Status Badge */}
                            {hasProfileData && (
                                <div className="flex items-center">
                                    {isServerSyncing ? (
                                        <span className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            변경 사항 저장 중...
                                        </span>
                                    ) : serverSyncError ? (
                                        <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl" title={serverSyncError}>
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            동기화 오류
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            클라우드 동기화 완료
                                        </span>
                                    )}
                                </div>
                            )}

                            {hasProfileData && (
                                <button
                                    onClick={handleContinue}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20"
                                >
                                    대시보드 바로가기
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    if (resetLockRef.current) return;
                                    resetLockRef.current = true;
                                    try {
                                        if (window.confirm('모든 입력 데이터를 초기화하시겠습니까? (서버 정보 포함)')) {
                                            clearAll();
                                            setResumeError(null);
                                            setGithubError(null);
                                        }
                                    } finally {
                                        resetLockRef.current = false;
                                    }
                                }}
                                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors text-neutral-400 hover:text-white"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                초기화
                            </button>
                        </div>
                    </div>

                    {hasProfileData ? renderManager() : renderOnboarding()}
                </div>
            </main>

            <div className="fixed inset-0 -z-10 h-full w-full bg-neutral-950">
                <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            </div>
        </div>
    );
}
