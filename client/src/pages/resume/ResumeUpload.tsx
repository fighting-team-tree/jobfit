import React, { useState } from 'react';
import { UploadCloud, FileText, Check, AlertCircle } from 'lucide-react';

interface ResumeUploadProps {
    onUploadComplete: () => void;
}

const ResumeUpload: React.FC<ResumeUploadProps> = ({ onUploadComplete }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleAnalyze = () => {
        if (!file) return;
        setIsAnalyzing(true);
        // Simulate API call
        setTimeout(() => {
            setIsAnalyzing(false);
            onUploadComplete();
        }, 2000);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold mb-3">이력서를 업로드하세요</h2>
                <p className="text-neutral-400">NVIDIA VLM 기술을 활용해 이력서를 정밀 진단하고<br />부족한 부분을 채워줄 커리어 로드맵을 제안합니다.</p>
            </div>

            <div
                className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all ${isDragging
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    accept=".pdf,.docx"
                />

                {file ? (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-xl font-medium mb-1">{file.name}</p>
                        <p className="text-sm text-neutral-400 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium z-10 relative">
                            다른 파일 선택
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center pointer-events-none">
                        <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-6">
                            <UploadCloud className="w-8 h-8 text-neutral-400" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">파일을 이곳에 드래그하세요</h3>
                        <p className="text-neutral-500 text-sm mb-6">또는 클릭하여 직접 선택</p>
                        <div className="flex gap-2">
                            <span className="px-2 py-1 rounded bg-neutral-800 text-xs text-neutral-500">PDF</span>
                            <span className="px-2 py-1 rounded bg-neutral-800 text-xs text-neutral-500">DOCX</span>
                        </div>
                    </div>
                )}
            </div>

            {file && (
                <div className="mt-8">
                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-sm flex items-start gap-3 mb-6">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>개인정보(전화번호, 주소 등)는 분석 후 즉시 마스킹 처리되며, 서버에 안전하게 보관됩니다.</p>
                    </div>

                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {isAnalyzing ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                이력서 분석 중...
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                AI 진단 시작하기
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ResumeUpload;
