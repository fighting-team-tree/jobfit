import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, Loader2, CheckCircle, XCircle, RotateCcw, AlertCircle, MessageSquare, Code } from 'lucide-react';
import { CodeEditor } from '../components/problem/CodeEditor';
import { ProblemCard, type Problem } from '../components/problem/ProblemCard';
import { problemAPI } from '../lib/api';
import { useProblemStore } from '../lib/store';

interface EvaluationResult {
  success: boolean;
  feedback: string;
  score?: number;
  test_results?: {
    passed: number;
    failed: number;
    details?: string[];
  };
}

export default function ProblemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { weekProblems } = useProblemStore();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProblem = async () => {
      if (!id) return;

      setIsLoading(true);
      setLoadError(null);

      // 1. 먼저 로컬 스토어에서 문제 찾기
      for (const problems of Object.values(weekProblems)) {
        const found = problems.find((p) => p.id === id);
        if (found) {
          console.log('[ProblemPage] Found problem in local store:', found.title);
          setProblem(found);
          setCode(found.starter_code || getDefaultCode(found.language || 'python', found.type));
          setIsLoading(false);
          return;
        }
      }

      // 2. 로컬에 없으면 서버에서 가져오기
      try {
        console.log('[ProblemPage] Fetching problem from server:', id);
        const data = await problemAPI.getProblem(id);
        setProblem(data);
        setCode(data.starter_code || getDefaultCode(data.language || 'python', data.type));
      } catch (err) {
        console.error('[ProblemPage] Failed to fetch problem:', err);
        setLoadError(err instanceof Error ? err.message : '문제를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblem();
  }, [id, weekProblems]);

  const getDefaultCode = (language: string, type?: string): string => {
    // practical 타입은 프롬프트 작성용
    if (type === 'practical') {
      return '# 아래에 프롬프트를 작성하세요\n\n';
    }

    switch (language) {
      case 'python':
        return '# 여기에 코드를 작성하세요\n\ndef solution():\n    pass\n';
      case 'javascript':
        return '// 여기에 코드를 작성하세요\n\nfunction solution() {\n  \n}\n';
      case 'typescript':
        return '// 여기에 코드를 작성하세요\n\nfunction solution(): void {\n  \n}\n';
      default:
        return '# 여기에 코드를 작성하세요\n';
    }
  };

  // 문제 유형에 따른 에디터 타입
  const isPromptType = problem?.type === 'practical';

  const handleSubmit = async () => {
    if (!id || !problem) {
      console.log('[ProblemPage] Cannot submit: id or problem is missing', { id, problem });
      return;
    }

    console.log('[ProblemPage] Submitting solution for problem:', problem.title);
    setIsSubmitting(true);
    setResult(null);
    setSubmitError(null);

    try {
      // 문제 정보를 함께 전달 (서버에 문제가 없을 경우 사용)
      const evalResult = await problemAPI.evaluateSolution(id, code, problem);
      console.log('[ProblemPage] Evaluation result:', evalResult);
      setResult(evalResult);
    } catch (err) {
      console.error('[ProblemPage] Submission error:', err);
      setSubmitError(err instanceof Error ? err.message : '제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (problem) {
      setCode(problem.starter_code || getDefaultCode(problem.language || 'python', problem.type));
      setResult(null);
      setSubmitError(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <span className="ml-3 text-neutral-400">문제 로딩 중...</span>
      </div>
    );
  }

  if (loadError || !problem) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">문제를 찾을 수 없습니다</h1>
          <p className="text-neutral-400 mb-4">{loadError || '요청한 문제가 존재하지 않습니다.'}</p>
          <Link to="/roadmap" className="text-indigo-400 hover:underline">
            로드맵으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-neutral-950/80 backdrop-blur-md z-50">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/roadmap')}
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              로드맵
            </button>
            <div className="h-4 w-px bg-white/20" />
            <h1 className="font-medium truncate max-w-md">{problem.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              초기화
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              제출
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - 2 Column Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column - Problem Description */}
        <div className="w-1/2 border-r border-white/10 overflow-hidden">
          <ProblemCard problem={problem} />
        </div>

        {/* Right Column - Editor */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* Editor Header */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-neutral-900/50">
            {isPromptType ? (
              <>
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-400 font-medium">프롬프트 작성</span>
              </>
            ) : (
              <>
                <Code className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-medium">코드 작성</span>
                <span className="text-xs text-neutral-500 ml-2">{problem.language || 'python'}</span>
              </>
            )}
          </div>

          {/* Editor Area - 결과가 있으면 높이 줄임 */}
          <div className={`${result || submitError ? 'h-[55%]' : 'flex-1'} overflow-hidden`}>
            {isPromptType ? (
              /* 프롬프트 작성용 텍스트 에디터 */
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="여기에 프롬프트를 작성하세요..."
                className="w-full h-full bg-neutral-900 text-neutral-100 p-4 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 font-mono text-sm leading-relaxed placeholder-neutral-600"
                spellCheck={false}
              />
            ) : (
              /* 코드 에디터 */
              <CodeEditor
                language={problem.language || 'python'}
                value={code}
                onChange={setCode}
              />
            )}
          </div>

          {/* Submit Error Panel */}
          {submitError && (
            <div className="border-t border-amber-500/30 bg-amber-500/10 p-4 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span className="font-medium text-amber-400">제출 오류</span>
              </div>
              <p className="text-sm text-neutral-300">{submitError}</p>
            </div>
          )}

          {/* Result Panel */}
          {result && (
            <div
              className={`border-t p-4 shrink-0 overflow-y-auto max-h-[40%] ${
                result.success
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-red-500/30 bg-red-500/10'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`font-medium ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.success ? '정답입니다!' : '오답입니다'}
                </span>
                {result.score !== undefined && (
                  <span className="text-sm text-neutral-400 ml-2">점수: {result.score}점</span>
                )}
              </div>
              <p className="text-sm text-neutral-300 whitespace-pre-wrap">{result.feedback}</p>
              {result.test_results && (
                <div className="mt-2 text-xs text-neutral-400">
                  테스트: {result.test_results.passed} 통과 / {result.test_results.failed} 실패
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
