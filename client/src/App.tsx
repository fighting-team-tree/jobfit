import { Link } from 'react-router-dom'
import { Upload, Mic, BookOpen, ChevronRight, Github, Building2, User, RefreshCw, FileText } from 'lucide-react'
import { LoginButton } from './components/auth'
import OnboardingWidget from './components/OnboardingWidget'
import { useProfileStore } from './lib/store'

function App() {
  const { profile } = useProfileStore()
  const hasProfile = !!(profile && (profile.skills?.length > 0 || profile.experience?.length > 0))

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-indigo-500/30 relative">
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
            <Link to="/" className="hover:text-white transition-colors text-white">홈</Link>
            <Link to="/dashboard" className="hover:text-white transition-colors">대시보드</Link>
            <Link to="/companies" className="hover:text-white transition-colors">기업 매칭</Link>
            <Link to="/interview" className="hover:text-white transition-colors">실전 면접</Link>
            <Link to="/roadmap" className="hover:text-white transition-colors">학습 로드맵</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <LoginButton />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-20 px-6">
        <div className="container mx-auto max-w-5xl">
          {!hasProfile ? (
            // ============ 1. 프로필이 없는 사용자 (온보딩 모드) ============
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8 animate-fade-in">
                <span className="flex w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                AI 기반 커리어 임팩트 에이전트
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                당신의 커리어 갭,<br className="sm:hidden" />
                데이터로 채우세요.
              </h1>

              <p className="text-base md:text-lg text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                NVIDIA VLM이 이력서를 분석하고, ElevenLabs AI가 실시간 면접을 진행합니다.
                막막한 취업 준비, 이제 데이터 기반으로 전략적으로 접근하세요.
              </p>

              {/* 온보딩 입력 위젯 직접 노출 */}
              <div className="mb-12">
                <OnboardingWidget />
              </div>

              {/* 하단 기능 소개 섹션 */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left border-t border-white/5 pt-10 mt-10">
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <h4 className="text-sm font-semibold text-neutral-200 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    이력서 진단
                  </h4>
                  <p className="text-xs text-neutral-400">PDF 이력서를 업로드하면 AI가 구조를 파악하고 부족한 역량을 진단합니다.</p>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <h4 className="text-sm font-semibold text-neutral-200 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    실전 모의면접
                  </h4>
                  <p className="text-xs text-neutral-400">초저지연 음성 AI와 함께 실제 면접 상황을 시뮬레이션하세요.</p>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <h4 className="text-sm font-semibold text-neutral-200 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    맞춤형 로드맵
                  </h4>
                  <p className="text-xs text-neutral-400">분석된 갭을 채우기 위한 주차별 학습 계획을 자동으로 생성합니다.</p>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <h4 className="text-sm font-semibold text-neutral-200 mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    기업 매칭
                  </h4>
                  <p className="text-xs text-neutral-400">여러 기업의 채용공고를 등록하고 Claude AI로 매칭 분석을 받아보세요.</p>
                </div>
              </div>
            </div>
          ) : (
            // ============ 2. 프로필이 이미 있는 사용자 (퀵 대시보드 모드) ============
            <div className="space-y-8 animate-fade-in">
              {/* 인사말 및 현재 상태 */}
              <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                {/* 비주얼 라이트 효과 */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    커리어 분석 준비 완료
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-neutral-100">
                    안녕하세요, {profile.name || '지원자'}님!
                  </h1>
                  <p className="text-neutral-400 text-sm max-w-xl">
                    현재 이력서 분석 정보가 등록되어 있습니다. 보유한 핵심 기술 스택과 경력을 바탕으로 취업 준비 전략을 설계해보세요.
                  </p>
                </div>

                <div className="flex flex-wrap md:flex-nowrap gap-2.5 shrink-0">
                  <Link
                    to="/profile"
                    className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-white/10 rounded-xl text-xs md:text-sm font-medium flex items-center gap-2 transition-all text-neutral-300 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4" />
                    이력서 재분석
                  </Link>
                  <Link
                    to="/profile"
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/10"
                  >
                    <User className="w-4 h-4" />
                    내 프로필 상세
                  </Link>
                </div>
              </div>

              {/* 프로필 서머리 위젯 */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 p-6 rounded-2xl border border-white/10 bg-white/5 space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    나의 기술 스택 요약
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills && profile.skills.length > 0 ? (
                      profile.skills.slice(0, 15).map((skill, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-500">추출된 기술 스택이 없습니다.</span>
                    )}
                    {profile.skills && profile.skills.length > 15 && (
                      <span className="px-2.5 py-1 rounded-lg bg-neutral-800 border border-white/10 text-neutral-400 text-xs">
                        +{profile.skills.length - 15}개 더보기
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-300">경력 & 프로젝트</h3>
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-400">
                      등록된 회사 경력: <span className="text-neutral-200 font-bold font-mono">{profile.experience?.length || 0}건</span>
                    </p>
                    <p className="text-xs text-neutral-400">
                      등록된 프로젝트: <span className="text-neutral-200 font-bold font-mono">{profile.projects?.length || 0}건</span>
                    </p>
                  </div>
                  <div className="text-[11px] text-neutral-500 border-t border-white/5 pt-2">
                    이력서 기준 최신 정보가 동기화되어 있습니다.
                  </div>
                </div>
              </div>

              {/* 서비스 바로가기 큰 카드 영역 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-neutral-200">어떤 준비를 시작하시겠습니까?</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Card 1: 갭 분석 */}
                  <Link to="/dashboard" className="p-6 rounded-3xl border border-white/10 bg-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/[0.02] transition-all group relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 flex items-center gap-1.5">
                        채용공고(JD) 갭 분석
                        <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:translate-x-1.5 transition-transform" />
                      </h3>
                      <p className="text-neutral-400 text-xs md:text-sm leading-relaxed">
                        원하는 기업의 채용공고 내용을 입력해 내 프로필 스택과 맞춤 매칭을 진단하고 매칭 점수를 계산합니다.
                      </p>
                    </div>
                  </Link>

                  {/* Card 2: 실전 모의면접 */}
                  <Link to="/interview" className="p-6 rounded-3xl border border-white/10 bg-white/5 hover:border-violet-500/40 hover:bg-violet-500/[0.02] transition-all group relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-500/10 transition-colors" />
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Mic className="w-6 h-6 text-violet-400" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 flex items-center gap-1.5">
                        AI 실시간 음성 면접
                        <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:translate-x-1.5 transition-transform" />
                      </h3>
                      <p className="text-neutral-400 text-xs md:text-sm leading-relaxed">
                        내 이력서 기반의 꼬리 질문과 대답에 따른 적응형 난이도 조절이 제공되는 ElevenLabs 음성 AI 면접을 진행합니다.
                      </p>
                    </div>
                  </Link>

                  {/* Card 3: 학습 로드맵 */}
                  <Link to="/roadmap" className="p-6 rounded-3xl border border-white/10 bg-white/5 hover:border-emerald-500/40 hover:bg-emerald-500/[0.02] transition-all group relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 flex items-center gap-1.5">
                        주차별 학습 로드맵 & 퀴즈
                        <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:translate-x-1.5 transition-transform" />
                      </h3>
                      <p className="text-neutral-400 text-xs md:text-sm leading-relaxed">
                        분석된 부족한 갭을 메우기 위해 AI가 추천하는 맞춤형 커리큘럼을 진행하고 코딩 및 퀴즈 문제를 학습합니다.
                      </p>
                    </div>
                  </Link>

                  {/* Card 4: 기업 공고 관리 */}
                  <Link to="/companies" className="p-6 rounded-3xl border border-white/10 bg-white/5 hover:border-orange-500/40 hover:bg-orange-500/[0.02] transition-all group relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-orange-500/10 transition-colors" />
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Building2 className="w-6 h-6 text-orange-400" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 flex items-center gap-1.5">
                        내 매칭 기업 관리
                        <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:translate-x-1.5 transition-transform" />
                      </h3>
                      <p className="text-neutral-400 text-xs md:text-sm leading-relaxed">
                        여러 채용 공고를 리스트업하고, Claude AI 분석을 통해 각 공고와의 상세 역량 핏 및 적합도를 다각도로 진단합니다.
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Decorative Gradient Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-neutral-950 pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-0 w-full h-[400px] bg-gradient-to-b from-indigo-500/10 to-transparent blur-3xl opacity-30"></div>
      </div>
    </div>
  )
}

export default App
