# ReachFlow AI — Enterprise Bulk Email & WhatsApp Outreach Engine

A high-throughput, deliverability-first bulk email and WhatsApp outreach platform designed according to the **Cold Outreach Platform Architecture Blueprint**.

---

## 🚀 Key Features

1. **Instant Contact Ingestion & Hygiene**:
   - Paste raw emails (`john@company.com`) or full CSV rows (`email, first_name, company, phone`).
   - Drag-and-drop CSV / XLSX files.
   - Built-in verification engine: RFC 5322 syntax validation, in-memory deduplication, disposable/temporary email filtering (Mailinator, TempMail, etc.), and role mailbox blocking (`admin@`, `support@`).

2. **AI Anti-Spam & Dynamic Word Variation**:
   - **Toggle on/off**: Automatically varies phrasing, synonyms, and sentence structures for every recipient while strictly preserving your exact meaning, pitch, and links.
   - **Bayesian Deliverability Risk Audit**: Real-time 0–100 score analyzing copy for spam trigger keywords, excessive punctuation, and formatting traps before sending.
   - Powered by **Claude 3.5 Haiku & Sonnet** with offline fallback spintax.

3. **Dual-Rail Outreach Channels**:
   - **✉️ Bulk Email Rail**: Supports Google Workspace / Gmail App Passwords, Amazon SES (ap-south-1), Resend, SendGrid, and custom SMTP relays. Automatically injects RFC 8058 One-Click Unsubscribe headers.
   - **💬 Bulk WhatsApp Rail**: Integrated via Twilio WhatsApp API for direct mobile outreach.
   - **⚡ Dual Blast Mode**: Reaches recipients on both email and WhatsApp simultaneously.

4. **Humanized Safe Sending & Jitter**:
   - Configurable randomized delays (3–15 seconds) to mimic human sending and evade algorithmic spam throttling.
   - Simulation / dry-run mode enabled by default until live credentials are connected.

5. **Live Dispatch Feed & Telemetry**:
   - Real-time progress bar, live event log showing the exact varied text sent to each recipient, and single-click CSV export of send reports.

---

## 🛠️ Required API Keys & Services

| Service | Purpose | Where to Get It |
| :--- | :--- | :--- |
| **Anthropic Claude API** | Dynamic word spinning & deliverability audit | [console.anthropic.com](https://console.anthropic.com) (`ANTHROPIC_API_KEY`) |
| **Email SMTP** | Sending the bulk emails | Gmail / Google Workspace (App Password) or Amazon SES / Resend |
| **Twilio WhatsApp API** | Bulk WhatsApp outreach | [console.twilio.com](https://console.twilio.com) (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`) |

---

## 💻 Running the App

The application is already compiled and running locally:
- **Local URL**: [http://localhost:3000](http://localhost:3000)

### Manual Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
