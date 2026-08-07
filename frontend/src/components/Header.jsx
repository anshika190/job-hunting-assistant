import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Briefcase, 
  TrendingUp, 
  Upload, 
  Compass, 
  Award, 
  ThumbsUp, 
  Settings, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: TrendingUp },
    { name: 'Upload Resume', path: '/upload', icon: Upload },
    { name: 'Targeting', path: '/targets', icon: Compass },
    { name: 'Job Matches', path: '/jobs', icon: Award },
    { name: 'Review Gate', path: '/review', icon: ThumbsUp },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="w-full bg-slate-950/60 backdrop-blur-md border-b border-slate-900 py-3.5 px-4 md:px-6 z-50 flex-shrink-0 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
        
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-9 h-9 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/10">
            <Briefcase className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold text-base bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
            JobAssistant
          </span>
        </div>

        {user && (
          <>
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-5">
              <nav className="flex items-center space-x-3.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button 
                      key={item.path}
                      onClick={() => navigate(item.path)} 
                      className={`text-xs font-semibold py-1.5 px-2.5 rounded-lg transition-all duration-200 flex items-center space-x-1.5 ${
                        active 
                          ? 'bg-brand-500/10 text-brand-400 border border-brand-500/25' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>
              
              <div className="h-4 w-[1px] bg-slate-800"></div>
              
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-200">{user.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-rose-500/10 hover:border-rose-500/20 text-slate-400 hover:text-rose-450 transition-all duration-200 flex items-center space-x-1.5 text-xs font-semibold"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Mobile/Tablet Menu Button */}
            <div className="flex lg:hidden items-center space-x-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg border border-slate-850 bg-slate-900/40 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile/Tablet Dropdown Navigation Menu */}
      {user && mobileMenuOpen && (
        <div className="absolute top-[100%] left-0 w-full bg-slate-950/95 border-b border-slate-900 backdrop-blur-lg px-4 py-4 space-y-4 z-50 lg:hidden shadow-2xl animate-fadeIn">
          <nav className="flex flex-col space-y-2.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button 
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }} 
                  className={`w-full text-left text-sm font-semibold py-2.5 px-3.5 rounded-xl transition-all duration-200 flex items-center space-x-2.5 ${
                    active 
                      ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
          
          <div className="h-[1px] w-full bg-slate-900/80"></div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-200 leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-rose-500/10 hover:border-rose-500/20 text-slate-400 hover:text-rose-455 transition-all duration-200 flex items-center space-x-2 text-xs font-bold"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
