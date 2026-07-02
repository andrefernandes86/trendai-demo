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
    title: 'V1 File Security Scanner',
    subtitle: 'File Security · Malware Scanning',
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
    id: 'app-sec-file-sec',
    path: '/appsec',
    title: 'App & File Security',
    subtitle: 'Secure Upload Pipeline',
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
