import React, { useState } from 'react';
import { Search, Building2, MapPin, Globe, ArrowRight } from 'lucide-react';

interface CompanySearchProps {
    onCompanySelect: (company: any) => void;
}

const CompanySearch: React.FC<CompanySearchProps> = ({ onCompanySelect }) => {
    const [query, setQuery] = useState('');

    const companies = [
        { id: 1, name: 'Google', location: 'Seoul, Korea', industry: 'IT / Software', logo: 'G' },
        { id: 2, name: 'Naver', location: 'Seongnam, Korea', industry: 'IT / Platform', logo: 'N' },
        { id: 3, name: 'Kakao', location: 'Jeju/Pangyo', industry: 'IT / Messenger', logo: 'K' },
        { id: 4, name: 'Coupang', location: 'Seoul, Korea', industry: 'E-commerce', logo: 'C' },
        { id: 5, name: 'Viva Republica', location: 'Seoul, Korea', industry: 'Fintech', logo: 'T' },
    ];

    const filtered = companies.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-4">어떤 기업이 궁금하신가요?</h1>
                <p className="text-neutral-400">기업의 인재상, 최근 뉴스, 면접 질문까지 AI가 요약해드립니다.</p>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-neutral-500" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 rounded-2xl bg-neutral-900 border border-white/10 focus:border-indigo-500 focus:outline-none text-lg transition-all shadow-lg"
                    placeholder="기업명 검색 (예: Google, Toss)"
                />
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((company) => (
                    <button
                        key={company.id}
                        onClick={() => onCompanySelect(company)}
                        className="p-6 rounded-2xl bg-neutral-900/50 border border-white/5 hover:border-indigo-500/30 hover:bg-neutral-900 transition-all text-left group"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center font-bold text-xl">
                                {company.logo}
                            </div>
                            <div className="p-2 rounded-full bg-white/5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                        <h3 className="text-lg font-bold mb-1 group-hover:text-indigo-400 transition-colors">{company.name}</h3>
                        <div className="flex flex-col gap-1 text-sm text-neutral-500">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3" /> {company.location}
                            </div>
                            <div className="flex items-center gap-2">
                                <Globe className="w-3 h-3" /> {company.industry}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CompanySearch;
