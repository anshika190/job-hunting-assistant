import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';
import { 
  Building2, 
  Search, 
  Briefcase, 
  LogOut, 
  Upload, 
  Compass,
  ArrowRight,
  ExternalLink,
  MapPin,
  RefreshCw,
  Award,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ThumbsUp,
  Settings,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Header from '../components/Header';

export default function JobMatches() {
  const { user, logout } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [sortByEligibility, setSortByEligibility] = useState(true); // default to true
  const [filterType, setFilterType] = useState('all'); // all, eligible, stretch
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Scoring card states
  const [loadingCards, setLoadingCards] = useState({});
  const [cardErrors, setCardErrors] = useState({});

  // Cover letter card states
  const [loadingLetters, setLoadingLetters] = useState({});
  const [expandedLetters, setExpandedLetters] = useState({});
  const [isEditing, setIsEditing] = useState({});
  const [editingLetters, setEditingLetters] = useState({});
  const [letterErrors, setLetterErrors] = useState({});

  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    fetchJobs();
  }, [sortByEligibility]);

  const fetchJobs = async () => {
    setLoading(true);
    setError('');
    try {
      const url = sortByEligibility ? '/api/job-matches?sort=eligibility' : '/api/job-matches';
      const [jobsResponse, appsResponse] = await Promise.all([
        apiFetch(url),
        apiFetch('/api/applications')
      ]);
      setJobs(jobsResponse);
      
      // Convert apps array to map: jobMatchId -> App details
      const appsMap = {};
      appsResponse.forEach(app => {
        appsMap[app.jobMatchId] = app;
      });
      setApplications(appsMap);
    } catch (err) {
      setError('Failed to fetch job matches: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch('/api/job-discovery/run', {
        method: 'POST'
      });
      const count = response.discoveredCount;
      if (count > 0) {
        setSuccess(`Discovery complete! Found and imported ${count} new jobs.`);
      } else {
        setSuccess('Discovery complete! No new unique jobs found.');
      }
      await fetchJobs();
    } catch (err) {
      setError('Discovery failed: ' + err.message);
    } finally {
      setDiscovering(false);
    }
  };

  const handleScoreEligibilityBatch = async () => {
    setScoring(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch('/api/job-matches/score', {
        method: 'POST'
      });
      const count = response.scoredCount;
      const remaining = response.remainingCount || 0;
      
      await fetchJobs();

      if (count > 0) {
        setSuccess(`Successfully evaluated ${count} jobs. ${remaining} jobs remain unscored.`);
      } else {
        setError(`Scored 0 jobs. Gemini rate limit or daily quota exceeded. Please try again in a few minutes (${remaining} remaining).`);
      }
    } catch (err) {
      setError('Scoring failed: ' + err.message);
    } finally {
      setScoring(false);
    }
  };

  const handleScoreSingleJob = async (jobId) => {
    setLoadingCards(prev => ({ ...prev, [jobId]: true }));
    setCardErrors(prev => ({ ...prev, [jobId]: '' }));
    try {
      const response = await apiFetch(`/api/job-matches/${jobId}/score`, {
        method: 'POST'
      });
      // Replace the job match object in-place in our state array
      setJobs(prev => prev.map(job => job.id === jobId ? response : job));
    } catch (err) {
      let errMsg = 'Failed to score.';
      if (err.status === 429 || err.message.includes('429') || err.message.includes('Rate limit') || err.message.includes('TOO_MANY_REQUESTS')) {
        errMsg = 'Rate limit reached, try again later.';
      } else {
        errMsg = err.message || 'Error occurred.';
      }
      setCardErrors(prev => ({ ...prev, [jobId]: errMsg }));
    } finally {
      setLoadingCards(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const handleGenerateCoverLetter = async (jobId) => {
    setLoadingLetters(prev => ({ ...prev, [jobId]: true }));
    setLetterErrors(prev => ({ ...prev, [jobId]: '' }));
    try {
      const response = await apiFetch(`/api/job-matches/${jobId}/cover-letter`, {
        method: 'POST'
      });
      setApplications(prev => ({ ...prev, [jobId]: response }));
      setExpandedLetters(prev => ({ ...prev, [jobId]: true }));
    } catch (err) {
      let errMsg = 'Failed to generate cover letter.';
      if (err.status === 429 || err.message.includes('429') || err.message.includes('Rate limit')) {
        errMsg = 'Gemini rate limit reached, please try again later.';
      } else {
        errMsg = err.message || 'Error occurred.';
      }
      setLetterErrors(prev => ({ ...prev, [jobId]: errMsg }));
    } finally {
      setLoadingLetters(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const handleEditCoverLetterStart = (jobId) => {
    setEditingLetters(prev => ({ ...prev, [jobId]: applications[jobId]?.coverLetterText || '' }));
    setIsEditing(prev => ({ ...prev, [jobId]: true }));
  };

  const handleSaveCoverLetter = async (jobId) => {
    setLetterErrors(prev => ({ ...prev, [jobId]: '' }));
    try {
      const response = await apiFetch(`/api/applications/${jobId}`, {
        method: 'PUT',
        body: { coverLetterText: editingLetters[jobId] }
      });
      setApplications(prev => ({ ...prev, [jobId]: response }));
      setIsEditing(prev => ({ ...prev, [jobId]: false }));
    } catch (err) {
      setLetterErrors(prev => ({ ...prev, [jobId]: 'Failed to save changes: ' + err.message }));
    }
  };

  const handleCopyCoverLetter = (jobId) => {
    const text = applications[jobId]?.coverLetterText;
    if (text) {
      navigator.clipboard.writeText(text);
      setSuccess('Cover letter copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  // Count unscored jobs
  const unscoredCount = jobs.filter(j => !j.eligibility).length;

  // Filter jobs based on search term AND eligibility filters
  const filteredJobs = jobs.filter(j => {
    // 1. Text search filter
    const matchesSearch = 
      j.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.roleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // 2. Eligibility filter
    if (filterType === 'eligible') {
      return j.eligibility === 'eligible';
    }
    if (filterType === 'stretch') {
      return j.eligibility === 'stretch';
    }
    
    return true; // 'all'
  });

  const getEligibilityBadgeStyle = (eligibility) => {
    switch (eligibility?.toLowerCase()) {
      case 'eligible':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'stretch':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'not_eligible':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20 border-dashed';
    }
  };

  const getEligibilityLabel = (eligibility) => {
    switch (eligibility?.toLowerCase()) {
      case 'eligible': return 'Eligible';
      case 'stretch': return 'Stretch';
      case 'not_eligible': return 'Not Eligible';
      default: return 'Unscored';
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-slate-950 text-slate-100 overflow-y-auto pb-12">
      {/* Background Glow Blobs */}
      <div className="glow-blob w-[600px] h-[600px] bg-indigo-900/20 top-[-20%] left-[-10%] animate-pulse-slow"></div>
      <div className="glow-blob w-[500px] h-[500px] bg-brand-900/15 bottom-[-10%] right-[-10%] animate-pulse-slow" style={{ animationDelay: '-4s' }}></div>

      <Header />

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-start p-6 z-10 w-full mt-4">
        <div className="w-full max-w-4xl space-y-8">
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                Discovered Positions
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Polled job listings evaluated and ranked dynamically by LLM compatibility filters.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Score First 5 Jobs Batch Button */}
              {unscoredCount > 0 && (
                <button
                  onClick={handleScoreEligibilityBatch}
                  disabled={scoring || discovering}
                  className={`px-5 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:from-slate-850 disabled:to-slate-850 disabled:opacity-60 text-sm font-semibold rounded-xl text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer
                    ${scoring ? 'cursor-not-allowed' : ''}
                  `}
                >
                  <Sparkles className={`w-4 h-4 text-brand-300 ${scoring ? 'animate-spin' : ''}`} />
                  <span>{scoring ? 'Scoring first 5...' : 'Score First 5 Jobs'}</span>
                </button>
              )}

              {/* Discover Jobs Button */}
              <button
                onClick={handleDiscover}
                disabled={discovering || scoring}
                className={`px-5 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-60 text-sm font-semibold rounded-xl text-slate-200 hover:text-white transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer
                  ${discovering ? 'cursor-not-allowed' : ''}
                `}
              >
                <RefreshCw className={`w-4 h-4 text-slate-400 ${discovering ? 'animate-spin' : ''}`} />
                <span>{discovering ? 'Polling APIs...' : 'Discover Jobs'}</span>
              </button>
            </div>
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

          {/* Search bar and Filters */}
          <div className="glass-panel rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-500 to-violet-500"></div>
            
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search jobs by company, role, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200"
              />
            </div>

            {/* Filter and Sorting Options */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
              
              {/* Filter Dropdown */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Filter:</span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs py-1.5 px-3 focus:outline-none focus:border-brand-500 text-slate-300"
                >
                  <option value="all">All Jobs</option>
                  <option value="eligible">Eligible Only</option>
                  <option value="stretch">Stretch Only</option>
                </select>
              </div>

              {/* Sort Checkbox */}
              <label className="flex items-center space-x-2 cursor-pointer bg-slate-900/40 border border-slate-855 px-3 py-1.5 rounded-lg select-none text-xs text-slate-300 hover:border-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={sortByEligibility}
                  onChange={(e) => setSortByEligibility(e.target.checked)}
                  className="rounded border-slate-805 bg-slate-950 text-brand-500 focus:ring-brand-500"
                />
                <span>Sort by Eligibility</span>
              </label>

              <div className="text-[10px] text-slate-500 font-medium">
                {filteredJobs.length} matches
              </div>
            </div>
          </div>

          {/* Jobs Grid */}
          {loading && jobs.length === 0 ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
              {filteredJobs.map((j) => (
                <div 
                  key={j.id} 
                  className="glass-panel rounded-xl p-5 border border-slate-900 shadow-md relative overflow-hidden group hover:border-slate-800 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{j.company}</span>
                        </div>
                        <h3 className="font-bold text-slate-200 group-hover:text-brand-400 transition-colors text-base">
                          {j.roleTitle}
                        </h3>
                        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{j.location}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-1">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">
                          Tier 1 API
                        </span>
                        
                        {/* Eligibility Badge */}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${getEligibilityBadgeStyle(j.eligibility)}`}>
                          {getEligibilityLabel(j.eligibility)}
                        </span>
                      </div>
                    </div>

                    {/* AI Reasoning Text */}
                    {j.eligibility && j.reasoning && (
                      <p className="text-xs text-slate-400 mt-4 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                        <span className="text-indigo-400 font-medium">Evaluation:</span> {j.reasoning}
                      </p>
                    )}

                    {/* Unscored Job / Card Actions */}
                    {!j.eligibility && (
                      <div className="mt-4 pt-4 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-slate-500 flex items-center space-x-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Unscored Match</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                          {cardErrors[j.id] && (
                            <span className="text-[10px] text-rose-400 font-medium animate-fadeIn">
                              {cardErrors[j.id]}
                            </span>
                          )}
                          
                          <button
                            onClick={() => handleScoreSingleJob(j.id)}
                            disabled={loadingCards[j.id] || discovering || scoring}
                            className="w-full sm:w-auto px-4 py-1.5 bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/20 text-brand-300 font-semibold text-xs rounded-lg transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {loadingCards[j.id] ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin text-brand-400" />
                                <span>Scoring...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-brand-400" />
                                <span>Score Fit</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Cover Letter Section for Eligible/Stretch */}
                    {(j.eligibility === 'eligible' || j.eligibility === 'stretch') && (
                      <div className="mt-4 pt-4 border-t border-slate-900/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 flex items-center space-x-1.5">
                            <Briefcase className="w-3.5 h-3.5" />
                            <span>Application Prep</span>
                          </span>
                          
                          {applications[j.id] ? (
                            <button
                              onClick={() => setExpandedLetters(prev => ({ ...prev, [j.id]: !prev[j.id] }))}
                              className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors flex items-center space-x-1 cursor-pointer"
                            >
                              <span>{expandedLetters[j.id] ? 'Hide Cover Letter' : 'View Cover Letter'}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedLetters[j.id] ? 'rotate-180' : ''}`} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGenerateCoverLetter(j.id)}
                              disabled={loadingLetters[j.id] || discovering || scoring}
                              className="px-3 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-bold rounded-lg text-white transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer"
                            >
                              {loadingLetters[j.id] ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Generating...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 text-brand-300" />
                                  <span>Generate Cover Letter</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Inline Letter Error */}
                        {letterErrors[j.id] && (
                          <p className="text-[10px] text-rose-400 font-medium animate-fadeIn">{letterErrors[j.id]}</p>
                        )}

                        {/* Expandable Cover Letter Area */}
                        {expandedLetters[j.id] && applications[j.id] && (
                          <div className="mt-3 p-4 rounded-xl bg-slate-955/60 border border-slate-900 space-y-4 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tailored Cover Letter</span>
                              
                              <div className="flex items-center space-x-2">
                                {isEditing[j.id] ? (
                                  <>
                                    <button
                                      onClick={() => handleSaveCoverLetter(j.id)}
                                      className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded cursor-pointer transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setIsEditing(prev => ({ ...prev, [j.id]: false }))}
                                      className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 px-2.5 py-1 rounded cursor-pointer transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleEditCoverLetterStart(j.id)}
                                      className="text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded cursor-pointer transition-colors"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleCopyCoverLetter(j.id)}
                                      className="text-[10px] font-bold bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/20 text-brand-300 px-2.5 py-1 rounded cursor-pointer transition-colors"
                                    >
                                      Copy
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {isEditing[j.id] ? (
                              <textarea
                                value={editingLetters[j.id] || ''}
                                onChange={(e) => setEditingLetters(prev => ({ ...prev, [j.id]: e.target.value }))}
                                rows={8}
                                className="w-full text-xs bg-slate-900 border border-slate-850 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-brand-500 font-sans leading-relaxed"
                              />
                            ) : (
                              <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans select-text">
                                {applications[j.id].coverLetterText}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-900/80 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                    <span className="text-[10px] text-slate-500">
                      Discovered {new Date(j.discoveredAt).toLocaleDateString()}
                    </span>
                    <a
                      href={j.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors flex items-center space-x-1"
                    >
                      <span>Apply Post</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}

              {filteredJobs.length === 0 && (
                <div className="col-span-2 py-20 text-center glass-panel rounded-2xl p-8 border border-slate-900 flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-900/60 flex items-center justify-center text-slate-500">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div className="max-w-xs">
                    <p className="text-sm font-semibold text-slate-300">No jobs match your filter</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {jobs.length === 0 
                        ? 'Trigger discovery by clicking the "Discover Jobs" button above.' 
                        : 'Adjust your search queries or change your eligibility filter drop-downs.'
                      }
                    </p>
                  </div>
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
