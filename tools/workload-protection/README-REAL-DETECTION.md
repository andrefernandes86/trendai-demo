# Making this demo show up in the real Vision One / Deep Security console

This demo's own UI always shows a local event when you click a trigger. If
this host also runs a real Deep Security / Vision One Server & Workload
Protection agent, the following describes what — if anything — you need to
configure so the **real product's console** shows the matching detection
too.

Every module performs genuine, host-visible activity: a real file write, a
real outbound network connection, or a real network request carrying a
known exploit signature. Nothing is sent to the browser except a sanitized
event record.

## Works with no extra configuration

- **Anti-Malware** — writes a real EICAR test file to `/data/eicar-download.com`
  (bind-mounted from the host at `/opt/workload-demo`). Real-time Anti-Malware
  scanning is typically on by default against the whole filesystem, so this
  should register immediately.
- **Web Reputation** — makes a real outbound connection to Trend Micro's own
  Web Reputation Service test domains, rotated through in order:
  `wrs49` (Dangerous) → `wrs65` (Highly Suspicious) → `wrs70` (Suspicious) →
  `wrs71` (Unrated) → `wrs81` (Normal), all under `.winshipway.com`. Web
  Reputation / firewall policies are typically active by default, so
  anything but the Normal-rated domain should register immediately.
- **Intrusion Prevention (Host IPS)** — sends a real HTTP request to the
  portal container over this compose network, cycling through 7 real
  TippingPoint rule IDs: 3 SQL-injection rules (5670, 19769, 3593, sent as a
  query string) and 4 browser-RCE PoCs (3990, 3775, 9893, 23799 — MS03-020 /
  MS14-064 / MS09-072 / MS05-054, fetched from GitHub straight into memory
  and relayed as the request body — never written to disk). Requires the
  agent's network/IPS driver to actually be inline on the interface this
  traffic crosses (the Docker bridge network) — check the console if
  nothing shows.

## Requires one-time policy configuration

Deep Security / Vision One agents don't watch arbitrary paths for these two
modules — you have to tell them what to watch.

### Integrity Monitoring

1. In the console, open this computer's policy → **Integrity Monitoring →
   Rules**.
2. Add a rule (or a Directory/File rule) covering: `/opt/workload-demo/decoy_passwd`
3. Save and apply the policy (or wait for the next heartbeat).
4. Click **Integrity Monitoring → Simulate unauthorized file change** in the
   demo — the agent should flag the change on the next scan interval.

### Log Inspection

1. In the console, open this computer's policy → **Log Inspection → Rules**.
2. Add a custom Log Inspection rule (or use a generic Unix/SSHD template)
   pointed at: `/opt/workload-demo/auth.log`
3. Save and apply the policy.
4. Click **Log Inspection → Simulate suspicious log activity** in the demo —
   the agent's log analysis engine should pick up the appended lines on its
   next pass.

## Where the host path actually is

`docker-compose.yml` bind-mounts `/opt/workload-demo` (a real directory on
the host) to `/data` inside the container — this is deliberately a plain
host path (not an opaque named-volume path under `/var/lib/docker/volumes/`)
so it's easy to reference directly when configuring policy rules.
