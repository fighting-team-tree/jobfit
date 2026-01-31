import React, { useState } from 'react';
import { Plus, LayoutGrid, List as ListIcon, Calendar as CalendarIcon } from 'lucide-react';
import { PipelineBoard } from '../../components/dashboard/PipelineBoard'; // Reuse existing board
import AddApplicationModal from '../../components/pipeline/AddApplicationModal';

const Pipeline = () => {
    const [viewMode, setViewMode] = useState<'board' | 'list' | 'calendar'>('board');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2">지원 현황</h1>
                    <p className="text-neutral-400">진행 중인 모든 지원 건을 한눈에 관리하세요.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="p-1Rounded-lg bg-neutral-900 border border-white/10 flex p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('board')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
                        >
                            <ListIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
                        >
                            <CalendarIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <Plus className="w-5 h-5" />
                        지원 내역 추가
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden -mx-6 px-6 pb-6">
                {viewMode === 'board' ? (
                    <PipelineBoard />
                ) : (
                    <div className="flex items-center justify-center h-full border border-dashed border-white/10 rounded-3xl">
                        <p className="text-neutral-500">리스트/캘린더 뷰는 준비 중입니다.</p>
                    </div>
                )}
            </div>

            <AddApplicationModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </div>
    );
};

export default Pipeline;
