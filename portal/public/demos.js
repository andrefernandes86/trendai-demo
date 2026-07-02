/**
 * Demo catalog for the TrendAI Demo Platform hub.
 *
 * Every demo is served on the SAME origin as the portal, under its `path`
 * (e.g. https://trendai.secnerd.io/v1fs). The portal reverse-proxies each path
 * to the demo container and requires a valid login session first, so a single
 * Cloudflare hostname fronts everything and nothing is reachable unauthenticated.
 *
 * `path` must match a demo prefix registered in portal/server.js (DEMOS).
 */
window.TRENDAI_DEMOS = [
  {
    id: 'v1fs',
    path: '/v1fs',
    title: 'TrendAI Vision One File Security',
    subtitle: 'Use Case · Scan File Servers with the SDK',
    icon: 'shield',
    desc: 'Use case: scan on-premises file servers and network shares for malware with the TrendAI Vision One File Security SDK. Point it at a mounted share, run an on-demand scan, and download a PDF report of any detections.',
    steps: [
      'Click Open to launch the TrendAI Vision One File Security scanner.',
      'Open Settings and enter your TrendAI Vision One File Security API key and region, then save.',
      'Browse to a mounted file-server path / network share (or the bundled EICAR test sample) and start a scan.',
      'Watch detections stream in, then download the PDF report for that file server.',
      'Talking point: scan file servers at scale via the SDK — only file hashes/metadata leave the environment, never the files themselves.',
    ],
    tags: ['TrendAI Vision One', 'File Security SDK', 'File Servers'],
  },
  {
    id: 'app-sec-file-sec',
    path: '/appsec',
    title: 'TrendAI Vision One AI Guard & File Security',
    subtitle: 'Use Case · Securing an AI Chatbot with File Uploads',
    icon: 'file',
    desc: 'Use case: an AI chatbot that lets users chat and upload files. Two TrendAI Vision One modules protect it — AI Guard inspects every prompt for injection/abuse, and File Security scans every uploaded file for malware before it is accepted.',
    steps: [
      'Click Open to launch the AI chatbot. Ollama is bundled and pre-selected (http://ollama:11434).',
      'In Settings, enter your TrendAI Vision One API keys for AI Guard and File Security, then save.',
      'Chat normally to show the assistant responding via the local model.',
      'Click "Test Injection" (or type a jailbreak/prompt-injection) — AI Guard flags and blocks the malicious prompt.',
      'Upload a benign file (clean) then the EICAR sample — File Security detects and blocks the malicious upload.',
      'Talking point: one platform guards both the prompt layer and the file layer of a GenAI app.',
    ],
    tags: ['AI Guard', 'File Security SDK', 'Prompt Injection'],
    note: 'Bundled Ollama (gemma2:2b, CPU) is pre-wired at http://ollama:11434. Enter your TrendAI Vision One API keys for AI Guard and File Security in Settings to enable detection.',
  },
  {
    id: 'smish',
    path: '/smish',
    title: 'Smish Detector',
    subtitle: 'Smishing Awareness · Education',
    icon: 'phone',
    desc: 'A security-awareness demonstration of SMS phishing ("smishing"): shows what data a malicious link can silently collect from a device — for training and privacy awareness only.',
    steps: [
      'Click Open to launch the smishing landing page.',
      'Share the demo link with a test device you control.',
      'Open the link on that device and let it collect the browser / device fingerprint.',
      'Go to the Report view and enter the report password (default: sms) to see the captured data.',
      'Talking point: how easily a single tapped link exposes device details — reinforce user training.',
    ],
    tags: ['Awareness', 'Smishing', 'Educational Use Only'],
    note: 'Educational use only, in controlled environments.',
  },
];
