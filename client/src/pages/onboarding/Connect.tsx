import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Calendar, ArrowRight, Check } from 'lucide-react';

const Connect = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-lg text-center">
                <h1 className="text-3xl font-bold mb-3">흩어진 지원 내역을<br />한곳에 모아볼까요?</h1>
                <p className="text-neutral-400 mb-10">이메일과 캘린더를 연동하면 지원 일정을 자동으로 정리해드려요.</p>

                <div className="space-y-4 mb-12">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 group hover:border-indigo-500/30 transition-all cursor-pointer">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors">
                            <Mail className="w-6 h-6" />
                        </div>
                        <div className="text-left flex-1">
                            <h3 className="font-semibold text-lg">Gmail 연동</h3>
                            <p className="text-sm text-neutral-500">지원 완료 메일, 합격 메일 자동 분류</p>
                        </div>
                        <button className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs font-medium text-neutral-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            연동하기
                        </button>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 group hover:border-indigo-500/30 transition-all cursor-pointer">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div className="text-left flex-1">
                            <h3 className="font-semibold text-lg">Google Calendar</h3>
                            <p className="text-sm text-neutral-500">면접 일정 자동 동기화</p>
                        </div>
                        <button className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs font-medium text-neutral-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            연동하기
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => navigate('/onboarding/import')}
                        className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        연동 완료 및 계속하기
                    </button>

                    <button
                        onClick={() => navigate('/onboarding/import')}
                        className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                        건너뛰기 (나중에 설정)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Connect;
