import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Github, LayoutDashboard, Mic, BookOpen } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Interview from './pages/Interview'

// Simple Roadmap Placeholder
const Roadmap = () => (
  <div className="container mx-auto px-6 pt-24 pb-12">
    <h1 className="text-3xl font-bold mb-4">학습 로드맵</h1>
    <p className="text-neutral-400">AI가 분석한 당신의 개인화된 학습 계획입니다.</p>
    <div className="mt-8 p-12 border border-dashed border-white/10 rounded-3xl text-center">
      <BookOpen className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
      <p className="text-neutral-500">이력서를 업로드하여 로드맵을 생성하세요.</p>
    </div>
  </div>
)

// Landing Page Component (Original App content)
const Landing = () => (
  <main className="pt-32 pb-20 px-6">
    <div className="container mx-auto max-w-4xl text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8">
        <span className="flex w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        AI 기반 커리어 임팩트 에이전트
      </div>

      <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
        당신의 커리어 갭,<br />
        데이터로 채우세요.
      </h1>

      <p className="text-lg md:text-xl text-neutral-400 mb-12 max-w-2xl mx-auto leading-relaxed">
        NVIDIA VLM이 이력서를 분석하고, ElevenLabs AI가 실시간 면접을 진행합니다.
      </p>

      <div className="flex justify-center gap-4">
        <Link to="/dashboard" className="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all">
          시작하기
        </Link>
        <Link to="/interview" className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold transition-all">
          면접 연습
        </Link>
      </div>
    </div>
  </main>
)

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-indigo-500/30">
        <header className="fixed top-0 w-full border-b border-white/10 bg-neutral-950/80 backdrop-blur-md z-50">
          <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="font-bold text-white">J</span>
              </div>
              <span className="font-bold text-xl tracking-tight">JobFit</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium text-neutral-400">
              <Link to="/dashboard" className="hover:text-white transition-colors flex items-center gap-1.5">
                <LayoutDashboard className="w-4 h-4" /> 대시보드
              </Link>
              <Link to="/interview" className="hover:text-white transition-colors flex items-center gap-1.5">
                <Mic className="w-4 h-4" /> 실전 면접
              </Link>
              <Link to="/roadmap" className="hover:text-white transition-colors flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" /> 학습 로드맵
              </Link>
              <a href="https://github.com" target="_blank" className="hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </nav>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/roadmap" element={<Roadmap />} />
        </Routes>

        {/* Background */}
        <div className="fixed inset-0 -z-10 h-full w-full bg-neutral-950">
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
          <div className="absolute top-0 w-full h-[400px] bg-gradient-to-b from-indigo-500/10 to-transparent blur-3xl opacity-30"></div>
        </div>
      </div>
    </Router>
  )
}

export default App
