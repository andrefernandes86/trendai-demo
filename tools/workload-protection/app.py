"""
TrendAI Vision One — Server & Workload Protection (demo)

Simulates an agent-based workload protection console. Every "Trigger" button
in the UI only ever sends a bare POST with no payload; every detection runs
here, server-side, against local artifacts (a bundled EICAR file, bundled
TippingPoint IPS test pages, a local decoy file, and synthetic log lines
generated in-process). Responses only ever contain sanitized event records —
never raw file bytes, URLs, or attack-payload strings — so nothing malicious
ever reaches the browser.
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
SAMPLES_DIR = APP_DIR / "samples"
DECOY_FILE = APP_DIR / "decoy_passwd"

EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"

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
# Payload strings are matched locally and never sent to the client.
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
    {
        "id": "3990",
        "name": "HTTP: Microsoft Internet Explorer ObjectType Memory Corruption (MS03-020)",
        "sample": "ms03_020_ie_objecttype.html",
    },
    {
        "id": "3775",
        "name": "HTTP: Shell.Application ActiveX Control Execution (MS14-064)",
        "sample": "ms14_064_ole_xp.html",
    },
    {
        "id": "9893",
        "name": "HTTP: Microsoft Internet Explorer Remote Code Execution (MS09-072)",
        "sample": "ms09_072_style_object.html",
    },
    {
        "id": "23799",
        "name": "HTTP: Obfuscated HTML Usage (MS05-054)",
        "sample": "ms05_054_onload.html",
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
    """Real local signature match against the bundled EICAR test file —
    simulates an attacker using command injection to download malware
    (curl/wget http://malware.wicar.org/data/eicar.com), which the agent's
    real-time Anti-Malware scan intercepts and quarantines."""
    sample = SAMPLES_DIR / "eicar.com"
    content = sample.read_text(errors="ignore") if sample.exists() else ""
    if EICAR_SIGNATURE not in content:
        raise HTTPException(500, "Anti-malware test sample missing or invalid.")
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
    """Cycles through real TippingPoint rule IDs from the demo playbook.
    SQLi rules are confirmed via a genuine local regex match against the
    canned payload (never sent to the client); HTML-based rules are
    confirmed by verifying the bundled sample file is present and intact."""
    rule = IPS_RULES[STATE["ips_rule_index"] % len(IPS_RULES)]
    STATE["ips_rule_index"] += 1

    if "pattern" in rule:
        if not re.search(rule["pattern"], rule["payload"], re.IGNORECASE):
            raise HTTPException(500, "IPS signature self-check failed.")
        desc = f"Inbound request matched known exploit signature — {rule['name']}."
    else:
        sample = SAMPLES_DIR / rule["sample"]
        if not sample.exists() or sample.stat().st_size == 0:
            raise HTTPException(500, "IPS test sample missing or invalid.")
        desc = (
            f"HTTP file transfer matched known exploit signature — {rule['name']} "
            f"(payload delivered via simulated file upload)."
        )

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
