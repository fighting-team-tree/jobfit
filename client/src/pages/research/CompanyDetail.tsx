import React from 'react';
import { ArrowLeft, ExternalLink, Users, TrendingUp, Newspaper } from 'lucide-react';

interface CompanyDetailProps {
    company: any;
    onBack: () => void;
}

const CompanyDetail: React.FC<CompanyDetailProps> = ({ company, onBack }) => {
    return (
        <div className="max-w-5xl mx-auto animate-fade-in-up">
            <button
                onClick={onBack}
                className="flex items-center text-neutral-400 hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                돌아가기
            </button>

            <div className="bg-neutral-900 border border-white/10 rounded-3xl p-8 mb-8">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-4xl font-bold text-black">
                            {company.logo}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{company.name}</h1>
                            <p className="text-neutral-400">{company.industry} • {company.location}</p>
                        </div>
                    </div>
                    <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2 text-sm font-medium">
                        <ExternalLink className="w-4 h-4" />
                        채용 사이트
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* AI Summary */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="p-8 rounded-3xl bg-neutral-900/50 border border-white/10">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            AI 기업 분석 요약
                        </h3>
                        <p className="text-neutral-300 leading-relaxed mb-6">
                            {company.name}은(는) 최근 AI 및 머신러닝 기술 도입을 적극적으로 추진하고 있으며,
                            특히 검색 품질 개선과 신규 플랫폼 서비스 확장에 집중하고 있습니다.
                            자율적이고 수평적인 조직 문화를 지향하며, 코드 리뷰와 기술 공유를 중요하게 생각하는 것으로 알려져 있습니다.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/5">
                                <h4 className="font-bold text-sm text-neutral-400 mb-2">인재상 키워드</h4>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-xs">자기주도</span>
                                    <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-xs">성장지향</span>
                                    <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-xs">협업</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5">
                                <h4 className="font-bold text-sm text-neutral-400 mb-2">주요 기술 스택</h4>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 rounded bg-neutral-800 text-neutral-400 text-xs">React</span>
                                    <span className="px-2 py-1 rounded bg-neutral-800 text-neutral-400 text-xs">Spring Boot</span>
                                    <span className="px-2 py-1 rounded bg-neutral-800 text-neutral-400 text-xs">Kubernetes</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* News */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Newspaper className="w-5 h-5 text-neutral-500" />
                            최근 관련 뉴스
                        </h3>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/10">
                                <div className="w-24 h-16 bg-neutral-800 rounded-lg shrink-0" />
                                <div>
                                    <h4 className="font-bold text-sm mb-1">{company.name}, 상반기 대규모 개발자 채용 실시</h4>
                                    <p className="text-xs text-neutral-500">테크뉴스 • 2일 전</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-neutral-900/50 border border-white/10">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-neutral-400" />
                            현직자 리뷰 요약
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-neutral-400">총 만족도</span>
                                    <span className="font-bold text-indigo-400">4.2</span>
                                </div>
                                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-[84%]" />
                                </div>
                            </div>
                            <div className="text-sm text-neutral-300">
                                "개발 문화가 좋고 동료들이 뛰어나서 배울 점이 많음. 다만 업무 강도는 센 편."
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-neutral-900/50 border border-white/10">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-neutral-400" />
                            급여/복지 정보
                        </h3>
                        <ul className="space-y-2 text-sm text-neutral-400">
                            <li className="flex justify-between">
                                <span>신입 초봉</span>
                                <span className="text-white">6,000만원 ~</span>
                            </li>
                            <li className="flex justify-between">
                                <span>복지 포인트</span>
                                <span className="text-white">연 300만원</span>
                            </li>
                            <li className="flex justify-between">
                                <span>근무 형태</span>
                                <span className="text-white">하이브리드</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyDetail;
