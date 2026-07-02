# TrendAI Demo Platform

A self-contained, Trend Vision One–branded demo hub. It presents a single
**login-gated landing page** whose only function is to launch a set of
**demo environments**, each shipped as its own Docker container and documented
with a short "how to demo" script.

The platform is intentionally read-only: once signed in, a presenter sees the
demo shortcuts and instructions — there is no content-editing surface.

```
                         ┌──────────────────────────────┐
   browser  ───────────► │  Portal (login + hub)         │  :8088
                         │  admin/admin → forced reset    │
                         └──────────────┬─────────────────┘
                                        │  shortcut links (open in new tab)
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                ▼               ▼                ▼               ▼
  V1 File Scanner   App & File Sec   Smish Detector   AI Security stack (Health AI)
      :8081             :8000          :8443 (https)      :3003  (+ supporting services)
```

---

## Installing Docker & Docker Compose

You need **Docker Engine** and the **Compose v2 plugin (v2.20+)**. Modern Docker
ships Compose as the `docker compose` subcommand (note: the space — not the old
`docker-compose` binary). Check what you have:

```bash
docker --version
docker compose version   # must be v2.20 or newer
```

### Linux — Ubuntu / Debian (recommended for a lab VM/server)

Install Docker Engine + Compose plugin from Docker's official repository:

```bash
# 1. Remove any distro-shipped old versions
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# 2. Set up Docker's apt repository
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Install Engine, CLI, and the Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Run docker without sudo (log out/in afterwards for it to take effect)
sudo usermod -aG docker $USER

# 5. Enable + start the daemon
sudo systemctl enable --now docker
```

> **RHEL / CentOS / Rocky / Fedora:** same flow using the `yum`/`dnf` repo — see
> <https://docs.docker.com/engine/install/> and pick your distro.

### macOS

Install **Docker Desktop** (bundles Engine + Compose v2):

```bash
brew install --cask docker      # or download from docker.com
open -a Docker                  # start Docker Desktop, wait for it to say "running"
```

### Windows

Install **Docker Desktop** with the WSL 2 backend:

```powershell
winget install Docker.DockerDesktop
```

Then launch Docker Desktop and wait until it reports it's running. Run the
`docker compose` commands below from **WSL** or PowerShell.

### Verify

```bash
docker run --rm hello-world     # confirms the daemon works
docker compose version          # confirms Compose v2.20+
```

If `docker compose version` reports something older than v2.20 (common on
distro-packaged Docker), install the Compose plugin from Docker's official repo
as shown in the Linux steps above.

---

## Quick start

Requires **Docker** and **Docker Compose v2.20+** (for the `include:` directive).

```bash
git clone https://github.com/andrefernandes86/trendai-demo.git
cd trendai-demo
cp .env.example .env          # optional — sane defaults are baked in
docker compose up -d --build
```

Then open the portal:

```
http://localhost:8088
```

Log in with the default credentials **`admin` / `admin`**. On first login you are
**forced to set a new password** before the demo hub unlocks. The new password is
hashed (scrypt) and stored in the `portal_data` Docker volume, so it survives
restarts.

> **Bring up only the lightweight core** (skip the heavy multi-service AI stack):
>
> ```bash
> docker compose up -d --build portal v1fs-scanner app-sec smish
> ```

---

## What's included

| Demo | Container(s) | URL | Purpose |
|------|--------------|-----|---------|
| **Portal** | `portal` | http://localhost:8088 | Login gate + demo hub (this app) |
| **V1 File Security Scanner** | `v1fs-scanner` | http://localhost:8081 | On-demand malware scanning via the Vision One File Security SDK; PDF reports |
| **App & File Security** | `app-sec` | http://localhost:8000 | File-upload security pipeline scanning uploads through the Vision One SDK |
| **Smish Detector** | `smish` | https://localhost:8443 | Smishing (SMS phishing) awareness demo — self-signed HTTPS |
| **AI Security — Health AI Assistant** | `frontend`, `api-gateway`, `auth-service`, `ai-service`, `fitness-service`, `report-service`, `notification-service`, `security-scanner`, `database`, `redis`, `minio` | http://localhost:3003 | GenAI app protected by Vision One AI Guard (prompt-injection / unsafe content) |

Each demo's live "how to run it" script is shown directly on its card in the portal.

### Ports at a glance

| Port | Service | | Port | Service |
|------|---------|-|------|---------|
| 8088 | Portal | | 3001–3008 | AI stack microservices |
| 8081 | V1 File Scanner | | 3003 | AI stack frontend |
| 8000 | App & File Security | | 8080 | AI stack API gateway |
| 8443 | Smish Detector (https) | | 5433 / 6380 / 9002–9003 | Postgres / Redis / MinIO |

> The V1 File Scanner is published on **8081** (not its native 8080) because the
> AI-security stack's API gateway already uses 8080.

---

## Prerequisites for individual demos

Some tools need external services or keys. They still **start** without them —
the AI-driven features simply won't function until configured.

- **V1 File Security Scanner** — enter your Vision One File Security **API key +
  region** in the tool's own Settings UI (persisted to its volume).
- **App & File Security** — a Vision One File Security API key, and optionally an
  **Ollama** endpoint for AI-assisted verdicts. See `tools/app-sec-file-sec`.
- **AI Security (Health AI Assistant)** — an **Ollama** endpoint for LLM features
  and a **TMAS API key** for the security scanner. Configure in the app's
  Settings, or edit `tools/ai-security/docker-compose.yml`. This is a
  multi-container stack; allow a minute for all services to become healthy.
- **Smish Detector** — none. Serves over HTTPS with a self-signed certificate,
  so your browser will show a certificate warning (expected). Report password
  defaults to `sms` (`REPORT_PASSWORD` in `.env`).

---

## Accessing from another machine

The portal builds each demo link from **the hostname in your browser's address
bar** plus the demo's port. So if you browse the portal at `http://LAB-VM:8088`,
the demo links automatically point at `http://LAB-VM:8081`, etc. — no
configuration needed.

If you reach the platform over SSH port-forwarding, forward each demo port too
(8088, 8081, 8000, 8443, 3003, …), not just the portal port.

---

## Resetting the portal password

The password lives only in the `portal_data` volume. To return to the default
`admin / admin` (and re-trigger the forced reset):

```bash
docker compose down
docker volume rm trendai-demo_portal_data
docker compose up -d
```

---

## Repository layout

```
trendai-demo/
├── docker-compose.yml         # top-level orchestration (+ includes the AI stack)
├── .env.example
├── portal/                    # the branded login gate + demo hub (Node/Express)
│   ├── server.js              #   auth, forced password reset, static hosting
│   ├── Dockerfile
│   └── public/                #   login / change-password / dashboard + demos.js
└── tools/                     # vendored copies of each demo application
    ├── v1fs-manual-scan/      #   Trend Vision One File Security scanner (Go)
    ├── app-sec-file-sec/      #   App & File Security upload pipeline (FastAPI)
    ├── sms-dl/                #   Smish Detector (Flask, HTTPS)
    └── ai-security/           #   Health AI Assistant stack (compose included)
```

Each folder under `tools/` is a copy of its upstream repository, kept intact so
its own README and Dockerfile remain the source of truth for that tool.

---

## Notes

- **Sales enablement / demonstration use.** The Smish Detector is for security
  **awareness training in controlled environments only**.
- The portal exposes no editing capability by design — it is a presenter's
  launchpad, not an admin console.
- To customise which demos appear or their instructions, edit
  `portal/public/demos.js` and rebuild the `portal` service.
