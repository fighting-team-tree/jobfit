import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, Loader2, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { CodeEditor } from '../components/problem/CodeEditor';
import { ProblemCard, type Problem } from '../components/problem/ProblemCard';
import { problemAPI } from '../lib/api';

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

  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProblem = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await problemAPI.getProblem(id);
        setProblem(data);
        setCode(data.starter_code || getDefaultCode(data.language || 'python'));
      } catch (err) {
        setError(err instanceof Error ? err.message : '문제를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblem();
  }, [id]);

  const getDefaultCode = (language: string): string => {
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

  const handleSubmit = async () => {
    if (!id || !problem) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const evalResult = await problemAPI.evaluateSolution(id, code);
      setResult(evalResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (problem) {
      setCode(problem.starter_code || getDefaultCode(problem.language || 'python'));
      setResult(null);
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

  if (error || !problem) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">문제를 찾을 수 없습니다</h1>
          <p className="text-neutral-400 mb-4">{error || '요청한 문제가 존재하지 않습니다.'}</p>
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

        {/* Right Column - Code Editor */}
        <div className="w-1/2 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              language={problem.language || 'python'}
              value={code}
              onChange={setCode}
            />
          </div>

          {/* Result Panel */}
          {result && (
            <div
              className={`border-t p-4 ${
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
              <p className="text-sm text-neutral-300">{result.feedback}</p>
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
