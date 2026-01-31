import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

const ResumeReport = () => {
    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
            {/* Header Score */}
            <div className="bg-neutral-900 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                    <h2 className="text-2xl font-bold mb-2">김철수님의 이력서 진단 결과</h2>
                    <p className="text-neutral-400">지원 희망 직무: <span className="text-indigo-400 font-semibold">Frontend Engineer (3-5y)</span></p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-sm text-neutral-500 font-medium mb-1">직무 적합도</p>
                        <p className="text-4xl font-bold text-indigo-400">82<span className="text-xl text-neutral-500">/100</span></p>
                    </div>
                    <div className="w-20 h-20 relative">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path className="text-neutral-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                            <path className="text-indigo-500" strokeDasharray="82, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Strengths */}
                <div className="p-6 rounded-3xl bg-neutral-900/50 border border-white/10">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        강점 (잘된 점)
                    </h3>
                    <ul className="space-y-4">
                        <li className="flex gap-3 text-sm text-neutral-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                            <p>기술 스택(React, TypeScript)이 지원 직무와 매우 잘 일치합니다.</p>
                        </li>
                        <li className="flex gap-3 text-sm text-neutral-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                            <p>프로젝트 성과를 수치로 정량화하여 표현한 부분이 인상적입니다. (예: 로딩 속도 30% 개선)</p>
                        </li>
                    </ul>
                </div>

                {/* Weaknesses */}
                <div className="p-6 rounded-3xl bg-neutral-900/50 border border-white/10">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-500" />
                        보완 필요 (개선점)
                    </h3>
                    <ul className="space-y-4">
                        <li className="flex gap-3 text-sm text-neutral-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2" />
                            <p>Soft Skill에 대한 언급이 다소 부족합니다. 협업 경험을 더 구체적으로 작성해보세요.</p>
                        </li>
                        <li className="flex gap-3 text-sm text-neutral-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2" />
                            <p>최신 프로젝트 (2024년)에 대한 기술적인 챌린지가 더 드러나면 좋겠습니다.</p>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Action Plan */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-900/20 to-neutral-900 border border-indigo-500/20">
                <h3 className="text-lg font-bold mb-4">✨ 제안 아이템</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    {/* Item 1: 서류 합격률 */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/50 transition-all flex flex-col h-full">
                        <span className="block text-xs font-bold text-indigo-400 mb-3 uppercase tracking-wider">서류 합격률</span>
                        <ul className="space-y-4 text-sm text-neutral-300 flex-1">
                            <li>
                                <strong className="block text-white mb-1">기술적 문제 해결의 '정량화'</strong>
                                "로딩 속도 30% 개선"이라는 결과에 더해, 어떤 기술(예: 가상 스크롤링, Web Worker 활용)을 사용해 해결했는지 구체적인 기술 명칭을 문장에 포함하세요.
                            </li>
                            <li>
                                <strong className="block text-white mb-1">핵심 키워드 배치(SEO)</strong>
                                지원 직무인 'Frontend Engineer' 공고에서 반복되는 핵심 스택(예: Next.js, Redux, Tailwind)을 이력서 상단 'Summary' 섹션에 전면 배치하여 ATS(채용 시스템) 최적화를 진행하세요.
                            </li>
                        </ul>
                    </div>

                    {/* Item 2: 면접 대비 역량 강화 */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/50 transition-all flex flex-col h-full">
                        <span className="block text-xs font-bold text-indigo-400 mb-3 uppercase tracking-wider">면접 대비 역량 강화</span>
                        <ul className="space-y-4 text-sm text-neutral-300 flex-1">
                            <li>
                                <strong className="block text-white mb-1">트러블슈팅 사례집 작성</strong>
                                보완점에서 지적된 '기술적 챌린지'를 보강하기 위해, 최근 프로젝트에서 겪은 메모리 누수 해결이나 브라우저 호환성 대응 과정을 블로그나 노션 포트폴리오에 상세히 기록하세요.
                            </li>
                            <li>
                                <strong className="block text-white mb-1">Soft Skill 수치화</strong>
                                "협업 능력 우수" 대신 "코드 리뷰 100회 이상 수행", "기획/디자인 팀과의 주간 회의를 통해 요구사항 반영 기간 20% 단축"과 같이 협업의 과정을 숫자로 증명하는 문구를 추가하세요.
                            </li>
                        </ul>
                    </div>

                    {/* Item 3: 커리어 전략 */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/50 transition-all flex flex-col h-full">
                        <span className="block text-xs font-bold text-indigo-400 mb-3 uppercase tracking-wider">커리어 전략</span>
                        <ul className="space-y-4 text-sm text-neutral-300 flex-1">
                            <li>
                                <strong className="block text-white mb-1">오픈소스 기여 및 라이브러리 제작</strong>
                                단순 기여를 넘어, 자주 사용되는 유틸리티 함수를 npm 패키지로 배포하거나 유명 프레임워크의 문구 수정(Docs 기여)부터 시작하여 기술적 영향력을 확장하세요.
                            </li>
                            <li>
                                <strong className="block text-white mb-1">기술 스택의 깊이 증명</strong>
                                React/TypeScript 숙련도 증명을 위해 내부 동작 원리(예: Reconciliation 과정, Generic을 활용한 타입 안전성 확보)를 주제로 한 기술 세미나 발표 자료를 포트폴리오에 연결하세요.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumeReport;
