import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, Mic, BookOpen, ChevronRight, Github } from 'lucide-react'

function App() {
  const [file, setFile] = useState<File | null>(null)

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-indigo-500/30">
      {/* Header */}
      <header className="fixed top-0 w-full border-b border-white/10 bg-neutral-950/80 backdrop-blur-md z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">J</span>
            </div>
            <span className="font-bold text-xl tracking-tight">JobFit</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-neutral-400">
            <Link to="/" className="hover:text-white transition-colors">홈</Link>
            <Link to="/interview" className="hover:text-white transition-colors">실전 면접</Link>
            <Link to="/roadmap" className="hover:text-white transition-colors">학습 로드맵</Link>
            <a href="https://github.com" target="_blank" className="hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8 animate-fade-in-up">
            <span className="flex w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            AI 기반 커리어 임팩트 에이전트
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            당신의 커리어 갭,<br />
            데이터로 채우세요.
          </h1>

          <p className="text-lg md:text-xl text-neutral-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            NVIDIA VLM이 이력서를 분석하고, ElevenLabs AI가 실시간 면접을 진행합니다.
            막막한 취업 준비, 이제 데이터 기반으로 전략적으로 접근하세요.
          </p>

          {/* Action Cards */}
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <Link to="/profile" className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                이력서 진단
                <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-neutral-400 text-sm">
                PDF 이력서를 업로드하면 AI가 구조를 파악하고 부족한 역량을 진단합니다.
              </p>
            </Link>

            <Link to="/interview" className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                실전 모의면접
                <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-neutral-400 text-sm">
                초저지연 음성 AI와 함께 실제 면접 상황을 시뮬레이션하세요.
              </p>
            </Link>

            <Link to="/dashboard" className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                맞춤형 로드맵
                <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-neutral-400 text-sm">
                분석된 갭을 채우기 위한 주차별 학습 계획을 자동으로 생성합니다.
              </p>
            </Link>
          </div>
        </div>
      </main>

      {/* Decorative Gradient Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-neutral-950">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-0 w-full h-[400px] bg-gradient-to-b from-indigo-500/10 to-transparent blur-3xl opacity-30"></div>
      </div>
    </div>
  )
}

export default App
