"""
Build-time only. Fetches known-safe, publicly documented TippingPoint IPS
signature test pages from github.com/andrefernandes86/tools-malware-samples
into the image.

This runs during `docker build` on the deploy host — never at demo runtime,
never in a developer's local session, and never in the browser. The running
container has no outbound dependency on these sources at all; every trigger
in app.py operates only on the local files fetched here.

NOTE: the EICAR test file is deliberately NOT fetched/stored here. A real
real-time anti-malware agent (e.g. Deep Security / Vision One Server &
Workload Protection) running on the BUILD host will detect and quarantine
it the moment it's written to disk — even mid-`docker build`, since that's
still a regular file write on the host filesystem as far as the agent is
concerned. The Anti-Malware trigger in app.py instead holds the EICAR bytes
XOR-encoded in the Python source and only decodes them in memory, so they
never exist as a file anywhere on disk.
"""
import os
import urllib.request

BASE = "https://raw.githubusercontent.com/andrefernandes86/tools-malware-samples/main/tippingpoint/"

FILES = {
    "ms03_020_ie_objecttype.html": "3990_ms03_020_ie_objecttype.html",
    "ms14_064_ole_xp.html": "3775_ms14_064_ole_xp.html",
    "ms09_072_style_object.html": "9893_ms09_072_style_object.html",
    "ms05_054_onload.html": "23799_ms05_054_onload.html",
}

os.makedirs("/app/samples", exist_ok=True)
for local_name, remote_name in FILES.items():
    dest = f"/app/samples/{local_name}"
    urllib.request.urlretrieve(BASE + remote_name, dest)
    size = os.path.getsize(dest)
    print(f"fetched {local_name} ({size} bytes)")
