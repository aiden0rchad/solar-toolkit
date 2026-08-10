# ☀️ SolarPro Toolkit

A browser-based suite of interactive tools for **solar + battery decisions**. Model savings, size a system, decode a utility bill, simulate blackout runtime, compare EV charging costs, and generate a printable proposal.

Everything runs **100% client-side** — no backend, no accounts, no data ever leaves your machine.

> **Free for personal, noncommercial use** — homeowners exploring solar for their own house, this is for you.
> **Using it for work (sales, consulting, any business use) requires a paid commercial license** — see [License](#license).

<!-- TODO: screenshot — docs/screenshot.png -->

## The tools

| Tool | What it's for |
|---|---|
| **Client Consult Wizard** | Guided flow for a live consultation — collects the basics and hands off to the full ROI engine ("Pro mode") when needed. |
| **ROI Calculator (Pro)** | The headline tool — 25-year month-by-month simulation of payback, bill-before vs bill-after, and lifetime savings for a **new solar + battery** system or a **battery retrofit** on existing solar (loan or PPA). |
| **Usage Estimator** | Estimate whole-home kWh usage as an input to the other tools. |
| **Appliance Auditor** | Add up future loads (EV, pool pump, HVAC…) to avoid under-sizing the system. |
| **EV Switch** | Home-charging cost/savings modeling backed by a built-in EV database with efficiency/range/battery specs by year and trim. |
| **Blackout Simulator** | "How long will my battery last in an outage?" Pick a battery, toggle the appliances running, optionally add solar recharge, and watch the hourly depletion curve. |
| **Smart Bill Decoder** | Breaks a utility bill into its parts and shows which pieces solar can eliminate — and which it can't. Sets honest expectations. |
| **Proposal Generator** | Collects exported results from every tool into a customer-facing, printable proposal. |
| **NEM Education** | Three explainer pages on NEM 1.0 / 2.0 / 3.0 net-metering policy, built for showing a customer *why* batteries matter under NEM 3.0. |

## How the modeling works

The ROI engine is not a straight-line "bill × 25 years" shortcut:

- **Seasonal solar production** — monthly production factors (PVWatts-style, ~14% system losses) for several climate profiles, with 0.5%/yr panel degradation.
- **Seasonal load shapes** — flat, summer-peak (AC), winter-peak (heat), or dual-peak households.
- **Real battery physics** — the battery only discharges what solar surplus actually stored, with round-trip efficiency losses, depth-of-discharge and reserve-SoC limits, and annual capacity degradation.
- **Time-of-use billing** — peak vs off-peak rates, low export compensation (NEM 3.0-style), non-bypassable fixed charges, and an optional off-peak → peak **arbitrage** charging strategy.
- **Honest financing** — proper amortized loan payments (PMT), existing-solar loan payoff or PPA escalators for retrofits, and break-even computed against the grid-only baseline.

Defaults are California-centric (NEM 3.0, TOU rates, CA climate profiles) but everything is editable live.

## Run it

```bash
npm install
npm run dev        # dev server with hot reload
npm run build      # production build → dist/
npm run preview    # serve the built dist/ locally
```

### Docker

Prebuilt images (amd64 + arm64) are published to GHCR on every push:

```bash
docker run -p 8080:80 ghcr.io/aiden0rchad/solar-toolkit:latest    # → http://localhost:8080
```

Or build it yourself:

```bash
docker build -t solar-toolkit .
docker run -p 8080:80 solar-toolkit
```

Multi-stage build: `node:22-alpine` compiles, `nginx:alpine` serves the static bundle on port 80.

## Tech

React 18 · Vite 5 · TailwindCSS 3 · Recharts · lucide-react — plain JSX, no TypeScript, no backend.

## License

Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md):

- ✅ **Personal / noncommercial use is free** — run it, study it, modify it for yourself.
- 💼 **Commercial use requires a paid license.** That includes using it as a tool in your job — sales presentations, consulting, lead generation, or bundling it into a product or service. [Open an issue](../../issues) to arrange a commercial license.

## Disclaimer

All numbers are **estimates for illustration and conversation**, not a quote, engineering design, or financial advice. Utility rates, incentives, and net-metering policy vary by utility and change over time — verify against your actual tariff before making decisions.
