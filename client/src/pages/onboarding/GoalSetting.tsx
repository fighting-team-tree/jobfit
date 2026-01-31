import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, MapPin, Target, Check, ArrowRight } from 'lucide-react';

const GoalSetting = () => {
    const navigate = useNavigate();
    const [selectedJob, setSelectedJob] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');

    const jobs = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Scientist', 'PM'];
    const levels = ['Internship', 'Junior (1-3y)', 'Mid (4-6y)', 'Senior (7y+)'];

    const handleNext = () => {
        if (selectedJob && selectedLevel) {
            navigate('/onboarding/connect');
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-lg">
                <div className="mb-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 mb-6">
                        <Target className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl font-bold mb-3">어떤 커리어를<br />꿈꾸고 계신가요?</h1>
                    <p className="text-neutral-400">목표를 설정하면 딱 맞는 공고와 학습 로드맵을 추천해드려요.</p>
                </div>

                <div className="space-y-8">
                    {/* Job Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> 희망 직무
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {jobs.map((job) => (
                                <button
                                    key={job}
                                    onClick={() => setSelectedJob(job)}
                                    className={`p-4 rounded-xl border text-sm font-medium transition-all text-left flex items-center justify-between group ${selectedJob === job
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                            : 'bg-white/5 border-white/5 text-neutral-400 hover:border-white/10 hover:text-neutral-200'
                                        }`}
                                >
                                    {job}
                                    {selectedJob === job && <Check className="w-4 h-4 animate-scale-in" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Level Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> 경력/레벨
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {levels.map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setSelectedLevel(level)}
                                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${selectedLevel === level
                                            ? 'bg-white text-black border-white font-semibold'
                                            : 'bg-transparent border-white/10 text-neutral-400 hover:border-white/20'
                                        }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex justify-end">
                    <button
                        onClick={handleNext}
                        disabled={!selectedJob || !selectedLevel}
                        className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition-all"
                    >
                        다음으로
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GoalSetting;
