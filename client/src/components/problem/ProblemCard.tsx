import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'coding' | 'quiz' | 'practical';
  starter_code?: string;
  language?: string;
  hints?: string[];
  skill?: string;
  week_number?: number;
}

interface ProblemCardProps {
  problem: Problem;
}

const difficultyColors = {
  easy: 'text-green-400 bg-green-500/10 border-green-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  hard: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const typeColors = {
  coding: 'text-blue-400 bg-blue-500/10',
  quiz: 'text-purple-400 bg-purple-500/10',
  practical: 'text-orange-400 bg-orange-500/10',
};

const typeLabels = {
  coding: '코딩',
  quiz: '퀴즈',
  practical: '실습',
};

export function ProblemCard({ problem }: ProblemCardProps) {
  const [showHints, setShowHints] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);

  const showNextHint = () => {
    if (problem.hints && currentHintIndex < problem.hints.length - 1) {
      setCurrentHintIndex(currentHintIndex + 1);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2 py-1 rounded text-xs font-medium border ${difficultyColors[problem.difficulty]}`}>
            {problem.difficulty.toUpperCase()}
          </span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[problem.type]}`}>
            {typeLabels[problem.type]}
          </span>
          {problem.skill && (
            <span className="px-2 py-1 rounded text-xs font-medium text-neutral-400 bg-neutral-700/50">
              {problem.skill}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{problem.title}</h1>
        {problem.week_number && (
          <p className="text-sm text-neutral-500">Week {problem.week_number}</p>
        )}
      </div>

      {/* Description */}
      <div className="prose prose-invert max-w-none mb-6">
        <div className="text-neutral-300 whitespace-pre-wrap leading-relaxed">
          {problem.description}
        </div>
      </div>

      {/* Hints Section */}
      {problem.hints && problem.hints.length > 0 && (
        <div className="border-t border-white/10 pt-4">
          <button
            onClick={() => setShowHints(!showHints)}
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            <span>힌트 ({problem.hints.length}개)</span>
            {showHints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHints && (
            <div className="mt-4 space-y-3">
              {problem.hints.slice(0, currentHintIndex + 1).map((hint, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-sm"
                >
                  <span className="font-medium">힌트 {index + 1}:</span> {hint}
                </div>
              ))}
              {currentHintIndex < problem.hints.length - 1 && (
                <button
                  onClick={showNextHint}
                  className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  다음 힌트 보기
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProblemCard;
