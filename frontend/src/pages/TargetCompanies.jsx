import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';
import { 
  Building2, 
  Search, 
  Plus, 
  Trash2, 
  Briefcase, 
  LogOut, 
  Upload, 
  Compass,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Award,
  ThumbsUp,
  Settings,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Header from '../components/Header';

export default function TargetCompanies() {
  const { user, logout } = useAuth();
  const [targets, setTargets] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customName, setCustomName] = useState('');
  const [customTier, setCustomTier] = useState('tier_1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Fetch target list and pre-tagged suggestions
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [targetsData, suggestionsData] = await Promise.all([
        apiFetch('/api/target-companies'),
        apiFetch('/api/target-companies/suggestions')
      ]);
      setTargets(targetsData);
      setSuggestions(suggestionsData);
    } catch (err) {
      setError('Failed to fetch targeting data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTarget = async (companyName, discoveryTier) => {
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch('/api/target-companies', {
        method: 'POST',
        body: { companyName, discoveryTier }
      });
      setTargets(prev => [...prev, response]);
      setSuccess(`Successfully added "${companyName}" to your target list.`);
      // Clear custom fields if they were used
      if (companyName === customName) {
        setCustomName('');
      }
    } catch (err) {
      setError(err.message || 'Failed to add target company');
    }
  };

  const handleRemoveTarget = async (id, companyName) => {
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/api/target-companies/${id}`, {
        method: 'DELETE'
      });
      setTargets(prev => prev.filter(t => t.id !== id));
      setSuccess(`Removed "${companyName}" from your target list.`);
    } catch (err) {
      setError(err.message || 'Failed to remove target company');
    }
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!customName.trim()) {
      setError('Please enter a company name');
      return;
    }
    handleAddTarget(customName.trim(), customTier);
  };

  // Filter suggested companies by search term
  const filteredSuggestions = suggestions.filter(s => 
    s.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if a suggestion is already targeted
  const isAlreadyTargeted = (name) => {
    return targets.some(t => t.companyName.toLowerCase() === name.toLowerCase());
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
          
          {/* Header Title */}
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-2">
              Target Company & Role Selection
            </h1>
            <p className="text-slate-400 text-sm mx-auto max-w-xl">
              Define the companies you want to track. Direct API integrations automatically pull listings, while Email alert companies ingest target feeds.
            </p>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left/Middle Column: Find and Select suggestions */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Search Suggestions Panel */}
              <div className="glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-500 to-indigo-500"></div>
                
                <h2 className="text-lg font-bold text-slate-100 flex items-center mb-4">
                  <Sparkles className="w-5 h-5 text-brand-400 mr-2" /> Suggested Companies
                </h2>

                {/* Search Bar */}
                <div className="relative mb-6">
                  <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search pre-tagged companies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200"
                  />
                </div>

                {/* Suggestions Grid */}
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {filteredSuggestions.map((s, idx) => {
                      const active = isAlreadyTargeted(s.companyName);
                      return (
                        <div 
                          key={idx}
                          onClick={() => !active && handleAddTarget(s.companyName, s.discoveryTier)}
                          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all duration-200
                            ${active 
                              ? 'bg-slate-900/20 border-slate-900/60 opacity-50 cursor-not-allowed' 
                              : 'bg-slate-900/40 border-slate-800/80 hover:border-brand-500/30 hover:bg-slate-900/60 cursor-pointer active:scale-[0.98]'
                            }
                          `}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-200">{s.companyName}</p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider
                                ${s.discoveryTier === 'tier_1' 
                                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' 
                                  : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                                }
                              `}>
                                {s.discoveryTier === 'tier_1' ? 'Tier 1 (API)' : 'Tier 2 (Email)'}
                              </span>
                            </div>
                          </div>
                          {!active && (
                            <Plus className="w-4 h-4 text-brand-400" />
                          )}
                        </div>
                      );
                    })}

                    {filteredSuggestions.length === 0 && (
                      <p className="text-xs text-slate-505 italic py-6 text-center col-span-2">
                        No pre-tagged companies match your search. Use custom options on the right.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Tiers Explanation Panel */}
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-900 flex flex-col sm:flex-row gap-3">
                <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Understanding Discovery Tiers:</p>
                  <p><strong className="text-brand-400">Tier 1 (Direct API):</strong> Connects directly to application systems (like Greenhouse, Lever, Workday) to index jobs automatically.</p>
                  <p><strong className="text-violet-400">Tier 2 (Email-Alert Ingest):</strong> Scrapes jobs sent via custom search alerts (like Google/LinkedIn Alerts) delivered to your linked inbox.</p>
                </div>
              </div>
            </div>

            {/* Right Column: Custom Company Addition & My Targets */}
            <div className="space-y-6">
              
              {/* Custom Add Panel */}
              <div className="glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500 to-indigo-500"></div>
                
                <h2 className="text-lg font-bold text-slate-100 flex items-center mb-4">
                  <Plus className="w-5 h-5 text-violet-400 mr-2" /> Custom Company
                </h2>

                <form onSubmit={handleAddCustom} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Company Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all duration-200"
                  />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Discovery Ingest Tier</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className={`border rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all duration-200
                        ${customTier === 'tier_1' 
                          ? 'bg-brand-500/10 border-brand-500 text-brand-300' 
                          : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:border-slate-700'
                        }
                      `}>
                        <input
                          type="radio"
                          name="tier"
                          value="tier_1"
                          checked={customTier === 'tier_1'}
                          onChange={() => setCustomTier('tier_1')}
                          className="sr-only"
                        />
                        <span className="text-xs font-bold">Tier 1</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Direct API</span>
                      </label>

                      <label className={`border rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all duration-200
                        ${customTier === 'tier_2' 
                          ? 'bg-violet-500/10 border-violet-500 text-violet-300' 
                          : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:border-slate-700'
                        }
                      `}>
                        <input
                          type="radio"
                          name="tier"
                          value="tier_2"
                          checked={customTier === 'tier_2'}
                          onChange={() => setCustomTier('tier_2')}
                          className="sr-only"
                        />
                        <span className="text-xs font-bold">Tier 2</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Email Alert</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 mt-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-sm font-semibold rounded-xl text-white shadow-md hover:shadow-lg transition-all duration-205 flex items-center justify-center space-x-2"
                  >
                    <span>Add Custom Target</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* My Targets List */}
              <div className="glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 to-brand-500"></div>

                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center">
                    <Building2 className="w-5 h-5 text-emerald-400 mr-2" /> My Targets
                  </h2>
                  <span className="text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                    {targets.length}
                  </span>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {targets.map((t) => (
                    <div 
                      key={t.id}
                      className="p-3 bg-slate-900/40 border border-slate-900 rounded-xl flex items-center justify-between group hover:border-slate-800 transition-all duration-200"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-200 leading-tight">{t.companyName}</p>
                        <span className={`text-[9px] font-bold uppercase tracking-wider
                          ${t.discoveryTier === 'tier_1' ? 'text-brand-400' : 'text-violet-400'}
                        `}>
                          {t.discoveryTier === 'tier_1' ? 'Tier 1 API' : 'Tier 2 Email'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveTarget(t.id, t.companyName)}
                        className="p-1.5 rounded-lg bg-slate-950 text-slate-505 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-200"
                        title="Remove Company"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {targets.length === 0 && (
                    <div className="py-8 text-center text-slate-500 italic text-xs space-y-1">
                      <p>You haven't targeted any companies yet.</p>
                      <p className="text-[10px] text-slate-600">Select pre-tagged companies or add custom entries above.</p>
                    </div>
                  )}
                </div>

                {/* CTA to Jobs */}
                {targets.length > 0 && (
                  <button
                    onClick={() => navigate('/jobs')}
                    className="w-full py-2.5 mt-4 bg-slate-900/60 border border-slate-800/80 hover:border-brand-500/30 text-xs font-semibold rounded-xl text-slate-200 hover:text-brand-400 transition-all duration-200 flex items-center justify-center space-x-1.5"
                  >
                    <span>Proceed to Job Matches</span>
                    <ArrowRight className="w-3.5 h-3.5 text-brand-400" />
                  </button>
                )}
              </div>

            </div>

          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
