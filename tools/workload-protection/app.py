"""
TrendAI Vision One — Server & Workload Protection (demo)

Simulates an attacker's activity against a protected workload. Every
"Trigger" button in the UI only ever sends a bare POST with no payload;
every action below runs server-side and produces REAL, host-visible
activity — a real file write, a real outbound connection, a real network
request carrying a known exploit signature, a real log append — so that if
a genuine agent (Deep Security / Vision One Server & Workload Protection)
is protecting this host, its OWN console shows the real corresponding
detection, alongside this demo's own event feed.

Two of the five modules require one-time policy configuration in the real
console to actually register anything (see README-REAL-DETECTION.md in
this folder):
  - Integrity Monitoring only watches paths explicitly added to a rule.
  - Log Inspection only watches log files explicitly added to a rule.
Anti-Malware and Web Reputation/Intrusion Prevention are typically active
by default against broad targets, so those two "just work".

None of this ever touches the browser: the frontend only ever receives a
sanitized event record (rule name, severity, action) — never the raw
EICAR bytes, the target URL, or the exploit payload string.
"""

import hashlib
import random
import re
import socket
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse

APP_DIR = Path(__file__).parent

# Bind-mounted to a host path (see docker-compose.yml) so a real host-level
# agent can actually see these files — this is what makes Integrity
# Monitoring and Log Inspection possible to wire up for real (once the
# corresponding path is added to the agent's policy in the console).
HOST_DATA_DIR = Path("/data")
DECOY_FILE = HOST_DATA_DIR / "decoy_passwd"
AUTH_LOG_FILE = HOST_DATA_DIR / "auth.log"
EICAR_DROP_FILE = HOST_DATA_DIR / "eicar-download.com"

# The EICAR test string, XOR-encoded (key 0x5A) so no recognisable AV
# signature exists in this source file or the built image — it's decoded
# only in memory, right before being written to EICAR_DROP_FILE.
_EICAR_XOR_KEY = 0x5A
_EICAR_ENCODED = bytes([
    0x02, 0x6f, 0x15, 0x7b, 0x0a, 0x7f, 0x1a, 0x1b,
    0x0a, 0x01, 0x6e, 0x06, 0x0a, 0x00, 0x02, 0x6f,
    0x6e, 0x72, 0x0a, 0x04, 0x73, 0x6d, 0x19, 0x19,
    0x73, 0x6d, 0x27, 0x7e, 0x1f, 0x13, 0x19, 0x1b,
    0x08, 0x77, 0x09, 0x0e, 0x1b, 0x14, 0x1e, 0x1b,
    0x08, 0x1e, 0x77, 0x1b, 0x14, 0x0e, 0x13, 0x0c,
    0x13, 0x08, 0x0f, 0x09, 0x77, 0x0e, 0x1f, 0x09,
    0x0e, 0x77, 0x1c, 0x13, 0x16, 0x1f, 0x7b, 0x7e,
    0x12, 0x71, 0x12, 0x70,
])
# SHA-256 of the decoded EICAR string, used only to verify the decode is
# correct — an opaque hex digest carries no recognisable signature itself.
_EICAR_SHA256 = "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f"


def eicar_signature() -> bytes:
    content = bytes(b ^ _EICAR_XOR_KEY for b in _EICAR_ENCODED)
    if hashlib.sha256(content).hexdigest() != _EICAR_SHA256:
        raise RuntimeError("EICAR signature decode failed self-check.")
    return content


DECOY_BASELINE = (
    "root:x:0:0:root:/root:/bin/bash\n"
    "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\n"
    "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n"
)

# --- Static module + rule metadata -----------------------------------------

MODULES = {
    "anti-malware": {"name": "Anti-Malware", "icon": "shield"},
    "web-reputation": {"name": "Web Reputation", "icon": "globe"},
    "host-ips": {"name": "Intrusion Prevention (Host IPS)", "icon": "bolt"},
    "integrity-monitoring": {"name": "Integrity Monitoring", "icon": "file"},
    "log-inspection": {"name": "Log Inspection", "icon": "list"},
}

# Real TippingPoint rule IDs and SQLi payload fragments, sourced from the
# demo playbook (tools-malware-samples/tippingpoint). Each is actually sent
# over the network (to the portal container, internal to this compose
# network — harmless, it just 404s) so a real inline IPS gets a genuine
# packet to inspect.
IPS_RULES = [
    {
        "id": "5670",
        "name": "SQL Injection Attack",
        "payload": "SELECT First_Name,Last_Name FROM users WHERE ID='1' ; ",
    },
    {
        "id": "19769",
        "name": "SQL Injection Attack (UNION-based Enumeration)",
        "payload": "' union select @@version#",
    },
    {
        "id": "3593",
        "name": "SQL Injection Attack (Information Disclosure)",
        "payload": "' union all select load_file('/etc/passwd'),null #",
    },
]

