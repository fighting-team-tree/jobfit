import React from 'react';
import { PipelineBoard } from '../components/dashboard/PipelineBoard';
import { Calendar, Clock, Bell } from 'lucide-react';

const Dashboard = () => {
    return (
        <div className="container mx-auto px-6 pt-24 pb-12">
            <div className="flex flex-col md:flex-row gap-8 mb-12">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">대시보드</h1>
                    <p className="text-neutral-400">지원 현황과 학습 일정을 관리하세요.</p>
                </div>

                {/* Schedule Widget */}
                <div className="w-full md:w-80 p-6 rounded-2xl bg-indigo-600/10 border border-indigo-500/20">
                    <h3 className="font-semibold text-indigo-400 flex items-center gap-2 mb-4">
                        <Calendar className="w-4 h-4" />
                        이번 주 일정
                    </h3>
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500/20 flex flex-col items-center justify-center text-[10px] font-bold">
                                <span className="text-indigo-400">FEB</span>
                                <span>02</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium">Google 면접</h4>
                                <div className="flex items-center gap-2 text-xs text-neutral-500">
                                    <Clock className="w-3 h-3" />
                                    14:00 PM
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-neutral-800 flex flex-col items-center justify-center text-[10px] font-bold">
                                <span className="text-neutral-500">FEB</span>
                                <span>05</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium">AWS 자격증 학습</h4>
                                <div className="flex items-center gap-2 text-xs text-neutral-500">
                                    <Clock className="w-3 h-3" />
                                    10:00 AM
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">파이프라인</h2>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs font-medium hover:bg-neutral-700 transition-colors">필터</button>
                        <button className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-medium hover:bg-indigo-500 transition-colors text-white">추가하기</button>
                    </div>
                </div>
                <PipelineBoard />
            </div>
        </div>
    );
};

export default Dashboard;
