import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Briefcase, 
  LogOut, 
  Upload, 
  Compass,
  Award,
  ThumbsUp,
  Settings,
  TrendingUp,
  Clock,
  ChevronRight,
  Activity,
  Layers,
  Sparkles,
  Send,
  Video,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Header from '../components/Header';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryResponse, insightsResponse] = await Promise.all([
        apiFetch('/api/dashboard/summary'),
        apiFetch('/api/feedback/insights')
      ]);
      setSummary(summaryResponse);
      setInsights(insightsResponse);
    } catch (err) {
      setError('Failed to load dashboard metrics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'interview':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'rejected':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'submitted':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'reviewed':
        return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
      default:
        return 'bg-slate-900 border border-slate-800 text-slate-405';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-955 text-slate-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Extract metrics safely
  const submittedCount = summary?.applicationsBreakdown?.submitted || 0;
  const interviewCount = summary?.applicationsBreakdown?.interview || 0;
  const rejectedCount = summary?.applicationsBreakdown?.rejected || 0;
  const totalJobs = summary?.totalJobsDiscovered || 0;
  const targetCount = summary?.targetCompaniesCount || 0;

  const eligibleCount = summary?.eligibilityBreakdown?.eligible || 0;
  const stretchCount = summary?.eligibilityBreakdown?.stretch || 0;
  const notEligibleCount = summary?.eligibilityBreakdown?.not_eligible || 0;
  const unscoredCount = summary?.eligibilityBreakdown?.unscored || 0;

  // Simple progress bar calculations
  const totalScored = eligibleCount + stretchCount + notEligibleCount;
  const eligiblePct = totalScored > 0 ? (eligibleCount / totalScored) * 100 : 0;
  const stretchPct = totalScored > 0 ? (stretchCount / totalScored) * 100 : 0;
  const notEligiblePct = totalScored > 0 ? (notEligibleCount / totalScored) * 100 : 0;

  // Framer Motion Animation Constants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 120 } }
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-slate-955 text-slate-100 overflow-y-auto pb-12">
      {/* Background Glow Blobs */}
      <div className="glow-blob w-[600px] h-[600px] bg-indigo-900/20 top-[-20%] left-[-10%] animate-pulse-slow"></div>
      <div className="glow-blob w-[500px] h-[500px] bg-brand-900/15 bottom-[-10%] right-[-10%] animate-pulse-slow" style={{ animationDelay: '-4s' }}></div>

      <Header />

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-start p-6 z-10 w-full mt-4">
        <div className="w-full max-w-4xl space-y-8">
          
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                Welcome back, {user?.name || 'Candidate'}!
              </h1>
              <p className="text-slate-400 text-sm mt-1 font-medium">
                Here is an overview of your job matching funnel and application progress tracking.
              </p>
            </div>

            {/* Quick Actions Panel */}
            <div className="flex flex-wrap items-center gap-2.5">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/jobs')}
                className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-brand-500/30 text-slate-205 hover:text-brand-400 text-xs font-bold rounded-xl transition-all duration-200 flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <span>Job Matches</span>
                <ChevronRight className="w-3.5 h-3.5 text-brand-400" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/review')}
                className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-brand-500/30 text-slate-205 hover:text-brand-400 text-xs font-bold rounded-xl transition-all duration-200 flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <span>Review Gate</span>
                <ChevronRight className="w-3.5 h-3.5 text-brand-400" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/settings')}
                className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-brand-500/30 text-slate-205 hover:text-brand-400 text-xs font-bold rounded-xl transition-all duration-200 flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <span>Settings</span>
                <ChevronRight className="w-3.5 h-3.5 text-brand-400" />
              </motion.button>
            </div>
          </div>

          {/* Stats Row */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-5 gap-4"
          >
            {/* Submitted */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02, borderColor: "rgba(59, 130, 246, 0.4)", boxShadow: "0 10px 20px -10px rgba(59, 130, 246, 0.15)" }}
              className="bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border border-slate-900 shadow-md relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500/40"></div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submitted</span>
                <Send className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span className="text-3xl font-extrabold text-slate-100 mt-3 block">{submittedCount}</span>
            </motion.div>

            {/* Interviews */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02, borderColor: "rgba(16, 185, 129, 0.4)", boxShadow: "0 10px 20px -10px rgba(16, 185, 129, 0.15)" }}
              className="bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border border-slate-900 shadow-md relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500/40"></div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Interviews</span>
                <Video className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="text-3xl font-extrabold text-emerald-400 mt-3 block">{interviewCount}</span>
            </motion.div>

            {/* Rejections */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02, borderColor: "rgba(239, 68, 68, 0.4)", boxShadow: "0 10px 20px -10px rgba(239, 68, 68, 0.15)" }}
              className="bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border border-slate-900 shadow-md relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-rose-500/40"></div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rejections</span>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <span className="text-3xl font-extrabold text-rose-405 mt-3 block">{rejectedCount}</span>
            </motion.div>

            {/* Jobs Discovered */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02, borderColor: "rgba(99, 102, 241, 0.4)", boxShadow: "0 10px 20px -10px rgba(99, 102, 241, 0.15)" }}
              className="bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border border-slate-900 shadow-md relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-500/40"></div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Discovered</span>
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              </div>
              <span className="text-3xl font-extrabold text-slate-100 mt-3 block">{totalJobs}</span>
            </motion.div>

            {/* Target Companies */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02, borderColor: "rgba(139, 92, 246, 0.4)", boxShadow: "0 10px 20px -10px rgba(139, 92, 246, 0.15)" }}
              className="bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl border border-slate-900 shadow-md relative overflow-hidden flex flex-col justify-between col-span-2 md:col-span-1"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500/40"></div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Targets</span>
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <span className="text-3xl font-extrabold text-slate-100 mt-3 block">{targetCount}</span>
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left/Middle: Recent Activity Feed */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-955/65 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-900 relative overflow-hidden min-h-[360px]"
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-500 to-indigo-500"></div>

                <h2 className="text-lg font-bold text-slate-100 flex items-center mb-4">
                  <Activity className="w-5 h-5 text-brand-400 mr-2 animate-pulse" /> Recent Application Activity
                </h2>

                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-3.5"
                >
                  {summary?.recentActivity?.map((activity, idx) => (
                    <motion.div 
                      key={idx}
                      variants={itemVariants}
                      whileHover={{ scale: 1.01, backgroundColor: "rgba(30, 41, 59, 0.35)", borderColor: "rgba(99, 102, 241, 0.25)" }}
                      className="p-3 bg-slate-900/35 border border-slate-900/60 rounded-xl flex items-center justify-between transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="w-8.5 h-8.5 bg-slate-950 border border-slate-900 rounded-lg flex items-center justify-center text-slate-400">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200 leading-snug">{activity.company}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{activity.roleTitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${getStatusBadgeStyle(activity.status)}`}>
                          {activity.status}
                        </span>
                        <span className="text-[10px] text-slate-505 font-mono flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-600" />
                          <span>{activity.date}</span>
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  {(!summary?.recentActivity || summary.recentActivity.length === 0) && (
                    <div className="py-20 text-center text-slate-505 italic text-xs space-y-1">
                      <p>No recent activity detected.</p>
                      <p className="text-[10px] text-slate-600">Start by reviewing and submitting cover letters under the gate dashboard.</p>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            </div>

            {/* Right: Funnel & Score Breakdown & Insights */}
            <div className="space-y-6">
              
              {/* Funnel */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-slate-955/65 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-900 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 to-indigo-500"></div>

                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center mb-4">
                    <Layers className="w-5 h-5 text-emerald-400 mr-2" /> Match Eligibility Funnel
                  </h2>

                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                    Visualizes how job postings score against your parsed profile criteria. 
                  </p>

                  <div className="space-y-5">
                    {/* Funnel horizontal bars */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-350">Eligible</span>
                        <span className="text-emerald-400 font-bold">{eligibleCount} ({eligiblePct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-900/60 rounded-full h-2 overflow-hidden border border-slate-900">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${eligiblePct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="bg-emerald-500 h-full rounded-full"
                        ></motion.div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-350">Stretch Matches</span>
                        <span className="text-amber-400 font-bold">{stretchCount} ({stretchPct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-900/60 rounded-full h-2 overflow-hidden border border-slate-900">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${stretchPct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="bg-amber-500 h-full rounded-full"
                        ></motion.div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-350">Not Eligible</span>
                        <span className="text-slate-500 font-bold">{notEligibleCount} ({notEligiblePct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-900/60 rounded-full h-2 overflow-hidden border border-slate-900">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${notEligiblePct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="bg-slate-700 h-full rounded-full"
                        ></motion.div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-350">Unscored Ingests</span>
                        <span className="text-slate-400 font-bold">{unscoredCount}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 italic font-medium leading-normal">
                        Scoring eligibility consumes Gemini token limits. Click score buttons on matches.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtext info */}
                <div className="mt-6 pt-4 border-t border-slate-900 text-[10px] text-slate-505 flex items-center space-x-1.5 leading-relaxed">
                  <span>Audited target matches total: {totalJobs}</span>
                </div>
              </motion.div>

              {/* Historical Feedback Loop Insights */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.015, borderColor: "rgba(139, 92, 246, 0.3)" }}
                className="bg-slate-955/65 backdrop-blur-md rounded-2xl p-5 border border-slate-900 shadow-md relative overflow-hidden transition-all duration-200"
              >
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500 to-indigo-500"></div>
                
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center mb-3">
                    <Activity className="w-4 h-4 text-violet-400 mr-1.5" /> Historical Insights
                  </h3>
                  
                  {insights && !insights.hasEnoughData && (
                    <p className="text-xs text-slate-405 italic leading-relaxed font-medium">
                      {insights.message}
                    </p>
                  )}

                  {insights && insights.hasEnoughData && (
                    <div className="space-y-2.5">
                      <p className="text-xs text-slate-350 leading-relaxed font-semibold">
                        {insights.message}
                      </p>
                      <ul className="space-y-2">
                        {insights.insightsList?.map((insight, idx) => (
                          <li key={idx} className="text-[11px] text-slate-400 pl-3 border-l-2 border-brand-500/60 leading-relaxed">
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>

            </div>

          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