# Real, public, well-known test domains used for exactly this purpose —
# genuinely reached out to over the network so a real Web Reputation /
# firewall policy has real traffic to act on.
WEB_REPUTATION_TARGETS = [
    {"domain": "malware.wicar.org", "category": "Malware", "score": 10},
    {"domain": "vxvault.net", "category": "Malicious Source / 0-day Distribution", "score": 10},
]

# --- In-memory demo state (reset on container restart — a feature: every
# fresh deploy/restart starts the demo clean) ---------------------------

STATE: dict[str, Any] = {
    "modules": {mid: {"status": "protected", "last_event": None} for mid in MODULES},
    "events": [],
    "ips_rule_index": 0,
    "log_lines": [],
}


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def reset_decoy_file() -> None:
    HOST_DATA_DIR.mkdir(parents=True, exist_ok=True)
    DECOY_FILE.write_text(DECOY_BASELINE)


def decoy_hash() -> str:
    return hashlib.sha256(DECOY_FILE.read_bytes()).hexdigest()


def add_event(module_id: str, severity: str, rule: str, description: str, action: str) -> dict:
    event = {
        "timestamp": now_iso(),
        "module": MODULES[module_id]["name"],
        "module_id": module_id,
        "severity": severity,
        "rule": rule,
        "description": description,
        "action": action,
    }
    STATE["events"].insert(0, event)
    STATE["events"] = STATE["events"][:100]
    STATE["modules"][module_id] = {"status": "alert", "last_event": event}
    return event


def reset_state() -> None:
    STATE["modules"] = {mid: {"status": "protected", "last_event": None} for mid in MODULES}
    STATE["events"] = []
    STATE["ips_rule_index"] = 0
    STATE["log_lines"] = []
    reset_decoy_file()
    try:
        EICAR_DROP_FILE.unlink(missing_ok=True)
    except OSError:
        pass
    try:
        AUTH_LOG_FILE.unlink(missing_ok=True)
    except OSError:
        pass


reset_state()

app = FastAPI()


# --- Detection logic (server-side only, real host-visible activity) --------

def trigger_anti_malware() -> dict:
    """Writes the real EICAR test file to the host-mounted /data volume,
    simulating an attacker's command-injection malware download landing on
    disk (curl/wget http://malware.wicar.org/data/eicar.com > file). If a
    real-time Anti-Malware agent is protecting this host, it will detect and
    quarantine the file within moments — check the Vision One / Deep
    Security console for the actual event. We deliberately never re-open the
    file afterward: a real agent may already be quarantining it, and
    re-reading a file mid-quarantine can itself raise a permission error."""
    try:
        EICAR_DROP_FILE.write_bytes(eicar_signature())
        outcome = f"File written to {EICAR_DROP_FILE}."
    except OSError as e:
        outcome = f"Write blocked immediately by host protection ({e})."
    return add_event(
        "anti-malware",
        severity="Critical",
        rule="Eicar_test_file",
        description=(
            "Simulated command-injection malware download (curl/wget → eicar.com). "
            f"{outcome} Check the Vision One / Deep Security console for the real "
            "Anti-Malware quarantine event on this workload."
        ),
        action="Delivered — verify in Vision One",
    )


def trigger_web_reputation() -> dict:
    """Makes a REAL outbound HTTP connection to a known-malicious-category
    test domain. If Web Reputation / firewall protection is active on this
    host, the connection will be blocked or fail — check the Vision One
    console for the real event."""
    target = random.choice(WEB_REPUTATION_TARGETS)
    url = f"http://{target['domain']}/"
    try:
        urllib.request.urlopen(url, timeout=5)
        outcome = "Connection succeeded (no outbound block observed from here)."
    except (urllib.error.URLError, socket.timeout, OSError) as e:
        outcome = f"Connection blocked/failed ({e}) — consistent with a Web Reputation block."
    return add_event(
        "web-reputation",
        severity="High",
        rule="Web Reputation Service",
        description=(
            f"Simulated outbound connection to {target['domain']} "
            f"(Category: {target['category']}). {outcome} Check the Vision One "
            "console for the real Web Reputation event on this workload."
        ),
        action="Attempted — verify in Vision One",
    )


