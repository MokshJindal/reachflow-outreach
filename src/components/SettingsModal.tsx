'use client';

import React, { useState } from 'react';
import { AppSettings } from '@/types';
import { 
  X, Check, AlertCircle, Key, Mail, MessageSquare, 
  ShieldCheck, RefreshCw, Server, Send, Sparkles 
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export default function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'email' | 'whatsapp' | 'throttling'>('email');
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testingTwilio, setTestingTwilio] = useState(false);
  const [twilioTestResult, setTwilioTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handlePresetSelect = (preset: 'gmail' | 'ses' | 'resend' | 'custom') => {
    if (preset === 'gmail') {
      setFormData(prev => ({
        ...prev,
        emailProvider: 'gmail',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
      }));
    } else if (preset === 'ses') {
      setFormData(prev => ({
        ...prev,
        emailProvider: 'ses',
        smtpHost: 'email-smtp.ap-south-1.amazonaws.com',
        smtpPort: 587,
        smtpSecure: false,
      }));
    } else if (preset === 'resend') {
      setFormData(prev => ({
        ...prev,
        emailProvider: 'resend',
        smtpHost: 'smtp.resend.com',
        smtpPort: 465,
        smtpSecure: true,
        smtpUser: 'resend',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        emailProvider: 'smtp',
      }));
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setEmailTestResult(null);
    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', settings: formData })
      });
      const data = await res.json();
      setEmailTestResult(data);
    } catch (err: any) {
      setEmailTestResult({ ok: false, message: err.message || 'Network request failed' });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestTwilio = async () => {
    setTestingTwilio(true);
    setTwilioTestResult(null);
    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'whatsapp', settings: formData })
      });
      const data = await res.json();
      setTwilioTestResult(data);
    } catch (err: any) {
      setTwilioTestResult({ ok: false, message: err.message || 'Network request failed' });
    } finally {
      setTestingTwilio(false);
    }
  };

  const handleSave = async () => {
    onSave(formData);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    } catch (e) {
      console.warn('Could not persist to .env.local:', e);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Platform Settings & Credentials</h2>
              <p className="text-xs text-slate-400">Configure your email rails, WhatsApp API, and Claude AI key</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 gap-2">
          <button
            onClick={() => setActiveTab('email')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'email'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            Email Sending Rail (SMTP / Gmail)
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'whatsapp'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp Rail (Twilio)
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'ai'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Claude AI & Anti-Spam
          </button>

          <button
            onClick={() => setActiveTab('throttling')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'throttling'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Throttling & Deliverability
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-300">

          {/* EMAIL TAB */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-indigo-400 shrink-0" />
                <div>
                  <strong>Tip for Google Workspace / Gmail:</strong> Use <strong>smtp.gmail.com</strong>, Port <strong>465</strong> (SSL) or <strong>587</strong> (TLS), and an <strong>App Password</strong> generated from your Google Account Security page.
                </div>
              </div>

              {/* Provider Quick Presets */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">One-Click Provider Presets:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'gmail', label: 'Gmail / Google Workspace' },
                    { id: 'ses', label: 'Amazon SES (ap-south-1)' },
                    { id: 'resend', label: 'Resend API' },
                    { id: 'custom', label: 'Custom SMTP' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.id as any)}
                      className={`px-3 py-2 text-xs rounded-lg border text-center font-medium transition ${
                        formData.emailProvider === preset.id
                          ? 'border-indigo-500 bg-indigo-500/20 text-white'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={formData.smtpHost}
                    onChange={e => setFormData({ ...formData, smtpHost: e.target.value })}
                    placeholder="e.g. smtp.gmail.com or email-smtp.ap-south-1.amazonaws.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">SMTP Port</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={formData.smtpPort}
                      onChange={e => setFormData({ ...formData, smtpPort: parseInt(e.target.value) || 587 })}
                      className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
                    />
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={formData.smtpSecure}
                        onChange={e => setFormData({ ...formData, smtpSecure: e.target.checked })}
                        className="rounded bg-slate-950 border-slate-800 text-indigo-500 focus:ring-0"
                      />
                      SSL / TLS (Port 465)
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">SMTP Username / Email</label>
                  <input
                    type="text"
                    value={formData.smtpUser}
                    onChange={e => setFormData({ ...formData, smtpUser: e.target.value })}
                    placeholder="your-email@company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">SMTP Password / App Password</label>
                  <input
                    type="password"
                    value={formData.smtpPass}
                    onChange={e => setFormData({ ...formData, smtpPass: e.target.value })}
                    placeholder="••••••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">From Sender Name</label>
                  <input
                    type="text"
                    value={formData.fromName}
                    onChange={e => setFormData({ ...formData, fromName: e.target.value })}
                    placeholder="e.g. John from Acme"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">From Email Address</label>
                  <input
                    type="email"
                    value={formData.fromEmail}
                    onChange={e => setFormData({ ...formData, fromEmail: e.target.value })}
                    placeholder="john@company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Reply-To Address</label>
                  <input
                    type="email"
                    value={formData.replyTo}
                    onChange={e => setFormData({ ...formData, replyTo: e.target.value })}
                    placeholder="replies@company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              {/* Test Email Connection Button */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testingEmail || !formData.smtpHost}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingEmail ? 'animate-spin' : ''}`} />
                  {testingEmail ? 'Testing Handshake...' : 'Verify SMTP Connection'}
                </button>

                {emailTestResult && (
                  <div className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                    emailTestResult.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {emailTestResult.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    <span>{emailTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WHATSAPP TAB */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                <div>
                  <strong>Twilio WhatsApp API Integration:</strong> Enter your Twilio credentials below to send bulk WhatsApp messages directly from the app. Twilio handles phone formatting and global routing.
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Twilio Account SID</label>
                <input
                  type="text"
                  value={formData.twilioAccountSid}
                  onChange={e => setFormData({ ...formData, twilioAccountSid: e.target.value })}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Twilio Auth Token</label>
                <input
                  type="password"
                  value={formData.twilioAuthToken}
                  onChange={e => setFormData({ ...formData, twilioAuthToken: e.target.value })}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Sender WhatsApp Number</label>
                <input
                  type="text"
                  value={formData.twilioWhatsAppNumber}
                  onChange={e => setFormData({ ...formData, twilioWhatsAppNumber: e.target.value })}
                  placeholder="e.g. +14155238886 (Twilio Sandbox or Approved Sender)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">Format: +14155238886 or whatsapp:+14155238886</p>
              </div>

              {/* Test Twilio Connection */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleTestTwilio}
                  disabled={testingTwilio || !formData.twilioAccountSid}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingTwilio ? 'animate-spin' : ''}`} />
                  {testingTwilio ? 'Verifying with Twilio...' : 'Verify Twilio Credentials'}
                </button>

                {twilioTestResult && (
                  <div className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                    twilioTestResult.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {twilioTestResult.ok ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    <span>{twilioTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI TAB */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 text-purple-400 shrink-0" />
                <div>
                  <strong>Claude AI Integration:</strong> Powers dynamic per-recipient word variation (spintax / paraphrasing) and Bayesian deliverability spam auditing. Claude 3.5 Haiku is used for high-speed batch processing.
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Anthropic API Key</label>
                <input
                  type="password"
                  value={formData.anthropicApiKey}
                  onChange={e => setFormData({ ...formData, anthropicApiKey: e.target.value })}
                  placeholder="sk-ant-api03-..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-xs font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">If blank, the system automatically uses our built-in offline smart synonym and spintax engine.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Claude Model</label>
                  <select
                    value={formData.anthropicModel}
                    onChange={e => setFormData({ ...formData, anthropicModel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-xs"
                  >
                    <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fastest & lowest token cost)</option>
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Maximum personalization quality)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Variation Intensity</label>
                  <select
                    value={formData.variationIntensity}
                    onChange={e => setFormData({ ...formData, variationIntensity: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-xs"
                  >
                    <option value="subtle">Subtle (Changes synonyms & greetings, keeps core)</option>
                    <option value="moderate">Moderate (Paraphrases sentences naturally)</option>
                    <option value="creative">Creative (Full dynamic rephrasing)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* THROTTLING TAB */}
          {activeTab === 'throttling' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                <div>
                  <strong>Deliverability & Anti-Spam Safety:</strong> Spreading sends over jittered intervals mimics human behavior and avoids triggering email provider rate limiters.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Delay Between Sends (Seconds)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={formData.sendDelaySeconds}
                    onChange={e => setFormData({ ...formData, sendDelaySeconds: parseInt(e.target.value) || 3 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Recommended: 3–15 seconds for bulk outreach</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Max Daily Sends Cap</label>
                  <input
                    type="number"
                    value={formData.dailyLimit}
                    onChange={e => setFormData({ ...formData, dailyLimit: parseInt(e.target.value) || 500 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Safely stay below provider limits</p>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.stopOnHighBounce}
                    onChange={e => setFormData({ ...formData, stopOnHighBounce: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                  />
                  Automated Circuit Breaker: Auto-pause campaign if bounce rate exceeds 3%
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Credentials are encrypted locally and never shared.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
            >
              <Check className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
