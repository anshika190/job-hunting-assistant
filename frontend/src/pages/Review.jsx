import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';
import { 
  Building2, 
  Briefcase, 
  LogOut, 
  Upload, 
  Compass,
  ArrowRight,
  ExternalLink,
  MapPin,
  Award,
  AlertCircle,
  CheckCircle2,
  ThumbsUp,
  XCircle,
  Edit2,
  Copy,
  Clock,
  Settings,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Header from '../components/Header';

export default function Review() {
  const { user, logout } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Track which links have been clicked
  const [clickedLinks, setClickedLinks] = useState({});
  const [activeTab, setActiveTab] = useState('pending'); // pending, ready, submitted

  // Check updates tracking states
  const [loadingChecks, setLoadingChecks] = useState({});
  const [checkResults, setCheckResults] = useState({});
  const [checkErrors, setCheckErrors] = useState({});

  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/applications');
      setApplications(response);
    } catch (err) {
      setError('Failed to fetch applications: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (jobMatchId, company) => {
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch(`/api/applications/${jobMatchId}/approve`, {
        method: 'PUT'
      });
      // Update local state in-place
      setApplications(prev => prev.map(app => app.jobMatchId === jobMatchId ? response : app));
      setSuccess(`Approved application for "${company}" - ready to submit.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(`Failed to approve: ${err.message}`);
    }
  };

  const handleSkip = async (jobMatchId, company) => {
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/api/applications/${jobMatchId}`, {
        method: 'DELETE'
      });
      setApplications(prev => prev.filter(app => app.jobMatchId !== jobMatchId));
      setSuccess(`Skipped cover letter for "${company}".`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(`Failed to skip: ${err.message}`);
    }
  };

  const handleMarkSubmitted = async (jobMatchId, company) => {
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch(`/api/applications/${jobMatchId}/mark-submitted`, {
        method: 'PUT'
      });
      setApplications(prev => prev.map(app => app.jobMatchId === jobMatchId ? response : app));
      setSuccess(`Application for "${company}" marked as submitted!`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(`Failed to submit: ${err.message}`);
    }
  };

  const handleCheckStatus = async (jobMatchId, company) => {
    setLoadingChecks(prev => ({ ...prev, [jobMatchId]: true }));
    setCheckErrors(prev => ({ ...prev, [jobMatchId]: '' }));
    setCheckResults(prev => ({ ...prev, [jobMatchId]: null }));
    try {
      const response = await apiFetch(`/api/applications/${jobMatchId}/check-status`, {
        method: 'POST'
      });
      
      if (response.updated) {
        // Update the application object in local state
        setApplications(prev => prev.map(app => app.jobMatchId === jobMatchId ? response.application : app));
        
        // Show success alert
        setSuccess(`Status update detected for "${company}": ${response.classification.toUpperCase()}!`);
        setTimeout(() => setSuccess(''), 5000);
        
        setCheckResults(prev => ({
          ...prev,
          [jobMatchId]: {
            updated: true,
            message: `Status updated to ${response.newStatus}!`,
            reasoning: response.reasoning
          }
        }));
      } else {
        // No updates found
        setCheckResults(prev => ({
          ...prev,
          [jobMatchId]: {
            updated: false,
            message: response.message || 'No new updates found.',
            reasoning: response.reasoning
          }
        }));
      }
    } catch (err) {
      let errMsg = 'Failed to check updates.';
      if (err.status === 401 || err.message.includes('401') || err.message.includes('reconnection') || err.message.includes('Gmail reconnection')) {
        errMsg = 'Gmail reconnection needed';
      } else if (err.status === 429 || err.message.includes('429')) {
        errMsg = 'Gemini rate limit reached, try again later';
      } else {
        errMsg = err.message || 'Error occurred.';
      }
      setCheckErrors(prev => ({ ...prev, [jobMatchId]: errMsg }));
    } finally {
      setLoadingChecks(prev => ({ ...prev, [jobMatchId]: false }));
    }
  };

  const handleCopyCoverLetter = (text) => {
    if (text) {
      navigator.clipboard.writeText(text);
      setSuccess('Cover letter copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  const handleOpenLink = (jobMatchId, url) => {
    setClickedLinks(prev => ({ ...prev, [jobMatchId]: true }));
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getEligibilityBadgeStyle = (eligibility) => {
    switch (eligibility?.toLowerCase()) {
      case 'eligible':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'stretch':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20 border-dashed';
    }
  };

  // Lists split reactively by status
  const drafts = applications.filter(app => app.status === 'draft');
  const reviewed = applications.filter(app => app.status === 'reviewed');
  const submitted = applications.filter(app => app.status === 'submitted' || app.status === 'interview' || app.status === 'rejected');

  return (
    <div className="min-h-screen relative flex flex-col bg-slate-955 text-slate-100 overflow-y-auto pb-12">
      {/* Background Glow Blobs */}
      <div className="glow-blob w-[600px] h-[600px] bg-indigo-900/20 top-[-20%] left-[-10%] animate-pulse-slow"></div>
      <div className="glow-blob w-[500px] h-[500px] bg-brand-900/15 bottom-[-10%] right-[-10%] animate-pulse-slow" style={{ animationDelay: '-4s' }}></div>

      <Header />

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-start p-6 z-10 w-full mt-4">
        <div className="w-full max-w-4xl space-y-8">
          
          {/* Header Title */}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Application Gate
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Approve cover letters, open official company listings to submit, and track application states.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap border-b border-slate-900 gap-1 select-none">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all duration-200 flex items-center space-x-2 cursor-pointer
                ${activeTab === 'pending'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
                }
              `}
            >
              <span>Pending Review</span>
              <span className="text-xs bg-slate-900 border border-slate-800 text-slate-350 px-2 py-0.5 rounded-full">
                {drafts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ready')}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all duration-200 flex items-center space-x-2 cursor-pointer
                ${activeTab === 'ready'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
                }
              `}
            >
              <span>Ready to Submit</span>
              <span className="text-xs bg-slate-900 border border-slate-800 text-slate-350 px-2 py-0.5 rounded-full">
                {reviewed.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('submitted')}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all duration-200 flex items-center space-x-2 cursor-pointer
                ${activeTab === 'submitted'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
                }
              `}
            >
              <span>Submitted</span>
              <span className="text-xs bg-slate-900 border border-slate-800 text-slate-350 px-2 py-0.5 rounded-full">
                {submitted.length}
              </span>
            </button>
          </div>

          {/* Toast Messages */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start space-x-3 animate-fadeIn">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start space-x-3 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Tab Views */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Tab 1: PENDING DRAFTS */}
              {activeTab === 'pending' && (
                <div className="space-y-6">
                  {drafts.map((d) => (
                    <div 
                      key={d.id}
                      className="glass-panel rounded-2xl p-6 border border-slate-900 shadow-xl relative overflow-hidden flex flex-col md:flex-row gap-6 animate-fadeIn"
                    >
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-500 to-indigo-500"></div>

                      {/* Left side */}
                      <div className="md:w-1/3 space-y-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{d.company}</span>
                          </div>
                          <h3 className="font-extrabold text-slate-150 text-lg leading-snug">
                            {d.roleTitle}
                          </h3>
                          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{d.location}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${getEligibilityBadgeStyle(d.eligibility)}`}>
                              {d.eligibility}
                            </span>
                            <a 
                              href={d.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-slate-505 hover:text-brand-400 transition-colors flex items-center space-x-1 font-semibold"
                            >
                              <span>Original Post</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>

                          {d.reasoning && (
                            <p className="text-xs text-slate-400 italic bg-slate-900/30 p-3 rounded-xl border border-slate-900/80 leading-relaxed">
                              <strong>AI reasoning:</strong> {d.reasoning}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex-1 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-900 pt-6 md:pt-0 md:pl-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cover Letter Draft</span>
                            <button
                              onClick={() => navigate('/jobs')}
                              className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors flex items-center space-x-1 font-semibold cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit Cover Letter</span>
                            </button>
                          </div>
                          
                          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 max-h-[220px] overflow-y-auto pr-1">
                            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans select-text">
                              {d.coverLetterText}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-900/60 flex-shrink-0">
                          <button
                            onClick={() => handleSkip(d.jobMatchId, d.company)}
                            className="px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-rose-500/10 hover:border-rose-500/20 text-slate-300 hover:text-rose-400 text-xs font-bold rounded-xl transition-all duration-200 flex items-center space-x-1.5 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Skip Application</span>
                          </button>

                          <button
                            onClick={() => handleApprove(d.jobMatchId, d.company)}
                            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold rounded-xl text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-1.5 cursor-pointer"
                          >
                            <ThumbsUp className="w-4 h-4 text-emerald-205" />
                            <span>Approve Draft</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {drafts.length === 0 && (
                    <div className="py-20 text-center glass-panel rounded-2xl p-8 border border-slate-900 flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-900/60 flex items-center justify-center text-slate-500">
                        <ThumbsUp className="w-6 h-6" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-sm font-semibold text-slate-300">No applications pending review</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Generate cover letters from your compatible job matches first.
                        </p>
                        <button
                          onClick={() => navigate('/jobs')}
                          className="mt-4 px-4 py-2 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 text-brand-300 font-semibold text-xs rounded-lg transition-all duration-200 inline-flex items-center space-x-1"
                        >
                          <span>Go to Job Matches</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: READY TO SUBMIT */}
              {activeTab === 'ready' && (
                <div className="space-y-6">
                  {reviewed.map((r) => (
                    <div 
                      key={r.id}
                      className="glass-panel rounded-2xl p-6 border border-slate-900 shadow-xl relative overflow-hidden flex flex-col md:flex-row gap-6 animate-fadeIn"
                    >
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500"></div>

                      {/* Left side */}
                      <div className="md:w-1/3 space-y-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{r.company}</span>
                          </div>
                          <h3 className="font-extrabold text-slate-150 text-lg leading-snug">
                            {r.roleTitle}
                          </h3>
                          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{r.location}</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-900 space-y-2 text-xs text-slate-400 leading-relaxed">
                          <p className="font-bold text-slate-350">Guided Manual Submission:</p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Copy the generated cover letter.</li>
                            <li>Click "Open Application Page" below.</li>
                            <li>Paste the letter into the form on their site.</li>
                            <li>Mark as submitted here to update status.</li>
                          </ol>
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex-1 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-900 pt-6 md:pt-0 md:pl-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final Approved Cover Letter</span>
                            <button
                              onClick={() => handleCopyCoverLetter(r.coverLetterText)}
                              className="text-[10px] bg-slate-900 hover:bg-slate-805 text-brand-400 px-3 py-1.5 border border-slate-805 rounded-lg flex items-center space-x-1 font-semibold cursor-pointer transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy Cover Letter</span>
                            </button>
                          </div>
                          
                          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 max-h-[180px] overflow-y-auto pr-1">
                            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans select-text">
                              {r.coverLetterText}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-900/60 flex-shrink-0">
                          {/* Open link button */}
                          <button
                            onClick={() => handleOpenLink(r.jobMatchId, r.sourceUrl)}
                            className="w-full sm:w-auto px-4 py-2 border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/10 text-brand-300 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>Open Application Page</span>
                          </button>

                          {/* Submit button */}
                          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                            {!clickedLinks[r.jobMatchId] && (
                              <span className="text-[10px] text-slate-500 italic">Open page first</span>
                            )}
                            <button
                              onClick={() => handleMarkSubmitted(r.jobMatchId, r.company)}
                              disabled={!clickedLinks[r.jobMatchId]}
                              className={`w-full sm:w-auto px-5 py-2 text-xs font-bold rounded-xl text-white shadow-md transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer
                                ${clickedLinks[r.jobMatchId]
                                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                                  : 'bg-slate-900 border border-slate-855 text-slate-505 opacity-40 cursor-not-allowed'
                                }
                              `}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Mark as Submitted</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {reviewed.length === 0 && (
                    <div className="py-20 text-center glass-panel rounded-2xl p-8 border border-slate-900 flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-900/60 flex items-center justify-center text-slate-500">
                        <ThumbsUp className="w-6 h-6" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-sm font-semibold text-slate-300">No applications ready to submit</p>
                        <p className="text-xs text-slate-450 mt-1">
                          Approve drafts in the "Pending Review" tab to prepare them for submission.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: SUBMITTED */}
              {activeTab === 'submitted' && (
                <div className="space-y-4 animate-fadeIn">
                  {submitted.map((s) => (
                    <div 
                      key={s.id}
                      className={`glass-panel rounded-xl p-5 border shadow-md relative overflow-hidden transition-all duration-200 group flex flex-col justify-between
                        ${s.status === 'interview' 
                          ? 'border-emerald-500/30' 
                          : s.status === 'rejected' 
                          ? 'border-rose-500/20' 
                          : 'border-slate-900'
                        }
                      `}
                    >
                      <div className={`absolute top-0 left-0 w-[3px] h-full 
                        ${s.status === 'interview' 
                          ? 'bg-emerald-500' 
                          : s.status === 'rejected' 
                          ? 'bg-rose-500' 
                          : 'bg-emerald-600/40'
                        }
                      `}></div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border
                            ${s.status === 'interview' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : s.status === 'rejected' 
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                            }
                          `}>
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.company}</span>
                            </div>
                            <h3 className="font-bold text-slate-200 text-base leading-tight mt-0.5">
                              {s.roleTitle}
                            </h3>
                            <div className="flex items-center space-x-1.5 text-xs text-slate-450 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              <span>{s.location}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-1">
                          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border
                            ${s.status === 'interview' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : s.status === 'rejected' 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                              : 'bg-slate-900/60 text-slate-400 border-slate-800'
                            }
                          `}>
                            {s.status}
                          </span>
                          {s.submittedAt && (
                            <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{new Date(s.submittedAt).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status updates results / reasoning / errors */}
                      {s.status === 'submitted' && (
                        <div className="mt-4 pt-4 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
                          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-650" />
                            <span>Awaiting response tracking...</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                            {checkErrors[s.jobMatchId] && (
                              <div className="text-[10px] text-rose-455 font-medium animate-fadeIn">
                                {checkErrors[s.jobMatchId].includes('reconnection') ? (
                                  <span>
                                    Gmail link broken. <a href="/settings" className="underline hover:text-brand-300">Reconnect Settings</a>
                                  </span>
                                ) : (
                                  <span>{checkErrors[s.jobMatchId]}</span>
                                )}
                              </div>
                            )}

                            {checkResults[s.jobMatchId] && !checkResults[s.jobMatchId].updated && (
                              <span className="text-[10px] text-slate-500 italic animate-fadeIn">
                                {checkResults[s.jobMatchId].message}
                              </span>
                            )}

                            <button
                              onClick={() => handleCheckStatus(s.jobMatchId, s.company)}
                              disabled={loadingChecks[s.jobMatchId]}
                              className="w-full sm:w-auto px-4 py-1.5 bg-slate-900 hover:bg-slate-805 text-brand-400 border border-slate-800 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {loadingChecks[s.jobMatchId] ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-400" />
                                  <span>Checking...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 text-brand-400" />
                                  <span>Check for Updates</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Display Reasoning for parsed responses */}
                      {checkResults[s.jobMatchId]?.reasoning && (
                        <div className="mt-4 p-3 bg-slate-950/40 border border-slate-900/60 rounded-lg text-xs text-slate-400 leading-relaxed animate-fadeIn">
                          <strong>Update classification details:</strong> {checkResults[s.jobMatchId].reasoning}
                        </div>
                      )}
                    </div>
                  ))}

                  {submitted.length === 0 && (
                    <div className="py-20 text-center glass-panel rounded-2xl p-8 border border-slate-900 flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-900/60 flex items-center justify-center text-slate-500">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-sm font-semibold text-slate-300">No submitted applications yet</p>
                        <p className="text-xs text-slate-450 mt-1">
                          After completing submissions, mark them to catalog and track your progress.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}
