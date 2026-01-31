import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Building2 } from 'lucide-react';

const Import = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // Mock Data
    const foundApplications = [
        { id: 1, company: 'Google', role: 'Frontend Engineer', date: '2023.10.15' },
        { id: 2, company: 'Toss', role: 'Product Designer', date: '2023.10.12' },
        { id: 3, company: 'Kakao', role: 'Server Developer', date: '2023.10.05' },
    ];

    useEffect(() => {
        // Simulate analyzing emails
        const timer = setTimeout(() => {
            setLoading(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-lg text-center">
                {loading ? (
                    <div className="py-20 animate-fade-in">
                        <Loader2 className="w-12 h-12 text-indigo-500 mx-auto mb-6 animate-spin" />
                        <h2 className="text-2xl font-bold mb-2">메일함을 분석하고 있어요</h2>
                        <p className="text-neutral-400">잠시만 기다려주세요...</p>
                    </div>
                ) : (
                    <div className="animate-fade-in-up">
                        <h1 className="text-3xl font-bold mb-3">{foundApplications.length}개의 지원 내역을<br />찾았습니다!</h1>
                        <p className="text-neutral-400 mb-8">대시보드에 추가할 항목을 선택해주세요.</p>

                        <div className="space-y-3 mb-12">
                            {foundApplications.map((app) => (
                                <div key={app.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-left group hover:border-indigo-500/50 transition-all cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                                            <Building2 className="w-5 h-5 text-neutral-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">{app.company}</h4>
                                            <p className="text-xs text-neutral-500">{app.role} • {app.date}</p>
                                        </div>
                                    </div>
                                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                        >
                            대시보드로 이동
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Import;
