import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Briefcase,
    Search,
    Building2,
    FileText,
    Settings,
    LogOut
} from 'lucide-react';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const location = useLocation();

    const navItems = [
        { icon: LayoutDashboard, label: '대시보드', path: '/dashboard' },
        { icon: Briefcase, label: '지원현황', path: '/pipeline' },
        { icon: Search, label: '공고 탐색', path: '/jobs' },
        { icon: Building2, label: '기업 리서치', path: '/research' },
        { icon: FileText, label: '이력서', path: '/resume' },
        { icon: Settings, label: '설정', path: '/settings' },
    ];

    return (
        <div className="flex min-h-screen bg-neutral-950 text-neutral-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-neutral-900/50 flex flex-col fixed h-full z-10 hidden md:flex">
                <div className="p-6">
                    <Link to="/dashboard" className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <span className="font-bold text-white text-lg">J</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight">JobFit</span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <p className="px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Menu</p>
                    {navItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                        ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                                        : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-neutral-500'}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
                        <LogOut className="w-5 h-5" />
                        로그아웃
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 min-h-screen relative">
                {/* Mobile Header Placeholder (if needed later) */}

                {/* Page Content */}
                <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
