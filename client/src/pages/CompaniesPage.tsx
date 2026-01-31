import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Building2, ExternalLink, Trash2, Play, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react';

interface Company {
    id: string;
    name: string;
    jd_text?: string;
    jd_url?: string;
    status: 'pending' | 'analyzing' | 'analyzed' | 'high_match' | 'error';
    match_result?: {
        match_score: number;
        matching_skills: string[];
        missing_skills: string[];
        strengths: string[];
        recommendations: string[];
    };
    created_at: string;
    error_message?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    // Load profile from localStorage
    const getProfile = () => {
        const stored = localStorage.getItem('jobfit_profile');
        return stored ? JSON.parse(stored) : null;
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const res = await fetch(`${API_BASE}/companies/`);
            if (res.ok) {
                const data = await res.json();
                setCompanies(data);
            }
        } catch (error) {
            console.error('Failed to fetch companies:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const createCompany = async () => {
        if (!newCompanyName.trim()) return;

        try {
            const res = await fetch(`${API_BASE}/companies/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCompanyName }),
            });

            if (res.ok) {
                const company = await res.json();
                setCompanies([...companies, company]);
                setNewCompanyName('');
                setShowAddModal(false);
                setSelectedCompany(company);
            }
        } catch (error) {
            console.error('Failed to create company:', error);
        }
    };

    const deleteCompany = async (id: string) => {
        try {
            await fetch(`${API_BASE}/companies/${id}`, { method: 'DELETE' });
            setCompanies(companies.filter(c => c.id !== id));
            if (selectedCompany?.id === id) {
                setSelectedCompany(null);
            }
        } catch (error) {
            console.error('Failed to delete company:', error);
        }
    };

    const getStatusBadge = (status: string, score?: number) => {
        const badges: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
            pending: { color: 'bg-neutral-700', icon: <AlertCircle className="w-3 h-3" />, text: 'JD 입력 필요' },
            analyzing: { color: 'bg-blue-600', icon: <Loader2 className="w-3 h-3 animate-spin" />, text: '분석 중...' },
            analyzed: { color: 'bg-emerald-600', icon: <CheckCircle className="w-3 h-3" />, text: `${score}점` },
            high_match: { color: 'bg-green-500', icon: <CheckCircle className="w-3 h-3" />, text: `🔥 ${score}점` },
            error: { color: 'bg-red-600', icon: <AlertCircle className="w-3 h-3" />, text: '오류' },
        };

        const badge = badges[status] || badges.pending;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                {badge.icon}
                {badge.text}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* Header */}
            <header className="fixed top-0 w-full border-b border-white/10 bg-neutral-950/80 backdrop-blur-md z-50">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <span className="font-bold text-white">J</span>
                            </div>
                            <span className="font-bold text-xl">JobFit</span>
                        </Link>
                        <ChevronRight className="w-4 h-4 text-neutral-500" />
                        <span className="text-neutral-400">회사별 분석</span>
                    </div>
                    <Link to="/profile" className="text-sm text-neutral-400 hover:text-white transition-colors">
                        ← 프로필로 돌아가기
                    </Link>
                </div>
            </header>

            <main className="pt-24 pb-12 px-6">
                <div className="container mx-auto max-w-6xl">
                    <div className="flex gap-6">
                        {/* Company List Sidebar */}
                        <div className="w-80 flex-shrink-0">
                            <div className="bg-neutral-900 rounded-2xl border border-white/10 p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold">지원 회사 목록</h2>
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                {isLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                                    </div>
                                ) : companies.length === 0 ? (
                                    <div className="text-center py-8 text-neutral-500">
                                        <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">아직 추가된 회사가 없습니다</p>
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="mt-4 text-indigo-400 text-sm hover:underline"
                                        >
                                            + 첫 번째 회사 추가하기
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {companies.map((company) => (
                                            <div
                                                key={company.id}
                                                onClick={() => setSelectedCompany(company)}
                                                className={`p-3 rounded-xl cursor-pointer transition-all ${selectedCompany?.id === company.id
                                                    ? 'bg-indigo-600/20 border border-indigo-500/50'
                                                    : 'bg-neutral-800/50 border border-transparent hover:border-white/10'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-4 h-4 text-neutral-400" />
                                                        <span className="font-medium truncate">{company.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteCompany(company.id);
                                                        }}
                                                        className="p-1 rounded hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <div className="mt-2">
                                                    {getStatusBadge(company.status, company.match_result?.match_score)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Company Detail */}
                        <div className="flex-1">
                            {selectedCompany ? (
                                <CompanyDetail
                                    company={selectedCompany}
                                    profile={getProfile()}
                                    onUpdate={(updated) => {
                                        setCompanies(companies.map(c => c.id === updated.id ? updated : c));
                                        setSelectedCompany(updated);
                                    }}
                                />
                            ) : (
                                <div className="bg-neutral-900 rounded-2xl border border-white/10 p-12 text-center">
                                    <Building2 className="w-16 h-16 mx-auto mb-4 text-neutral-600" />
                                    <h3 className="text-xl font-semibold mb-2">회사를 선택하세요</h3>
                                    <p className="text-neutral-400">
                                        왼쪽 목록에서 회사를 선택하거나 새로운 회사를 추가하세요.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Add Company Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-neutral-900 rounded-2xl border border-white/10 p-6 w-full max-w-md">
                        <h3 className="text-xl font-semibold mb-4">새 회사 추가</h3>
                        <input
                            type="text"
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            placeholder="회사명 입력"
                            className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-white/10 focus:border-indigo-500 focus:outline-none transition-colors"
                            onKeyDown={(e) => e.key === 'Enter' && createCompany()}
                            autoFocus
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={createCompany}
                                className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors"
                            >
                                추가
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Company Detail Component
function CompanyDetail({
    company,
    profile,
    onUpdate
}: {
    company: Company;
    profile: any;
    onUpdate: (company: Company) => void;
}) {
    const [jdText, setJdText] = useState(company.jd_text || '');
    const [jdUrl, setJdUrl] = useState(company.jd_url || '');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isScraping, setIsScraping] = useState(false);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

    const updateJD = async () => {
        try {
            const res = await fetch(`${API_BASE}/companies/${company.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jd_text: jdText, jd_url: jdUrl }),
            });

            if (res.ok) {
                const updated = await res.json();
                onUpdate(updated);
            }
        } catch (error) {
            console.error('Failed to update JD:', error);
        }
    };

    const scrapeJD = async () => {
        if (!jdUrl) return;

        setIsScraping(true);
        try {
            // First update the URL
            await fetch(`${API_BASE}/companies/${company.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jd_url: jdUrl }),
            });

            // Then scrape
            const res = await fetch(`${API_BASE}/companies/${company.id}/scrape-jd`, {
                method: 'POST',
            });

            if (res.ok) {
                const updated = await res.json();
                setJdText(updated.jd_text || '');
                onUpdate(updated);
            }
        } catch (error) {
            console.error('Failed to scrape JD:', error);
        } finally {
            setIsScraping(false);
        }
    };

    const analyzeMatch = async () => {
        if (!profile) {
            alert('프로필을 먼저 작성해주세요.');
            return;
        }

        setIsAnalyzing(true);
        try {
            const res = await fetch(`${API_BASE}/companies/${company.id}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile }),
            });

            if (res.ok) {
                const updated = await res.json();
                onUpdate(updated);
            }
        } catch (error) {
            console.error('Failed to analyze:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="bg-neutral-900 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-indigo-400" />
                    <h2 className="text-2xl font-bold">{company.name}</h2>
                </div>
                {company.jd_url && (
                    <a
                        href={company.jd_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-indigo-400 hover:underline"
                    >
                        채용공고 보기 <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </div>

            {/* JD Input Section */}
            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                        채용공고 URL (선택)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={jdUrl}
                            onChange={(e) => setJdUrl(e.target.value)}
                            placeholder="https://..."
                            className="flex-1 px-4 py-2 rounded-xl bg-neutral-800 border border-white/10 focus:border-indigo-500 focus:outline-none text-sm"
                        />
                        <button
                            onClick={scrapeJD}
                            disabled={!jdUrl || isScraping}
                            className="px-4 py-2 rounded-xl bg-neutral-800 border border-white/10 hover:bg-neutral-700 disabled:opacity-50 text-sm transition-colors"
                        >
                            {isScraping ? <Loader2 className="w-4 h-4 animate-spin" /> : '불러오기'}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-2">
                        채용공고 내용 (JD)
                    </label>
                    <textarea
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                        placeholder="채용공고 내용을 붙여넣으세요..."
                        rows={10}
                        className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-white/10 focus:border-indigo-500 focus:outline-none resize-none text-sm"
                    />
                    <div className="flex justify-end mt-2">
                        <button
                            onClick={updateJD}
                            className="px-4 py-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-sm transition-colors"
                        >
                            저장
                        </button>
                    </div>
                </div>
            </div>

            {/* Analysis Button */}
            <button
                onClick={analyzeMatch}
                disabled={!jdText || isAnalyzing}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2 font-medium transition-colors"
            >
                {isAnalyzing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Claude Agent 분석 중...
                    </>
                ) : (
                    <>
                        <Play className="w-5 h-5" />
                        매칭 분석 시작
                    </>
                )}
            </button>

            {/* Analysis Results */}
            {company.match_result && (
                <div className="mt-6 space-y-6">
                    {/* Score */}
                    <div className="text-center p-6 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30">
                        <div className="text-5xl font-bold mb-2">
                            {company.match_result.match_score}
                            <span className="text-2xl text-neutral-400">점</span>
                        </div>
                        <p className="text-neutral-400">매칭 점수</p>
                    </div>

                    {/* Skills */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                            <h4 className="font-medium text-emerald-400 mb-3">✓ 보유 역량</h4>
                            <div className="flex flex-wrap gap-2">
                                {company.match_result.matching_skills.map((skill, i) => (
                                    <span key={i} className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                            <h4 className="font-medium text-orange-400 mb-3">✗ 부족 역량</h4>
                            <div className="flex flex-wrap gap-2">
                                {company.match_result.missing_skills.map((skill, i) => (
                                    <span key={i} className="px-2 py-1 rounded-lg bg-orange-500/20 text-orange-300 text-sm">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    {company.match_result.recommendations.length > 0 && (
                        <div className="p-4 rounded-xl bg-neutral-800/50 border border-white/10">
                            <h4 className="font-medium mb-3">💡 추천 사항</h4>
                            <ul className="space-y-2">
                                {company.match_result.recommendations.map((rec, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                                        <span className="text-indigo-400">→</span>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Action Button */}
                    <Link
                        to={`/roadmap?skills=${company.match_result.missing_skills.join(',')}`}
                        className="block w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-center font-medium transition-colors"
                    >
                        부족 역량 학습하러 가기 →
                    </Link>
                </div>
            )}

            {company.error_message && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {company.error_message}
                </div>
            )}
        </div>
    );
}
