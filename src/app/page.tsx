'use client';

import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  Mail, MessageSquare, Sparkles, Send, ShieldCheck, 
  Settings, Users, FileText, CheckCircle2, AlertTriangle, 
  Clock, Play, Pause, RotateCcw, Download, Eye, Zap, 
  HelpCircle, ArrowRight, Check, X, ShieldAlert, Upload
} from 'lucide-react';
import { Contact, AppSettings, SendLogItem, OutreachChannel, DeliverabilityAudit } from '@/types';
import SettingsModal from '@/components/SettingsModal';

const DEFAULT_SETTINGS: AppSettings = {
  aiEnabled: true,
  anthropicApiKey: '',
  anthropicModel: 'claude-3-5-haiku-20241022',
  variationIntensity: 'moderate',
  emailConfigured: false,
  emailProvider: 'gmail',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: '',
  smtpPass: '',
  fromName: 'Outreach Team',
  fromEmail: '',
  replyTo: '',
  whatsappConfigured: false,
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioWhatsAppNumber: '',
  sendDelaySeconds: 3,
  dailyLimit: 500,
  stopOnHighBounce: true,
};

const SAMPLE_LEADS_TEXT = `john.smith@techinnovate.io, John, Smith, TechInnovate, +919876543210
sarah.connor@cyberdynesys.com, Sarah, Connor, Cyberdyne, +919876543211
michael.scott@dundermifflin.net, Michael, Scott, Dunder Mifflin, +919876543212
admin@tempmail.com, Spammy, Bot, FakeCorp, +919876543213
priya.sharma@nexusventures.in, Priya, Sharma, Nexus Ventures, +919876543214`;

