import React, { useState } from 'react';
import ResumeUpload from './ResumeUpload';
import ResumeReport from './ResumeReport';

const Resume = () => {
    const [step, setStep] = useState<'upload' | 'report'>('upload');

    return (
        <div className="min-h-screen pt-12">
            {step === 'upload' ? (
                <ResumeUpload onUploadComplete={() => setStep('report')} />
            ) : (
                <div className="space-y-6">
                    <button
                        onClick={() => setStep('upload')}
                        className="text-sm text-neutral-500 hover:text-white transition-colors"
                    >
                        ← 새 파일 업로드
                    </button>
                    <ResumeReport />
                </div>
            )}
        </div>
    );
};

export default Resume;
