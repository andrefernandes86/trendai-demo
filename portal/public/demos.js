/**
 * Demo catalog for the TrendAI Demo Platform hub.
 *
 * Link building (see dashboard.html):
 *   - If the portal is configured with a demo base domain (PORTAL_DEMO_DOMAIN,
 *     e.g. "secnerd.io"), each card links to https://<subdomain>.<domain>/ —
 *     i.e. a single Cloudflare tunnel with one public hostname per demo.
 *   - Otherwise it falls back to the browser's hostname + the tool's published
 *     port (works on localhost, a lab VM, a server IP, or an SSH tunnel).
 *
 * `protocol` / `port` must match the host mappings in the top-level
 * docker-compose.yml; `subdomain` must match the Cloudflare Public Hostname.
 */
window.TRENDAI_DEMOS = [
  {
    id: 'v1fs',
    subdomain: 'v1fs',
    title: 'V1 File Security Scanner',
    subtitle: 'File Security · Malware Scanning',
    protocol: 'http',
    port: 8081,
    icon: 'shield',
    desc: 'On-demand malware scanning of files and folders using the Trend Vision One File Security SDK. Browse a path, scan for threats, and download a PDF report.',
    steps: [
      'Click Open to launch the scanner UI.',
      'Open Settings and enter your Vision One File Security API key and region, then save.',
      'Browse to a mounted folder (or use the bundled EICAR test sample) and start a scan.',
      'Watch detections appear in real time, then download the generated PDF report.',
      'Talking point: no files leave the customer environment — only hashes/metadata go to Vision One.',
    ],
    tags: ['Vision One', 'File Security SDK', 'EICAR'],
  },
  {
    id: 'ai-security',
    subdomain: 'ai',
    title: 'AI Security — Health AI Assistant',
    subtitle: 'AI Guard · Prompt Security',
    protocol: 'http',
    port: 3003,
    icon: 'ai',
    desc: 'A realistic GenAI application (nutrition & fitness assistant) protected by Trend Vision One AI Guard — demonstrating protection against prompt injection and unsafe LLM content.',
    steps: [
      'Click Open, then sign in to the app with admin / admin.',
      'Go to Settings → Ollama Configuration and point it at your Ollama host (e.g. http://<host>:11434); test and save.',
      'Go to Settings → AI Security and enable Vision One AI Guard with your API key.',
      'Add a meal in natural language (e.g. "I had a Big Mac") and show the AI analysis.',
      'Now attempt a prompt-injection / jailbreak prompt and show AI Guard blocking or sanitising it.',
    ],
    tags: ['Vision One AI Guard', 'Ollama', 'Prompt Injection'],
    note: 'Requires an Ollama endpoint for the AI features. This is a multi-container stack — allow a minute for all services to become healthy.',
  },
  {
    id: 'app-sec-file-sec',
    subdomain: 'appsec',
    title: 'App & File Security',
    subtitle: 'Secure Upload Pipeline',
    protocol: 'http',
    port: 8000,
    icon: 'file',
    desc: 'An application upload pipeline that scans user-submitted files through the Trend Vision One File Security SDK before they are accepted — shown via a simple API-driven web UI.',
    steps: [
      'Click Open to launch the upload UI.',
      'Upload a benign file and show the clean verdict returned by the scan.',
      'Upload the EICAR test file and show the malicious verdict blocking the upload.',
      'Expand the JSON response to show how a developer wires the verdict into an app.',
      'Talking point: shift file security left, into the application layer.',
    ],
    tags: ['Vision One', 'File Security SDK', 'API'],
    note: 'Requires a Vision One File Security API key (and optionally an Ollama endpoint for AI-assisted verdicts).',
  },
  {
    id: 'smish',
    subdomain: 'smish',
    title: 'Smish Detector',
    subtitle: 'Smishing Awareness · Education',
    protocol: 'https',
    port: 8443,
    icon: 'phone',
    desc: 'A security-awareness demonstration of SMS phishing ("smishing"): shows what data a malicious link can silently collect from a device — for training and privacy awareness only.',
    steps: [
      'Click Open (accept the self-signed certificate warning — this is expected for the demo).',
      'Share the demo link with a test device you control.',
      'Open the link on that device and let it collect the browser / device fingerprint.',
      'Return to the report view and enter the report password (default: sms) to see the captured data.',
      'Talking point: how easily a single tapped link exposes device details — reinforce user training.',
    ],
    tags: ['Awareness', 'Smishing', 'Educational Use Only'],
    note: 'Educational use only, in controlled environments. Uses HTTPS with a self-signed certificate.',
  },
];