export default function HomePage() {
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Campaign Input State
  const [channel, setChannel] = useState<OutreachChannel>('email');
  const [rawContactsText, setRawContactsText] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsSummary, setContactsSummary] = useState({
    total: 0,
    valid: 0,
    disposable: 0,
    duplicate: 0,
    suppressed: 0,
    invalid: 0
  });

  // Message Content
  const [subject, setSubject] = useState('Quick question for {{first_name}} regarding {{company}}');
  const [bodyText, setBodyText] = useState(`Hi {{first_name}},

I wanted to reach out because we built a high-speed outreach engine that lets teams send bulk emails and WhatsApp messages without landing in spam.

Would you be open to a quick 2-minute chat this week to see how it works for {{company}}?

Best regards,
Outreach Team`);
  const [whatsappText, setWhatsappText] = useState(`Hi {{first_name}}! Reaching out from the team regarding {{company}}. Dropped you a quick email earlier. Let me know if you are open to a brief chat!`);

  // AI & Anti-Spam State
  const [useAiVariation, setUseAiVariation] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<DeliverabilityAudit | null>(null);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [variedPreview, setVariedPreview] = useState<Array<{ name: string; email: string; subject: string; body: string }> | null>(null);

  // Sending & Progress State
  const [sendMode, setSendMode] = useState<'instant' | 'jitter'>('jitter');
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sendLogs, setSendLogs] = useState<SendLogItem[]>([]);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testPhoneTarget, setTestPhoneTarget] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // File Upload & Drag State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ingestionTab, setIngestionTab] = useState<'upload' | 'paste'>('upload');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load saved settings from server and localStorage on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          try {
            const saved = localStorage.getItem('reachflow_settings');
            if (saved) {
              setSettings({ ...data.settings, ...JSON.parse(saved) });
            } else {
              setSettings(data.settings);
            }
          } catch {
            setSettings(data.settings);
          }
        }
      })
      .catch(() => {
        try {
          const saved = localStorage.getItem('reachflow_settings');
          if (saved) setSettings(JSON.parse(saved));
        } catch {}
      });
  }, []);

  const processFile = async (file: File) => {
    setIsUploadingFile(true);
    setUploadError(null);
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/contacts/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to process file');
      }

      if (data.contacts && Array.isArray(data.contacts)) {
        setContacts(data.contacts);
        setContactsSummary(data.summary);
        
        // Populate text representation
        const lines = data.contacts.map((c: Contact) => 
          [c.email, c.firstName || '', c.lastName || '', c.company || '', c.phone || ''].filter(Boolean).join(', ')
        );
        setRawContactsText(lines.join('\n'));
      }
    } catch (err: any) {
      console.error('File extraction error:', err);
      setUploadError(err.message || 'Failed to extract contacts from file');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('reachflow_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to save settings locally');
    }
  };

  // Parse Contacts whenever raw text changes
  const handleParseContacts = async (text: string) => {
    setRawContactsText(text);
    if (!text.trim()) {
      setContacts([]);
      setContactsSummary({ total: 0, valid: 0, disposable: 0, duplicate: 0, suppressed: 0, invalid: 0 });
      return;
    }

    try {
      const res = await fetch('/api/contacts/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: text })
      });
      const data = await res.json();
      if (data.contacts) {
        setContacts(data.contacts);
        setContactsSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to parse contacts:', err);
    }
  };

  const loadSampleLeads = () => {
    handleParseContacts(SAMPLE_LEADS_TEXT);
  };

  // Run Bayesian / Claude Deliverability Audit
  const handleRunAudit = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    try {
      const res = await fetch('/api/ai/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          bodyContent: bodyText,
          apiKey: settings.anthropicApiKey
        })
      });
      const data = await res.json();
      if (data.audit) {
        setAuditResult(data.audit);
      }
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  // Preview AI Variations for the first few contacts
  const handlePreviewVariations = async () => {
    const validContacts = contacts.filter(c => c.status === 'valid');
    if (validContacts.length === 0) {
      alert('Please add at least one valid contact first.');
      return;
    }

    setIsGeneratingVariations(true);
    try {
      const sampleBatch = validContacts.slice(0, 3);
      const res = await fetch('/api/ai/vary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          bodyContent: bodyText,
          contacts: sampleBatch,
          apiKey: settings.anthropicApiKey,
          model: settings.anthropicModel
        })
      });
      const data = await res.json();
      if (data.variations) {
        const previewList = data.variations.map((v: any, idx: number) => ({
          name: sampleBatch[idx].firstName || sampleBatch[idx].email,
          email: sampleBatch[idx].email,
          subject: v.variedSubject,
          body: v.variedBody
        }));
        setVariedPreview(previewList);
      }
    } catch (err) {
      console.error('Failed to generate preview:', err);
    } finally {
      setIsGeneratingVariations(false);
    }
  };

  // Send Single Test
  const handleSendTest = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      const targetContact: Contact = {
        id: 'test_lead',
        email: testEmailTarget || settings.fromEmail || 'test@example.com',
        phone: testPhoneTarget || '+919999999999',
        firstName: 'TestUser',
        company: 'Demo Company',
        status: 'valid'
      };

      const res = await fetch('/api/dispatch/send-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          channel,
          toEmail: targetContact.email,
          toName: targetContact.firstName,
          toPhone: targetContact.phone,
          subject: subject.replace(/\{\{first_name\}\}/g, 'TestUser').replace(/\{\{company\}\}/g, 'Demo Company'),
          bodyText: bodyText.replace(/\{\{first_name\}\}/g, 'TestUser').replace(/\{\{company\}\}/g, 'Demo Company'),
          whatsappText: whatsappText.replace(/\{\{first_name\}\}/g, 'TestUser').replace(/\{\{company\}\}/g, 'Demo Company'),
          isAiVaried: false
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult('Test message sent successfully!');
      } else {
        setTestResult(`Test failed: ${data.emailResult?.error || data.waResult?.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    } finally {
      setTestSending(false);
    }
  };

  // Launch Full Campaign
  const handleLaunchCampaign = async () => {
    const validContacts = contacts.filter(c => c.status === 'valid');
    if (validContacts.length === 0) {
      alert('Please enter or upload valid contacts first.');
      return;
    }

    setIsSending(true);
    setIsPaused(false);
    setCurrentIndex(0);
    setSendLogs([]);

    // Step 1: Pre-generate variations if AI variation is enabled
    let contactVariations: Record<string, { subject: string; body: string }> = {};

    if (useAiVariation) {
      try {
        const varyRes = await fetch('/api/ai/vary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject,
            bodyContent: bodyText,
            contacts: validContacts,
            apiKey: settings.anthropicApiKey,
            model: settings.anthropicModel
          })
        });
        const varyData = await varyRes.json();
        if (varyData.variations) {
          for (const item of varyData.variations) {
            contactVariations[item.contactId] = {
              subject: item.variedSubject,
              body: item.variedBody
            };
          }
        }
      } catch (err) {
        console.warn('Variation pre-generation had issue, using inline substitution:', err);
      }
    }

    // Step 2: Loop and dispatch with jitter/delay
    for (let i = 0; i < validContacts.length; i++) {
      setCurrentIndex(i + 1);
      const contact = validContacts[i];

      const currentSubject = contactVariations[contact.id]?.subject || 
        subject.replace(/\{\{first_name\}\}/g, contact.firstName || 'there').replace(/\{\{company\}\}/g, contact.company || 'your team');
      
      const currentBody = contactVariations[contact.id]?.body || 
        bodyText.replace(/\{\{first_name\}\}/g, contact.firstName || 'there').replace(/\{\{company\}\}/g, contact.company || 'your team');

      const currentWa = whatsappText
        .replace(/\{\{first_name\}\}/g, contact.firstName || 'there')
        .replace(/\{\{company\}\}/g, contact.company || 'your team');

      try {
        const res = await fetch('/api/dispatch/send-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings,
            channel,
            toEmail: contact.email,
            toName: contact.firstName,
            toPhone: contact.phone,
            subject: currentSubject,
            bodyText: currentBody,
            whatsappText: currentWa,
            isAiVaried: useAiVariation
          })
        });

        const data = await res.json();
        const logItem: SendLogItem = {
          id: `log_${Date.now()}_${i}`,
          timestamp: new Date().toLocaleTimeString(),
          contactEmail: contact.email,
          contactPhone: contact.phone,
          contactName: contact.firstName ? `${contact.firstName} ${contact.lastName || ''}`.trim() : undefined,
          company: contact.company,
          channel,
          subjectSent: currentSubject,
          bodySent: currentBody,
          whatsappSent: currentWa,
          status: data.success ? (data.emailResult?.messageId?.startsWith('sim_') ? 'simulated' : 'sent') : 'failed',
          errorDetails: data.emailResult?.error || data.waResult?.error,
          isAiVaried: useAiVariation
        };

        setSendLogs(prev => [logItem, ...prev]);
      } catch (err: any) {
        setSendLogs(prev => [
          {
            id: `log_${Date.now()}_${i}`,
            timestamp: new Date().toLocaleTimeString(),
            contactEmail: contact.email,
            contactPhone: contact.phone,
            channel,
            status: 'failed',
            errorDetails: err.message
          },
          ...prev
        ]);
      }

      // If safe jitter mode, wait between sends
      if (sendMode === 'jitter' && i < validContacts.length - 1) {
        const delayMs = (settings.sendDelaySeconds || 3) * 1000;
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    setIsSending(false);
  };

  const validContacts = contacts.filter(c => c.status === 'valid');
  const progressPct = validContacts.length > 0 ? Math.round((currentIndex / validContacts.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">ReachFlow AI</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                Bulk Email & WhatsApp Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">Zero-spam cold outreach & high-throughput delivery platform</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://reachflow-outreach.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold transition"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live on Vercel</span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </a>

          <a
            href="https://github.com/MokshJindal/reachflow-outreach"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-xs font-medium transition"
          >
            <span>GitHub</span>
          </a>

          <button
            onClick={() => setTestModalOpen(true)}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-200 border border-slate-700/60 transition flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            Send Test
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-xl text-white shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings & API Keys
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: 1. Ingestion & 2. Composer (7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* STEP 1: CONTACTS INGESTION & HYGIENE */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">1</span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recipients & Contacts</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadSampleLeads}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded hover:bg-indigo-500/10 transition"
                >
                  + Demo Leads
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleParseContacts('');
                    setUploadedFileName(null);
                    setUploadError(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-400 px-2 py-1"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Ingestion Mode Selector Tabs */}
            <div className="flex border-b border-slate-800/80 mb-3 gap-2">
              <button
                type="button"
                onClick={() => setIngestionTab('upload')}
                className={`pb-2 px-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
                  ingestionTab === 'upload'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Document (PDF, Excel, Word, CSV)
              </button>
              <button
                type="button"
                onClick={() => setIngestionTab('paste')}
                className={`pb-2 px-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
                  ingestionTab === 'paste'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Paste Raw Text / CSV
              </button>
            </div>

            {/* UPLOAD TAB: DRAG & DROP ZONE */}
            {ingestionTab === 'upload' ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDraggingOver 
                    ? 'border-cyan-400 bg-cyan-950/20' 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.xlsx,.xls,.docx,.csv,.tsv,.txt,.vcf,.json"
                  className="hidden"
                />

                {isUploadingFile ? (
                  <div className="flex flex-col items-center gap-2 py-3 text-cyan-400">
                    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-semibold">Extracting contacts from document...</p>
                    <p className="text-[11px] text-slate-500">Scanning text, emails, phones & tables</p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        Drop your <span className="text-cyan-400">PDF, Excel, Word, or CSV</span> here, or <span className="text-indigo-400 underline">browse</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Extracts emails, names, phones, and company from any document format
                      </p>
                    </div>
                    {uploadedFileName && (
                      <span className="mt-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 text-[11px] font-mono border border-cyan-500/20">
                        📄 Loaded: {uploadedFileName}
                      </span>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-400 mb-2">
                  Paste emails or CSV rows (<code className="text-indigo-300">email, first_name, company, phone</code>), or one email per line:
                </p>
                <textarea
                  rows={4}
                  value={rawContactsText}
                  onChange={e => handleParseContacts(e.target.value)}
                  placeholder="e.g.&#10;john.smith@techinnovate.io, John, TechInnovate, +919876543210&#10;sarah@cyberdyne.com, Sarah, Cyberdyne, +919876543211"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                />
              </div>
            )}

            {uploadError && (
              <div className="mt-2 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Hygiene & Verification Summary Bar */}
            {contacts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {contactsSummary.valid} Valid Ready
                  </span>
                  {contactsSummary.disposable > 0 && (
                    <span className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {contactsSummary.disposable} Disposable Filtered
                    </span>
                  )}
                  {contactsSummary.duplicate > 0 && (
                    <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400">
                      {contactsSummary.duplicate} Duplicates Removed
                    </span>
                  )}
                  {contactsSummary.suppressed > 0 && (
                    <span className="px-2 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      {contactsSummary.suppressed} Role Blocked
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-slate-500">
                  Total Parsed: {contactsSummary.total}
                </span>
              </div>
            )}
          </div>

          {/* STEP 2: CHANNEL & MESSAGE COMPOSER */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">2</span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Outreach Message & Channel</h2>
              </div>

              {/* Channel Selector */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    channel === 'email' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email Only
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('whatsapp')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    channel === 'whatsapp' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp Only
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('both')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    channel === 'both' ? 'bg-gradient-to-r from-indigo-600 to-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Dual Send
                </button>
              </div>
            </div>

            {/* Email Subject & Body (If Email or Both) */}
            {(channel === 'email' || channel === 'both') && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">Email Subject</label>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span>Insert:</span>
                      <button 
                        type="button"
                        onClick={() => setSubject(prev => prev + ' {{first_name}}')}
                        className="text-indigo-400 hover:underline"
                      >
                        {`{{first_name}}`}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setSubject(prev => prev + ' {{company}}')}
                        className="text-indigo-400 hover:underline ml-1"
                      >
                        {`{{company}}`}
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">Email Body</label>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span>Dynamic tags:</span>
                      <button 
                        type="button"
                        onClick={() => setBodyText(prev => prev + ' {{first_name}}')}
                        className="text-indigo-400 hover:underline"
                      >
                        {`{{first_name}}`}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setBodyText(prev => prev + ' {{company}}')}
                        className="text-indigo-400 hover:underline ml-1"
                      >
                        {`{{company}}`}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={bodyText}
                    onChange={e => setBodyText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* WhatsApp Text (If WhatsApp or Both) */}
            {(channel === 'whatsapp' || channel === 'both') && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp Direct Message Copy
                  </label>
                  <span className="text-[10px] text-emerald-400 font-medium">Twilio WhatsApp Rail</span>
                </div>
                <textarea
                  rows={3}
                  value={whatsappText}
                  onChange={e => setWhatsappText(e.target.value)}
                  className="w-full bg-slate-950 border border-emerald-900/40 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
                />
              </div>
            )}

            {/* STEP 3: AI WORD VARIATION & DELIVERABILITY SHIELD */}
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">AI Dynamic Word Variation & Anti-Spam</h3>
                    <p className="text-[11px] text-slate-400">Slightly varies synonyms & sentence rhythm per recipient to evade spam filters</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAiVariation}
                    onChange={e => setUseAiVariation(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Action Buttons for AI Audit and Preview */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleRunAudit}
                  disabled={isAuditing}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-xl border border-slate-700/60 flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  {isAuditing ? 'Auditing Copy...' : 'Audit Deliverability Risk'}
                </button>

                {useAiVariation && (
                  <button
                    type="button"
                    onClick={handlePreviewVariations}
                    disabled={isGeneratingVariations || validContacts.length === 0}
                    className="px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-xs font-medium text-purple-300 rounded-xl border border-purple-500/30 flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {isGeneratingVariations ? 'Generating Variations...' : 'Preview AI Varied Copies'}
                  </button>
                )}
              </div>

              {/* Audit Result Display */}
              {auditResult && (
                <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  auditResult.verdict === 'safe' 
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                    : auditResult.verdict === 'moderate_risk'
                    ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                    : 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {auditResult.verdict === 'safe' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-amber-400" />}
                      Deliverability Score: {100 - auditResult.riskScore} / 100 ({auditResult.verdict.toUpperCase()})
                    </span>
                    <span className="text-[11px] text-slate-400">Bayesian AI Evaluation</span>
                  </div>

                  {auditResult.spamTriggerWords.length > 0 && (
                    <p className="text-[11px] text-rose-300">
                      <strong>Spam Triggers Detected:</strong> {auditResult.spamTriggerWords.join(', ')}
                    </p>
                  )}

                  <ul className="text-[11px] space-y-0.5 list-disc pl-4 text-slate-300">
                    {auditResult.suggestions.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Varied Samples Card */}
              {variedPreview && (
                <div className="p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-purple-300 font-bold">
                    <span>Generated Dynamic Samples (Word Variation Active):</span>
                    <button 
                      onClick={() => setVariedPreview(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {variedPreview.map((item, idx) => (
                      <div key={idx} className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-200">Recipient #{idx + 1}: {item.name} ({item.email})</span>
                          <span className="text-purple-400 font-mono text-[10px]">Unique Variant</span>
                        </div>
                        <p className="text-slate-400 font-mono text-[11px]">
                          <strong className="text-slate-300">Subject:</strong> {item.subject}
                        </p>
                        <p className="text-slate-300 text-[11px] whitespace-pre-line border-l-2 border-purple-500/50 pl-2 mt-1">
                          {item.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Right Column: 3. Dispatch Controls & 4. Live Telemetry (5 cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* LAUNCH CONTROLS CARD */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">3</span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Dispatch Controls</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-medium">
                {validContacts.length} Targets Ready
              </span>
            </div>

            {/* Send Mode Selection */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSendMode('instant')}
                className={`p-3 rounded-xl border text-left transition ${
                  sendMode === 'instant'
                    ? 'border-indigo-500 bg-indigo-500/15 text-white'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Instant Burst
                </div>
                <p className="text-[11px] text-slate-400">Sends directly right away with minimal delay.</p>
              </button>

              <button
                type="button"
                onClick={() => setSendMode('jitter')}
                className={`p-3 rounded-xl border text-left transition ${
                  sendMode === 'jitter'
                    ? 'border-indigo-500 bg-indigo-500/15 text-white'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Humanized Safe Mode
                </div>
                <p className="text-[11px] text-slate-400">{settings.sendDelaySeconds}s jitter delay to maximize inboxing.</p>
              </button>
            </div>

            {/* Big Launch Button */}
            <button
              type="button"
              onClick={handleLaunchCampaign}
              disabled={isSending || validContacts.length === 0}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-xl flex items-center justify-center gap-2 transition ${
                isSending 
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 shadow-indigo-500/25'
              }`}
            >
              {isSending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Dispatching {currentIndex} of {validContacts.length}...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Launch Campaign ({validContacts.length} Contacts)</span>
                </>
              )}
            </button>

            {/* Progress Bar */}
            {isSending && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Sending Progress</span>
                  <span>{progressPct}% ({currentIndex}/{validContacts.length})</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* TELEMETRY & LIVE DISPATCH LOGS */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 flex flex-col h-[460px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  Live Dispatch Feed
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                {sendLogs.length} events logged
              </span>
            </div>

            {/* Logs List Table */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {sendLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Mail className="w-8 h-8 stroke-1 mb-2 opacity-50" />
                  <p className="font-medium text-slate-400">No sends executed yet</p>
                  <p className="text-[11px]">Paste contacts above and click Launch to start live outreach.</p>
                </div>
              ) : (
                sendLogs.map(log => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1 transition hover:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white truncate max-w-[180px]">
                        {log.contactName || log.contactEmail}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {log.isAiVaried && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                            AI Spun
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          log.status === 'sent' 
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : log.status === 'simulated'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {log.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate max-w-[220px]">{log.contactEmail} {log.contactPhone ? `• ${log.contactPhone}` : ''}</span>
                      <span className="font-mono text-[10px] text-slate-500">{log.timestamp}</span>
                    </div>

                    {log.errorDetails && (
                      <p className="text-[10px] text-rose-400/90 font-mono mt-0.5">
                        {log.errorDetails}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Log Stats Footer */}
            {sendLogs.length > 0 && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Sent: {sendLogs.filter(l => l.status === 'sent' || l.status === 'simulated').length} / Failed: {sendLogs.filter(l => l.status === 'failed').length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const csvContent = 'data:text/csv;charset=utf-8,' + 
                      ['Email,Phone,Status,Timestamp,Error'].concat(
                        sendLogs.map(l => `"${l.contactEmail}","${l.contactPhone || ''}","${l.status}","${l.timestamp}","${l.errorDetails || ''}"`)
                      ).join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `reachflow_dispatch_${Date.now()}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            )}

          </div>

        </div>

      </main>

      {/* SINGLE TEST SEND MODAL */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-400" />
                Send Instant Test Message
              </h3>
              <button 
                onClick={() => setTestModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Verify how your message renders in your own inbox or phone before launching to recipients.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Your Test Email</label>
                <input
                  type="email"
                  value={testEmailTarget}
                  onChange={e => setTestEmailTarget(e.target.value)}
                  placeholder="your-personal-email@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {(channel === 'whatsapp' || channel === 'both') && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Your Test WhatsApp Phone</label>
                  <input
                    type="text"
                    value={testPhoneTarget}
                    onChange={e => setTestPhoneTarget(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {testResult && (
              <div className="p-3 bg-slate-950 rounded-xl text-xs font-mono text-indigo-300 border border-slate-800">
                {testResult}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testSending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {testSending ? 'Sending...' : 'Send Test Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

    </div>
  );
}
