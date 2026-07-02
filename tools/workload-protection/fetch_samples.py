"""
Build-time only. Fetches known-safe, publicly documented TippingPoint/AV test
artifacts (EICAR test file + classic IPS signature test pages) from
github.com/andrefernandes86/tools-malware-samples into the image.

This runs during `docker build` on the deploy host — never at demo runtime,
never in a developer's local session, and never in the browser. The running
container has no outbound dependency on these sources at all; every trigger
in app.py operates only on the local files fetched here.
"""
import os
import urllib.request

BASE = "https://raw.githubusercontent.com/andrefernandes86/tools-malware-samples/main/tippingpoint/"

FILES = {
    "eicar.com": "16893_eicar.com",
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