def trigger_host_ips() -> dict:
    """Cycles through real TippingPoint SQLi rule IDs and actually sends
    each payload over the network to another container in this compose
    stack (the portal — harmless, it just 404s). If an inline Intrusion
    Prevention policy is protecting this host's network path, the request
    will be blocked or reset — check the Vision One console for the real
    event."""
    rule = IPS_RULES[STATE["ips_rule_index"] % len(IPS_RULES)]
    STATE["ips_rule_index"] += 1

    url = "http://portal:3000/?probe=" + urllib.parse.quote(rule["payload"])
    try:
        urllib.request.urlopen(url, timeout=5)
        outcome = "Request reached the target (no inline block observed from here)."
    except (urllib.error.URLError, socket.timeout, OSError) as e:
        outcome = f"Request blocked/reset ({e}) — consistent with an inline IPS block."

    return add_event(
        "host-ips",
        severity="Critical",
        rule=f"Rule {rule['id']} — {rule['name']}",
        description=(
            f"Simulated exploit request matching TippingPoint rule {rule['id']} "
            f"({rule['name']}) sent over the workload network. {outcome} Check the "
            "Vision One console for the real Intrusion Prevention event."
        ),
        action="Sent — verify in Vision One",
    )


def trigger_integrity_monitoring() -> dict:
    """Real local file hash-diff on a decoy /etc/passwd-style file living on
    the host-mounted /data volume: appends the attacker's `adduser
    CaptainCaveman` entry and detects the change via hash comparison. For
    this to also show up as a REAL event in Vision One, the path
    /data/decoy_passwd (mounted from the host — see docker-compose.yml) must
    be added to this computer's Integrity Monitoring rule list; Deep
    Security agents don't watch arbitrary paths by default."""
    baseline = decoy_hash()
    with DECOY_FILE.open("a") as f:
        f.write("captaincaveman:x:1010:1010::/home/captaincaveman:/bin/bash\n")
    changed = decoy_hash()
    if changed == baseline:
        raise HTTPException(500, "Integrity check failed to detect the change.")
    return add_event(
        "integrity-monitoring",
        severity="High",
        rule="Integrity Monitoring — Unauthorized File Change",
        description=(
            f"Unauthorized modification detected: {DECOY_FILE} — new entry added "
            "(captaincaveman) matching attacker command `adduser CaptainCaveman`. "
            "Requires this path to be added to the workload's Integrity Monitoring "
            "rule in Vision One to also register there."
        ),
        action="Alerted",
    )


def trigger_log_inspection() -> dict:
    """Real local threshold-rule match (OSSEC-style): generates synthetic
    auth-log lines for repeated failed SSH logins followed by a success from
    the same source IP, appends them to a real log file on the host-mounted
    /data volume, then counts failures in-process to confirm the
    brute-force-then-compromise pattern. For this to also show up as a REAL
    event in Vision One, a custom Log Inspection rule pointed at
    /data/auth.log (mounted from the host) must be added to this workload's
    policy — Log Inspection only watches log files explicitly configured."""
    src_ip = "203.0.113.7"
    lines = [f"sshd: Failed password for root from {src_ip} port 51322 ssh2" for _ in range(5)]
    lines.append(f"sshd: Accepted password for root from {src_ip} port 51322 ssh2")
    STATE["log_lines"].extend(lines)
    STATE["log_lines"] = STATE["log_lines"][-200:]

    try:
        with AUTH_LOG_FILE.open("a") as f:
            for line in lines:
                f.write(f"{now_iso()} {line}\n")
        write_note = f" Appended to {AUTH_LOG_FILE} for Log Inspection pickup."
    except OSError:
        write_note = " (could not write to the shared log file this time)."

    failed_count = sum(1 for l in lines if "Failed password" in l and src_ip in l)
    succeeded = any("Accepted password" in l and src_ip in l for l in lines)
    if failed_count < 5 or not succeeded:
        raise HTTPException(500, "Log inspection threshold rule failed to match.")

    return add_event(
        "log-inspection",
        severity="Medium",
        rule="Log Inspection — Multiple Failed Logins Followed by Success",
        description=(
            f"{failed_count} failed SSH login attempts from {src_ip} followed by a "
            f"successful authentication — possible brute-force compromise.{write_note} "
            "Requires a custom Log Inspection rule in Vision One pointed at this "
            "path to also register there."
        ),
        action="Alerted",
    )


TRIGGERS = {
    "anti-malware": trigger_anti_malware,
    "web-reputation": trigger_web_reputation,
    "host-ips": trigger_host_ips,
    "integrity-monitoring": trigger_integrity_monitoring,
    "log-inspection": trigger_log_inspection,
}


# --- API ---------------------------------------------------------------

@app.get("/api/state")
def get_state():
    return JSONResponse(
        {
            "modules": STATE["modules"],
            "events": STATE["events"],
        }
    )


@app.post("/api/trigger/{module_id}")
def trigger(module_id: str):
    if module_id not in TRIGGERS:
        raise HTTPException(404, "Unknown module.")
    event = TRIGGERS[module_id]()
    return JSONResponse(event)


@app.post("/api/reset")
def reset():
    reset_state()
    return JSONResponse({"ok": True})


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/")
def index():
    return FileResponse(APP_DIR / "index.html")
