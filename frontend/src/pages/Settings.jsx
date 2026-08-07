import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';
import { 
  Building2, 
  Briefcase, 
  LogOut, 
  Upload, 
  Compass,
  Award,
  AlertCircle,
  CheckCircle2,
  ThumbsUp,
  Mail,
  Settings,
  ShieldCheck,
  RefreshCw,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Footer from '../components/Footer';
import Header from '../components/Header';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    checkGmailStatus();
    
    // Parse redirect url indicators
    const status = searchParams.get('gmail');
    const msg = searchParams.get('message');
    if (status === 'success') {
      setSuccess('Gmail account connected successfully! JobAssistant will now monitor for application updates.');
      // Remove query parameters from URL
      setSearchParams({});
    } else if (status === 'error') {
      setError('Gmail connection failed: ' + (msg || 'unknown error'));
      setSearchParams({});
    }
  }, [searchParams]);

  const checkGmailStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/gmail/status');
      setConnected(response.connected);
    } catch (err) {
      setError('Failed to load Gmail connection status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    setConnecting(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch('/api/gmail/connect');
      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error('Connection URL not returned from backend');
      }
    } catch (err) {
      setError('Failed to initiate Gmail connection: ' + err.message);
      setConnecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Gmail account? Status tracking updates will be paused.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch('/api/gmail/disconnect', {
        method: 'DELETE'
      });
      setConnected(false);
      setSuccess('Gmail account disconnected successfully.');
    } catch (err) {
      setError('Failed to disconnect Gmail: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-slate-950 text-slate-100 overflow-y-auto pb-12">
      {/* Background Glow Blobs */}
      <div className="glow-blob w-[600px] h-[600px] bg-indigo-900/20 top-[-20%] left-[-10%] animate-pulse-slow"></div>
      <div className="glow-blob w-[500px] h-[500px] bg-brand-900/15 bottom-[-10%] right-[-10%] animate-pulse-slow" style={{ animationDelay: '-4s' }}></div>

      <Header />

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-start p-6 z-10 z-10 w-full mt-4">
        <div className="w-full max-w-xl space-y-8">
          
          {/* Header Title */}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 flex items-center">
              <Settings className="w-8 h-8 text-brand-400 mr-3 animate-spin-slow" />
              <span>Application Settings</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Configure system features, credentials, and API connections.
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

          {/* Connect Gmail Card */}
          <div className="glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-500 to-violet-500"></div>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-100 leading-tight">Gmail Connection Gate</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Allow JobAssistant to safely monitor your mailbox in read-only mode. It will automatically scan for interview updates, status updates, or responses from target companies.
                </p>
              </div>
            </div>

            {/* Connection Actions / Status */}
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
              </div>
            ) : connected ? (
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-bold text-slate-200">Status: Connected</span>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Scope: gmail.readonly</p>
                  </div>
                </div>

                <button
                  onClick={handleDisconnectGmail}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-800 bg-slate-950 hover:bg-rose-500/10 hover:border-rose-500/20 text-slate-350 hover:text-rose-400 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disconnect Account</span>
                </button>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-slate-900/35 border border-slate-905 flex flex-col items-center text-center space-y-4 animate-fadeIn">
                <p className="text-xs text-slate-400">
                  No email accounts are currently connected.
                </p>
                <button
                  onClick={handleConnectGmail}
                  disabled={connecting}
                  className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-60 text-xs font-bold rounded-xl text-white shadow-md hover:shadow-lg transition-all duration-205 flex items-center space-x-2 cursor-pointer"
                >
                  {connecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 text-brand-300" />
                      <span>Connect Gmail Account</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
