# TrendAI Agentic SIEM Sizing Calculator

A web-based sizing wizard for calculating annual credit requirements for **Trend Micro Vision One — Agentic SIEM**. Packaged as a single-file SPA served by an nginx Docker container.

---

## Features

- **6-phase wizard** walks through every billable component
- **Live totals sidebar** updates credits in real time as you type
- **Year-by-year breakdown** for multi-year deals (1–7 years)
- **Detailed report** showing all inputs, formulas, and credit calculations
- **PDF export** opens a clean, print-ready document in a new tab
- Based on the **TrendAI Standard Published Price List (2026-06-01)**

---

## Wizard Phases

| Phase | Section | What you configure |
|-------|---------|--------------------|
| 1 | License Details | License period (1–7 years) |
| 2 | 3rd-Party Log Ingestion | Analytic GB/day, existing GB stored, retention period; Archival GB/day, existing GB, retention period |
| 3 | TrendAI Endpoint & Cloud | Unit counts per product, existing data stored, analytic & archival retention |
| 4 | TrendAI Email and Network | Unit counts per product, existing data stored, analytic & archival retention |
| 5 | TrendAI CREM Risk Events | Unit counts (endpoints / cloud assets), existing data, archival retention |
| 6 | Results & Summary | Grand total, year-by-year table, assumptions, full credit breakdown, PDF export |

---

## Credit Rate Reference

All rates are from the TrendAI Standard Published Price List (2026-06-01).

### 3rd-Party Log Ingestion

| Tier | Rate |
|------|------|
| Analytic log ingestion | 3 credits / GB ingested |
| Analytic data retention | 0.2 credits / GB / month (1 month included) |
| Archival log ingestion | 1 credit / GB ingested |
| Archival data retention | 0.05 credits / GB / month (1 month included) |

### TrendAI Endpoint & Cloud

| Product | Unit | GB / unit / day |
|---------|------|----------------|
| XDR for Endpoints / Endpoint Sensor | endpoint | 0.075 |
| V1 Endpoint Security Core | endpoint | 0.006 |
| V1 Endpoint Security Essentials | endpoint | 0.061 |
| V1 Endpoint Security Pro | endpoint | 0.162 |
| V1 Container Security | node | 0.2027 |
| V1 Container Security (Custom Rule Detection) | GB | 30 |
| XDR for Cloud (CloudTrail / VPC / Security Lake) | GB | direct input |
| Virtual Network Sensor | 500 Mbps | 1.6 |
| TippingPoint with Virtual Network Sensor | 500 Mbps | 1.6 |

Retention: **0.2 credits / GB / month** · 1 month analytic included · archival available for 2026 deals

### TrendAI Email and Network

| Product | Unit | GB / unit / day |
|---------|------|----------------|
| Cloud Email Gateway | mailbox | 0.002 |
| Cloud App Security | mailbox | 0.002 |
| Email Sensor | mailbox | 0.00002 |
| DDI (without Network Sensor) | 500 Mbps | 0.1 |
| DDI (with Network Sensor) | 500 Mbps | 5.15 |

Retention: **0.2 credits / GB / month** · 180 days (6 months) analytic included

### TrendAI CREM Risk Events

| Product | Unit | GB / unit / day |
|---------|------|----------------|
| CREM — per endpoint | endpoint | 0.0001 |
| CREM — per 500 cloud assets | 500 cloud assets | 0.02 |

Retention: **0.05 credits / GB / month** · 30 days archival included

---

## Credit Formulas

```
Log Ingestion Credits  = dailyGB × 365 × ratePerGB

Retention Credits      = (dailyGB × 30 × additionalMonths + existingGB) × ratePerGBMonth × 12
                         where additionalMonths = max(0, selectedMonths − includedMonths)
                         returns 0 if additionalMonths = 0
```

> **Existing data** figures are available in the Vision One console under  
> **Agentic SIEM and XDR → Data Source and Log Management**

---

## Deployment

### Requirements

- Docker

### Quick start

```bash
docker build -t siem-calc .
docker run -d --name siem-calc -p 80:80 siem-calc
```

Open `http://localhost` in your browser.

### Custom port

```bash
docker run -d --name siem-calc -p 8888:80 siem-calc
```

### Production hosts

| Host | Port | URL |
|------|------|-----|
| 192.168.1.252 | 80 | http://192.168.1.252 |
| 192.168.40.100 | 8888 | http://192.168.40.100:8888 |

---

## Project Structure

```
.
├── index.html   # Single-file SPA — all HTML, CSS, and JS
└── Dockerfile   # nginx:alpine container, serves index.html on port 80
```

The entire application lives in `index.html`. No build step, no dependencies, no external CDN calls — everything is self-contained and works offline.

---

## PDF Export

Click **Export PDF** on the Results page. A new tab opens with a formatted document containing:

- TrendAI branded header with generation date
- Annual credits summary
- Year-by-year credit breakdown table
- Assumptions & inputs summary
- Full detailed credit breakdown with formulas

The browser print dialog opens automatically — choose **Save as PDF** to export.

---

## License

Internal use — Trend Micro confidential.
