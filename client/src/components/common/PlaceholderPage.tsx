import React from 'react';

const PlaceholderPage = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-2xl">🚧</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-neutral-400">페이지 준비 중입니다.</p>
    </div>
);

export default PlaceholderPage;
