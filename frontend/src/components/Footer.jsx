import React from 'react';
import { Mail, Briefcase, Upload, ArrowRight, Award } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="w-full mt-auto relative overflow-hidden bg-gradient-to-b from-[#070B18] via-[#0E1528] to-[#0A0E1A] border-t border-slate-900 rounded-t-[32px] shadow-2xl z-10 flex-shrink-0">
      
      {/* Background Glowing Blobs */}
      <div className="absolute top-[-100px] left-[5%] w-[450px] h-[350px] bg-brand-500/5 rounded-full blur-[130px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[-100px] right-[5%] w-[450px] h-[350px] bg-violet-600/5 rounded-full blur-[130px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '-3s' }}></div>
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800/40 to-transparent"></div>

      <div className="w-full max-w-7xl mx-auto py-12 px-6 md:px-12 relative z-20">
        
        {/* Top Section: CTA Box */}
        <div className="glass-panel p-8 md:p-10 rounded-2xl border border-slate-900 bg-slate-950/45 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-brand-500 to-indigo-500"></div>
          
          <div className="space-y-2">
            <h3 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-100">
              Ready to accelerate your job search?
            </h3>
            <p className="text-xs md:text-sm text-slate-400 max-w-lg leading-relaxed">
              Track applications, analyze resumes, and prepare for interviews with AI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3.5">
            <button
              onClick={() => navigate('/upload')}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-xs font-bold rounded-xl text-white shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 transition-all duration-200 flex items-center space-x-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-brand-300" />
              <span>Upload Resume</span>
            </button>
            
            <button
              onClick={() => navigate('/jobs')}
              className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-brand-500/30 text-slate-205 hover:text-brand-400 text-xs font-bold rounded-xl transition-all duration-200 flex items-center space-x-2 cursor-pointer"
            >
              <Award className="w-4 h-4 text-slate-500" />
              <span>Explore Jobs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Middle Section: 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-8 border-b border-slate-900/60">
          
          {/* Column 1: Brand & Logo */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 bg-gradient-to-tr from-brand-600 via-indigo-600 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 transform hover:scale-105 hover:rotate-3 transition-transform duration-300">
                <Briefcase className="w-5.5 h-5.5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-350">
                  JobAssistant
                </span>
                <span className="block text-[9px] font-bold text-brand-400 uppercase tracking-widest mt-0.5">
                  AI Career Copilot
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-405 leading-relaxed max-w-xs">
              Helping developers track applications, analyze resumes, and land interviews faster.
            </p>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Product
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/dashboard" className="group text-xs text-slate-400 hover:text-brand-400 flex items-center transition-all duration-300 transform hover:translate-x-1">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/jobs" className="group text-xs text-slate-400 hover:text-brand-400 flex items-center transition-all duration-300 transform hover:translate-x-1">
                  Job Matches
                </Link>
              </li>
              <li>
                <Link to="/targets" className="group text-xs text-slate-400 hover:text-brand-400 flex items-center transition-all duration-300 transform hover:translate-x-1">
                  Targeting
                </Link>
              </li>
              <li>
                <Link to="/settings" className="group text-xs text-slate-400 hover:text-brand-400 flex items-center transition-all duration-300 transform hover:translate-x-1">
                  Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Connect Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Connect
            </h4>
            <div className="flex items-center space-x-3.5">
              {/* LinkedIn Custom SVG */}
              <a 
                href="https://linkedin.com/in/anshika-garg-8647732b6" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-slate-900 bg-slate-950/60 hover:bg-brand-500/10 hover:border-brand-500/30 text-slate-400 hover:text-brand-400 hover:scale-110 hover:shadow-lg hover:shadow-brand-500/10 transition-all duration-300 flex items-center justify-center shadow-sm"
                aria-label="LinkedIn Profile"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="15" 
                  height="15" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect width="4" height="12" x="2" y="9"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>

              {/* GitHub Custom SVG */}
              <a 
                href="https://github.com/anshika190" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-slate-900 bg-slate-950/60 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 hover:scale-110 hover:shadow-lg hover:shadow-slate-800/10 transition-all duration-300 flex items-center justify-center shadow-sm"
                aria-label="GitHub Profile"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="15" 
                  height="15" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                >
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                  <path d="M9 18c-4.51 2-5-2-7-2"/>
                </svg>
              </a>

              {/* Email Lucide Icon */}
              <a 
                href="mailto:garganshika005@gmail.com" 
                className="w-10 h-10 rounded-full border border-slate-900 bg-slate-950/60 hover:bg-violet-500/10 hover:border-violet-500/30 text-slate-400 hover:text-violet-400 hover:scale-110 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300 flex items-center justify-center shadow-sm"
                aria-label="Send Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-[11px] text-slate-505">
          <p>© 2026 JobAssistant</p>
          <p className="font-semibold text-slate-500/80 tracking-wide uppercase text-[9px] bg-slate-950/45 px-3.5 py-1 rounded-full border border-slate-900/60">
            Built with Spring Boot • React • Gemini AI
          </p>
          <p>
            Made with ❤️ by <span className="text-slate-405 font-semibold">Anshika Garg</span>
          </p>
        </div>

      </div>
    </footer>
  );
}
