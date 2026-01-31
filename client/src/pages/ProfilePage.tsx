import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, Github, FileText, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import { analysisAPI } from '../lib/api';
import { useProfileStore } from '../lib/store';

export default function ProfilePage() {
    const navigate = useNavigate();
    const {
        resumeText, setResumeText,
        resumeAnalysis, setResumeAnalysis,
        githubUrl, setGitHubUrl
    } = useProfileStore();

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!resumeText.trim()) {
            setError('이력서 내용을 입력해주세요.');
            return;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            const result = await analysisAPI.analyzeResume(resumeText);
            setResumeAnalysis(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleContinue = () => {
        if (resumeAnalysis) {
            navigate('/dashboard');
        }
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
                        <span>2. 분석</span>
                        <span>3. 면접</span>
                    </nav>
                </div>
            </header>

            <main className="pt-24 pb-20 px-6">
                <div className="container mx-auto max-w-4xl">
                    <h1 className="text-3xl font-bold mb-2">프로필 설정</h1>
                    <p className="text-neutral-400 mb-8">이력서와 GitHub을 분석하여 당신의 역량을 파악합니다.</p>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Resume Input */}
                        <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-blue-400" />
                                </div>
                                <h2 className="text-lg font-semibold">이력서 입력</h2>
                            </div>

                            <textarea
                                value={resumeText}
                                onChange={(e) => setResumeText(e.target.value)}
                                placeholder="이력서 내용을 붙여넣어주세요...

예시:
이름: 홍길동
이메일: hong@example.com

경력:
- ABC 회사 (2020-2023): 백엔드 개발자
  Python, FastAPI, PostgreSQL 사용

학력:
- OO대학교 컴퓨터공학과 졸업

기술스택:
Python, JavaScript, React, Docker"
                                className="w-full h-64 px-4 py-3 bg-neutral-900 border border-white/10 rounded-xl text-sm resize-none focus:outline-none focus:border-indigo-500 placeholder:text-neutral-600"
                            />

                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-xs text-neutral-500">
                                    {resumeText.length} 글자
                                </span>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || !resumeText.trim()}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                    {isAnalyzing ? (
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

                            {error && (
                                <p className="mt-4 text-red-400 text-sm">{error}</p>
                            )}
                        </div>

                        {/* GitHub Input */}
                        <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                    <Github className="w-5 h-5 text-violet-400" />
                                </div>
                                <h2 className="text-lg font-semibold">GitHub 연동</h2>
                            </div>

                            <input
                                type="url"
                                value={githubUrl}
                                onChange={(e) => setGitHubUrl(e.target.value)}
                                placeholder="https://github.com/username"
                                className="w-full px-4 py-3 bg-neutral-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 placeholder:text-neutral-600"
                            />

                            <p className="mt-3 text-xs text-neutral-500">
                                GitHub 프로필을 분석하여 코드 스타일과 기술 스택을 파악합니다.
                            </p>
                        </div>
                    </div>

                    {/* Analysis Result */}
                    {resumeAnalysis && (
                        <div className="mt-8 p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle className="w-6 h-6 text-emerald-400" />
                                <h2 className="text-lg font-semibold">분석 완료</h2>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-medium text-neutral-400 mb-2">기술 스택</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {resumeAnalysis.skills.map((skill, i) => (
                                            <span key={i} className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium text-neutral-400 mb-2">경력</h3>
                                    <ul className="space-y-2">
                                        {resumeAnalysis.experience.slice(0, 3).map((exp, i) => (
                                            <li key={i} className="text-sm">
                                                <span className="text-white">{exp.company}</span>
                                                <span className="text-neutral-400"> - {exp.role}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <button
                                onClick={handleContinue}
                                className="mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium flex items-center gap-2 transition-colors"
                            >
                                다음: 채용공고 분석
                                <ArrowRight className="w-4 h-4" />
                            </button>
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
