import React, { useState } from 'react';
import { X, Link, Mail, FileText, Check, Search, Plus } from 'lucide-react';

interface AddApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddApplicationModal: React.FC<AddApplicationModalProps> = ({ isOpen, onClose }) => {
    const [tab, setTab] = useState<'manual' | 'link' | 'email'>('manual');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-2xl shadow-xl animate-fade-in-up overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-bold">지원 내역 추가</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-neutral-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setTab('manual')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${tab === 'manual' ? 'border-indigo-500 text-white bg-white/5' : 'border-transparent text-neutral-400 hover:text-white'
                            }`}
                    >
                        <FileText className="w-4 h-4" /> 수동 입력
                    </button>
                    <button
                        onClick={() => setTab('link')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${tab === 'link' ? 'border-indigo-500 text-white bg-white/5' : 'border-transparent text-neutral-400 hover:text-white'
                            }`}
                    >
                        <Link className="w-4 h-4" /> 링크 파싱
                    </button>
                    <button
                        onClick={() => setTab('email')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${tab === 'email' ? 'border-indigo-500 text-white bg-white/5' : 'border-transparent text-neutral-400 hover:text-white'
                            }`}
                    >
                        <Mail className="w-4 h-4" /> 이메일 가져오기
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {tab === 'manual' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">회사명</label>
                                <input type="text" className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-white/10 focus:border-indigo-500 focus:outline-none transition-colors" placeholder="예: Google" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">직무</label>
                                <input type="text" className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-white/10 focus:border-indigo-500 focus:outline-none transition-colors" placeholder="예: Frontend Engineer" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-1">마감일</label>
                                    <input type="date" className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-white/10 focus:border-indigo-500 focus:outline-none transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-1">상태</label>
                                    <select className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-white/10 focus:border-indigo-500 focus:outline-none transition-colors">
                                        <option>관심</option>
                                        <option>지원완료</option>
                                        <option>서류통과</option>
                                        <option>면접진행</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'link' && (
                        <div className="py-8 text-center space-y-4">
                            <div className="relative max-w-lg mx-auto">
                                <input
                                    type="text"
                                    placeholder="채용 공고 URL을 붙여넣으세요"
                                    className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-white/10 focus:border-indigo-500 focus:outline-none pr-32"
                                />
                                <button className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors">
                                    불러오기
                                </button>
                            </div>
                            <p className="text-sm text-neutral-500">
                                링크를 입력하면 회사명, 직무, 마감일 등을 자동으로 채워줍니다.
                            </p>
                        </div>
                    )}

                    {tab === 'email' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm mb-4">
                                <Search className="w-4 h-4" />
                                <span>최근 7일간 수신된 채용 관련 이메일을 분석했습니다.</span>
                            </div>

                            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2">
                                {[
                                    { company: 'Wanted', title: '[채용] 지원해주셔서 감사합니다', date: '오늘' },
                                    { company: 'Programmers', title: '백엔드 개발자 서류 합격 안내', date: '어제' },
                                    { company: 'Greeting', title: '면접 일정 조율 부탁드립니다', date: '2일 전' }
                                ].map((mail, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer border border-transparent hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-neutral-700 flex items-center justify-center text-xs text-white">
                                                {mail.company[0]}
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium text-sm text-white">{mail.company}</p>
                                                <p className="text-xs text-neutral-400">{mail.title}</p>
                                            </div>
                                        </div>
                                        <div className="text-xs text-neutral-500">{mail.date}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
                    >
                        취소
                    </button>
                    <button className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors text-sm font-medium flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        저장하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddApplicationModal;
