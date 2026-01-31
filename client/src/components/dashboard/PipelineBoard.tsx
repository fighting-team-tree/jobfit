import React from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';

interface Job {
    id: string;
    company: string;
    role: string;
    status: 'Planned' | 'Applied' | 'Interviewing' | 'Offer' | 'Rejected';
}

const columns = [
    { title: '준비 중', status: 'Planned' },
    { title: '지원 완료', status: 'Applied' },
    { title: '면접 진행', status: 'Interviewing' },
    { title: '오퍼 완료', status: 'Offer' },
];

const mockJobs: Job[] = [
    { id: '1', company: 'Google', role: 'Frontend Engineer', status: 'Interviewing' },
    { id: '2', company: 'Meta', role: 'Software Engineer', status: 'Planned' },
    { id: '3', company: 'Naver', role: 'Full Stack Dev', status: 'Applied' },
];

export const PipelineBoard = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 overflow-x-auto pb-4">
            {columns.map((column) => (
                <div key={column.status} className="flex flex-col gap-4 min-w-[280px]">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="font-semibold text-neutral-300 flex items-center gap-2">
                            {column.title}
                            <span className="text-xs bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">
                                {mockJobs.filter(j => j.status === column.status).length}
                            </span>
                        </h3>
                        <button className="text-neutral-500 hover:text-white transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-3 min-h-[500px] p-2 rounded-xl bg-neutral-900/50 border border-white/5">
                        {mockJobs.filter(j => j.status === column.status).map(job => (
                            <div key={job.id} className="p-4 rounded-xl bg-neutral-800/50 border border-white/10 hover:border-indigo-500/50 transition-all cursor-grab active:cursor-grabbing group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                                        {job.company}
                                    </span>
                                    <button className="text-neutral-600 group-hover:text-neutral-400">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </div>
                                <h4 className="font-medium text-white mb-1">{job.role}</h4>
                                <div className="mt-4 flex items-center gap-2 text-[10px] text-neutral-500">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Updated 2h ago
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
