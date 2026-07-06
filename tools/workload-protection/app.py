"""
TrendAI Vision One — Server & Workload Protection (demo)

Simulates an agent-based workload protection console. Every "Trigger" button
in the UI only ever sends a bare POST with no payload; every detection runs
here, server-side, against artifacts held entirely in memory or in a local
decoy file (never a real test-malware/exploit sample on disk — see the
comment on eicar_signature() below for why). Responses only ever contain
sanitized event records — never raw file bytes, URLs, or attack-payload
strings — so nothing malicious ever reaches the browser.
"""

import hashlib
import random
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse

APP_DIR = Path(__file__).parent
DECOY_FILE = APP_DIR / "decoy_passwd"

# The EICAR test string, XOR-encoded (key 0x5A) so no recognisable AV
# signature exists in this source file or the built image. Decoded only in
# memory, at the moment of use — never written to disk anywhere, at build
# time or runtime. A real real-time anti-malware agent on the host (e.g.
# Deep Security / Vision One Server & Workload Protection) would otherwise
# detect and quarantine the file the instant it touched the filesystem, even
# mid-`docker build`, since that's still a regular file write as far as the
# agent is concerned.
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
    return bytes(b ^ _EICAR_XOR_KEY for b in _EICAR_ENCODED)

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

# Real TippingPoint / Deep Security-style rule IDs and payload fragments,
# sourced from the same demo playbook (tools-malware-samples/tippingpoint).
# Payload strings are matched locally, entirely in memory, and never sent to
# the client. (The playbook's 4 file-based browser-RCE PoCs — MS03-020,
# MS14-064, MS09-072, MS05-054 — are deliberately not used here: like EICAR,
# they are known exploit-signature test artifacts that a real real-time
# Anti-Malware/IPS agent on the host will detect and quarantine the moment
# they touch disk, build time or not. Sticking to in-memory string matches
# keeps every module 100% disk-independent.)
IPS_RULES = [
    {
        "id": "5670",
        "name": "SQL Injection Attack",
        "payload": "SELECT First_Name,Last_Name FROM users WHERE ID='1' ; ",
        "pattern": r"select .* from .* where",
    },
    {
        "id": "19769",
        "name": "SQL Injection Attack (UNION-based Enumeration)",
        "payload": "' union select @@version#",
        "pattern": r"union select",
    },
    {
        "id": "3593",
        "name": "SQL Injection Attack (Information Disclosure)",
        "payload": "' union all select load_file('/etc/passwd'),null #",
        "pattern": r"load_file\(",
    },
]

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


reset_state()

app = FastAPI()


# --- Detection logic (server-side only) -------------------------------------

def trigger_anti_malware() -> dict:
    """Real local signature match against the EICAR test string — simulates
    an attacker using command injection to download malware (curl/wget
    http://malware.wicar.org/data/eicar.com), which the agent's real-time
    Anti-Malware scan intercepts and quarantines. The signature is decoded
    and matched entirely in memory (see eicar_signature()) — it is never
    written to disk, so it can't be pre-empted by a real anti-malware agent
    watching the host filesystem. Verified via SHA-256 rather than a
    substring match so no recognisable EICAR text ever appears in this
    source file either."""
    content = eicar_signature()
    if hashlib.sha256(content).hexdigest() != _EICAR_SHA256:
        raise HTTPException(500, "Anti-malware signature check failed.")
    return add_event(
        "anti-malware",
        severity="Critical",
        rule="Eicar_test_file",
        description=(
            "Real-time scan detected Eicar_test_file during a simulated "
            "command-injection malware download (curl/wget → eicar.com)."
        ),
        action="Quarantined",
    )


def trigger_web_reputation() -> dict:
    """Local blocklist lookup — simulates the agent blocking an outbound
    connection to a known-malicious host before any data is exchanged."""
    target = random.choice(WEB_REPUTATION_TARGETS)
    return add_event(
        "web-reputation",
        severity="High",
        rule="Web Reputation Service",
        description=(
            f"Outbound connection to {target['domain']} blocked — "
            f"Category: {target['category']}, Reputation Score: {target['score']}/100."
        ),
        action="Blocked",
    )


def trigger_host_ips() -> dict:
    """Cycles through real TippingPoint SQLi rule IDs from the demo playbook.
    Each is confirmed via a genuine local regex match against its canned
    payload string — entirely in memory, never written to disk, never sent
    to the client."""
    rule = IPS_RULES[STATE["ips_rule_index"] % len(IPS_RULES)]
    STATE["ips_rule_index"] += 1

    if not re.search(rule["pattern"], rule["payload"], re.IGNORECASE):
        raise HTTPException(500, "IPS signature self-check failed.")
    desc = f"Inbound request matched known exploit signature — {rule['name']}."

    return add_event(
        "host-ips",
        severity="Critical",
        rule=f"Rule {rule['id']} — {rule['name']}",
        description=desc,
        action="Blocked",
    )


def trigger_integrity_monitoring() -> dict:
    """Real local file hash-diff: actually appends a decoy user entry (the
    attacker's `adduser CaptainCaveman` from the exploit chain) to a local
    decoy /etc/passwd-style file and detects the change via hash comparison."""
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
            "Unauthorized modification detected: /etc/passwd — new entry added "
            "(captaincaveman) matching attacker command `adduser CaptainCaveman`."
        ),
        action="Alerted",
    )


def trigger_log_inspection() -> dict:
    """Real local threshold-rule match (OSSEC-style): generates synthetic
    auth.log lines for repeated failed SSH logins followed by a success from
    the same source IP, then counts failures in-process to confirm the
    brute-force-then-compromise pattern before raising the event."""
    src_ip = "203.0.113.7"
    lines = [f"sshd: Failed password for root from {src_ip} port 51322 ssh2" for _ in range(5)]
    lines.append(f"sshd: Accepted password for root from {src_ip} port 51322 ssh2")
    STATE["log_lines"].extend(lines)
    STATE["log_lines"] = STATE["log_lines"][-200:]

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
            "successful authentication — possible brute-force compromise."
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
