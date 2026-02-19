import { useState, useEffect } from 'react';
import { Github, Check, X, ExternalLink, Loader2 } from 'lucide-react';

interface GitHubConfig {
    token: string;
    repoFullName: string;
    username: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConnect: (config: GitHubConfig) => void;
}

const API_BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1');

export default function GitConnectModal({ isOpen, onClose, onConnect }: Props) {
    const [token, setToken] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{
        valid: boolean;
        username?: string;
        error?: string;
    } | null>(null);
    const [repos, setRepos] = useState<Array<{ full_name: string; name: string; private: boolean }>>([]);
    const [selectedRepo, setSelectedRepo] = useState('');
    const [step, setStep] = useState<'token' | 'repo'>('token');

    // Load saved config from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('jobfit_github_config');
        if (saved) {
            const config = JSON.parse(saved);
            setToken(config.token);
            setSelectedRepo(config.repoFullName);
            setValidationResult({ valid: true, username: config.username });
            setStep('repo');
        }
    }, [isOpen]);

    const validateToken = async () => {
        if (!token.trim()) return;

        setIsValidating(true);
        try {
            const res = await fetch(`${API_BASE}/git/validate-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const result = await res.json();
            setValidationResult(result);

            if (result.valid) {
                // Fetch repos
                const reposRes = await fetch(`${API_BASE}/git/repos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                const reposData = await reposRes.json();
                if (reposData.success) {
                    setRepos(reposData.repos);
                    setStep('repo');
                }
            }
        } catch (error) {
            setValidationResult({ valid: false, error: 'Network error' });
        } finally {
            setIsValidating(false);
        }
    };

    const handleConnect = () => {
        if (!selectedRepo || !validationResult?.username) return;

        const config: GitHubConfig = {
            token,
            repoFullName: selectedRepo,
            username: validationResult.username,
        };

        // Save to localStorage
        localStorage.setItem('jobfit_github_config', JSON.stringify(config));
        onConnect(config);
        onClose();
    };

    const handleDisconnect = () => {
        localStorage.removeItem('jobfit_github_config');
        setToken('');
        setSelectedRepo('');
        setValidationResult(null);
        setRepos([]);
        setStep('token');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-neutral-900 rounded-2xl border border-white/10 p-6 w-full max-w-md">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center">
                        <Github className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold">GitHub 연결</h3>
                        <p className="text-sm text-neutral-400">풀이 결과를 자동으로 푸시합니다</p>
                    </div>
                </div>

                {step === 'token' ? (
                    <>
                        {/* Token Input */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-neutral-400 mb-2">
                                Personal Access Token
                            </label>
                            <input
                                type="password"
                                value={token}
                                onChange={(e) => {
                                    setToken(e.target.value);
                                    setValidationResult(null);
                                }}
                                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-white/10 focus:border-indigo-500 focus:outline-none font-mono text-sm"
                            />
                            {validationResult && !validationResult.valid && (
                                <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                                    <X className="w-4 h-4" />
                                    {validationResult.error || '유효하지 않은 토큰입니다'}
                                </p>
                            )}
                        </div>

                        {/* Help Link */}
                        <a
                            href="https://github.com/settings/tokens/new?scopes=repo&description=JobFit%20Study%20Push"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-indigo-400 hover:underline mb-6"
                        >
                            <ExternalLink className="w-4 h-4" />
                            토큰 발급 방법 보기
                        </a>

                        {/* Info Box */}
                        <div className="p-4 rounded-xl bg-neutral-800/50 border border-white/10 mb-6">
                            <p className="text-sm text-neutral-400">
                                <strong className="text-neutral-200">필요 권한:</strong> repo (Full control)
                            </p>
                            <p className="text-sm text-neutral-500 mt-2">
                                토큰은 브라우저에만 저장되며, 서버에 전송되지 않습니다.
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={validateToken}
                                disabled={!token.trim() || isValidating}
                                className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                            >
                                {isValidating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        확인 중...
                                    </>
                                ) : (
                                    '연결하기'
                                )}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Connected User */}
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-4">
                            <div className="flex items-center gap-2">
                                <Check className="w-5 h-5 text-emerald-400" />
                                <span className="text-emerald-300">
                                    @{validationResult?.username} 연결됨
                                </span>
                            </div>
                        </div>

                        {/* Repo Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-neutral-400 mb-2">
                                리포지토리 선택
                            </label>
                            <select
                                value={selectedRepo}
                                onChange={(e) => setSelectedRepo(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-white/10 focus:border-indigo-500 focus:outline-none text-sm"
                            >
                                <option value="">선택하세요...</option>
                                {repos.map((repo) => (
                                    <option key={repo.full_name} value={repo.full_name}>
                                        {repo.name} {repo.private ? '🔒' : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-neutral-500">
                                풀이 결과가 이 리포지토리에 푸시됩니다
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleDisconnect}
                                className="px-4 py-3 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                연결 해제
                            </button>
                            <button
                                onClick={handleConnect}
                                disabled={!selectedRepo}
                                className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                            >
                                저장
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
