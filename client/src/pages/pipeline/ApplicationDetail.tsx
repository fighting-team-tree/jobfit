import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Calendar, MapPin, Building2,
    ExternalLink, FileText,
    Clock
} from 'lucide-react';

const ApplicationDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    // Mock Data
    const job = {
        company: 'Google',
        role: 'Senior Frontend Engineer',
        location: 'Seoul, Korea (Hybrid)',
        type: 'Full-time',
        salary: 'Negotiable',
        appliedDate: '2023.10.15',
        url: 'https://careers.google.com/jobs',
        description: '구글에서 프론트엔드 시니어 엔지니어를 찾습니다. React, TypeScript 경험 필수...',
        status: '서류심사',
        timeline: [
            { date: '2023.10.15', title: '지원 완료', done: true },
            { date: '2023.10.20', title: '서류 심사 중', done: true },
            { date: '2023.10.25', title: '1차 면접 예정', done: false },
        ]
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-neutral-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    돌아가기
                </button>

                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center p-4">
                            <span className="text-3xl font-bold text-black">G</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{job.role}</h1>
                            <div className="flex items-center gap-4 text-neutral-400">
                                <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {job.company}</span>
                                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location}</span>
                                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {job.appliedDate} 지원</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2 font-medium">
                            <FileText className="w-4 h-4" />
                            이력서 보기
                        </button>
                        <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center gap-2 font-medium">
                            <ExternalLink className="w-4 h-4" />
                            공고 원본
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Timeline & Info */}
                <div className="space-y-6">
                    {/* Status Card */}
                    <div className="p-6 rounded-3xl bg-neutral-900 border border-white/10">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-400" />
                            진행 상태
                        </h3>
                        <div className="relative pl-4 space-y-6 border-l-2 border-white/10 ml-2">
                            {job.timeline.map((item, idx) => (
                                <div key={idx} className="relative">
                                    <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 ${item.done ? 'bg-indigo-500 border-indigo-500' : 'bg-neutral-900 border-neutral-600'}`} />
                                    <p className={`text-sm font-medium ${item.done ? 'text-white' : 'text-neutral-500'}`}>{item.title}</p>
                                    <p className="text-xs text-neutral-500">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Memo */}
                    <div className="p-6 rounded-3xl bg-neutral-900 border border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">메모</h3>
                            <button className="text-xs text-indigo-400 hover:underline">편집</button>
                        </div>
                        <p className="text-sm text-neutral-400 leading-relaxed">
                            채용 담당자: Sarah Kim<br />
                            기술 스택 중요: React Query, Zustand<br />
                            다음 면접 준비: 시스템 디자인 공부 필요
                        </p>
                    </div>
                </div>

                {/* Right Column: Job Description */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-8 rounded-3xl bg-neutral-900 border border-white/10 min-h-[400px]">
                        <h3 className="font-bold text-lg mb-6">직무 상세</h3>
                        <div className="prose prose-invert prose-sm max-w-none text-neutral-300">
                            <p>
                                <strong>Responsibilities:</strong><br />
                                - Build and maintain scalable web applications<br />
                                - Collaborate with cross-functional teams<br /><br />

                                <strong>Requirements:</strong><br />
                                - 5+ years of experience with React<br />
                                - Strong understanding of web performance<br />
                                - Experience with CI/CD
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplicationDetail;
