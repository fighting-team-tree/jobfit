import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const Landing = () => {
    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-indigo-500/30">
            <div className="absolute top-0 w-full h-[500px] bg-gradient-to-b from-indigo-500/10 to-transparent blur-3xl opacity-30 pointer-events-none"></div>

            <nav className="relative container mx-auto px-6 h-20 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <span className="font-bold text-white">J</span>
                    </div>
                    <span className="font-bold text-xl tracking-tight">JobFit</span>
                </div>
                <Link to="/onboarding/login" className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition-all backdrop-blur-sm">
                    로그인
                </Link>
            </nav>

            <main className="relative pt-32 pb-20 px-6 z-10">
                <div className="container mx-auto max-w-4xl text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-8 uppercase tracking-wide animate-fade-in-up">
                        <span className="flex w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        AI Career Impact Agent
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight tracking-tight bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent">
                        취업의 모든 순간을<br />
                        데이터로 연결하다.
                    </h1>

                    <p className="text-lg md:text-xl text-neutral-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                        이제 관리 따로, 준비 따로 하지 마세요.<br className="md:hidden" />
                        JobFit이 지원 일정 관리부터 이력서 진단, 면접 대비까지<br className="md:hidden" />
                        하나의 흐름으로 연결해드립니다.
                    </p>

                    <div className="flex flex-col md:flex-row justify-center gap-4 mb-20">
                        <Link to="/onboarding/goal" className="group px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25">
                            지금 시작하기
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto">
                        {[
                            { title: "자동화된 일정 관리", desc: "이메일과 캘린더에서 지원 내역을 자동으로 불러와 정리합니다." },
                            { title: "AI 이력서 진단", desc: "VLM 기술로 이력서를 분석하고 직무 적합도를 점수화합니다." },
                            { title: "실전 모의 면접", desc: "내 이력서 기반의 맞춤형 질문으로 AI 면접관과 연습하세요." }
                        ].map((feature, idx) => (
                            <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                                <p className="text-sm text-neutral-400 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Landing;
