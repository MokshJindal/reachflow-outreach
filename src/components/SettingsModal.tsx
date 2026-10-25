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

  const handlePresetSelect = (preset: 'gmail' | 'zoho_in' | 'zoho_com' | 'ses' | 'resend' | 'custom') => {
    setEmailTestResult(null);
    if (preset === 'gmail') {
      setFormData(prev => ({
        ...prev,
        emailProvider: 'gmail',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
      }));
    } else if (preset === 'zoho_in') {
      setFormData(prev => ({
        ...prev,
        emailProvider: 'zoho',
        smtpHost: 'smtppro.zoho.in',
        smtpPort: 465,
        smtpSecure: true,
      }));
    } else if (preset === 'zoho_com') {
      setFormData(prev => ({
        ...prev,
        emailProvider: 'zoho',
        smtpHost: 'smtppro.zoho.com',
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
              {/* Alert: Google App Password Explained */}
              {formData.emailProvider === 'gmail' && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Important: Do NOT enter your personal Google login password!</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Google does <strong>not</strong> allow external apps to use your main account password. Instead, Google uses a secure <strong>16-character App Password</strong> that only grants permission to send emails via SMTP without giving access to your Google account or personal data.
                  </p>
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] text-slate-300">
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span>How to get your 16-character Google App Password:</span>
                      <a 
                        href="https://myaccount.google.com/apppasswords" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-[10px]"
                      >
                        Open Google App Passwords ↗
                      </a>
                    </div>
                    <ol className="list-decimal pl-4 space-y-0.5 text-slate-400">
                      <li>Make sure <strong>2-Step Verification</strong> is ON in your Google Account.</li>
                      <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">myaccount.google.com/apppasswords</a>.</li>
                      <li>Type an app name (e.g. <code className="text-amber-300 font-mono">ReachFlow</code>) and click <strong>Create</strong>.</li>
                      <li>Copy the 16-character code (e.g. <code className="text-emerald-300 font-mono">abcd efgh ijkl mnop</code>) and paste it below.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Alert: Zoho Mail App Password Explained */}
              {formData.emailProvider === 'zoho' && (
                <div className="p-3.5 bg-blue-500/10 border border-blue-500/25 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 text-blue-300 font-bold">
                    <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Zoho Mail Integration Active ({formData.smtpHost})</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Zoho requires an <strong>Application-Specific Password (App Password)</strong> when Two-Factor Authentication (TFA) is enabled to authenticate external SMTP relays safely.
                  </p>
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] text-slate-300">
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span>How to generate a Zoho App Password:</span>
                      <div className="flex items-center gap-2">
                        <a 
                          href="https://accounts.zoho.in/#security/app-passwords" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-cyan-400 hover:underline font-mono text-[10px]"
                        >
                          Zoho India (.in) ↗
                        </a>
                        <span className="text-slate-600">•</span>
                        <a 
                          href="https://accounts.zoho.com/#security/app-passwords" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-cyan-400 hover:underline font-mono text-[10px]"
                        >
                          Zoho Global (.com) ↗
                        </a>
                      </div>
                    </div>
                    <ol className="list-decimal pl-4 space-y-0.5 text-slate-400">
                      <li>Go to <strong>Zoho Accounts → Security → Application-Specific Passwords</strong>.</li>
                      <li>Click <strong>Generate New Password</strong> and name it <code className="text-blue-300 font-mono">ReachFlow</code>.</li>
                      <li>Copy the generated password and paste it into the <strong>SMTP Password</strong> field below.</li>
                      <li>Enter your full Zoho email in <strong>SMTP Username</strong> (e.g. <code className="text-slate-300 font-mono">you@yourdomain.com</code>).</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Provider Quick Presets */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">One-Click Provider Presets:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'zoho_in', label: 'Zoho Mail (India .in)', activeMatch: formData.smtpHost === 'smtppro.zoho.in' },
                    { id: 'zoho_com', label: 'Zoho Mail (Global .com)', activeMatch: formData.smtpHost === 'smtppro.zoho.com' },
                    { id: 'gmail', label: 'Gmail / Google Workspace', activeMatch: formData.emailProvider === 'gmail' },
                    { id: 'ses', label: 'Amazon SES (ap-south-1)', activeMatch: formData.emailProvider === 'ses' },
                    { id: 'resend', label: 'Resend API', activeMatch: formData.emailProvider === 'resend' },
                    { id: 'custom', label: 'Custom SMTP', activeMatch: formData.emailProvider === 'smtp' && !formData.smtpHost.includes('zoho') },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.id as any)}
                      className={`px-3 py-2 text-xs rounded-lg border text-center font-medium transition ${
                        preset.activeMatch
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
                  <div className={`text-xs px-3 py-2 rounded-xl flex items-start justify-between gap-2 max-w-md shadow-lg ${
                    emailTestResult.ok ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    <div className="flex items-start gap-1.5 leading-relaxed">
                      {emailTestResult.ok ? <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />}
                      <span>{emailTestResult.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailTestResult(null)}
                      title="Dismiss message"
                      className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 shrink-0 ml-1 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WHATSAPP TAB */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Select WhatsApp Dispatch Method:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, whatsappProvider: 'personal_direct' })}
                    className={`p-3 rounded-xl border text-left transition ${
                      formData.whatsappProvider === 'personal_direct'
                        ? 'border-emerald-500 bg-emerald-500/15 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1 text-emerald-300">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      Personal Profile (100% Free)
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Sends directly from <strong>YOUR personal WhatsApp number & profile photo</strong>. Zero 3rd party branding, zero fees.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, whatsappProvider: 'twilio' })}
                    className={`p-3 rounded-xl border text-left transition ${
                      formData.whatsappProvider === 'twilio'
                        ? 'border-emerald-500 bg-emerald-500/15 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <Server className="w-4 h-4 text-slate-300" />
                      Twilio Cloud API (Paid)
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Automated headless API for registered business accounts. Charges per message.
                    </p>
                  </button>
                </div>
              </div>

              {formData.whatsappProvider === 'personal_direct' ? (
                <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Personal Profile Mode is Active (No API Keys or Paid Accounts Needed!)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    In this mode, messages are sent directly from your own WhatsApp. When you launch a campaign, ReachFlow prepares the personalized and AI-varied text for each contact and lets you dispatch them through WhatsApp Web / Desktop with 1 click per lead.
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                    <li><strong className="text-slate-200">100% Free:</strong> No per-message fees or monthly API bills.</li>
                    <li><strong className="text-slate-200">Authentic Profile:</strong> Recipients see your personal/business name and profile picture.</li>
                    <li><strong className="text-slate-200">No Third-Party Branding:</strong> No mention of Twilio, Meta Business, or sandbox notices.</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                    <div>
                      <strong>Twilio WhatsApp API:</strong> Requires a paid Twilio account and pre-approved WhatsApp templates.
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
                      placeholder="e.g. +14155238886 (Twilio Sender)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
                    />
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
                      <div className={`text-xs px-3 py-2 rounded-xl flex items-start justify-between gap-2 max-w-md shadow-lg ${
                        twilioTestResult.ok ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        <div className="flex items-start gap-1.5 leading-relaxed">
                          {twilioTestResult.ok ? <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />}
                          <span>{twilioTestResult.message}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTwilioTestResult(null)}
                          title="Dismiss message"
                          className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 shrink-0 ml-1 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
