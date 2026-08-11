# SolarPro Toolkit

**Honest solar, battery, and EV math — free, in your browser.**

### ▶ [Open the app](https://aiden0rchad.github.io/solar-toolkit/) — no signup, no tracking, nothing leaves your machine.

[![SolarPro Toolkit](docs/media/landing.png)](https://aiden0rchad.github.io/solar-toolkit/)

Start with your question:

- **[Is solar worth it for me?](https://aiden0rchad.github.io/solar-toolkit/#/simple-roi)** — enter a monthly bill, get payback and 25-year savings with every assumption inspectable.
- **[Will a battery keep my lights on?](https://aiden0rchad.github.io/solar-toolkit/#/blackout)** — pick what needs to run in an outage and see how long it runs.
- **[Should I switch to an EV?](https://aiden0rchad.github.io/solar-toolkit/#/ev)** — real monthly and 5-year cost against your current car.

## Why this calculator doesn't lie to you

Most solar calculators are lead-generation for installers. This one is built to answer the question, including when the answer is "no":

- **No dead tax credits.** The 30% US federal residential credit (IRC 25D) ended for systems installed after Dec 31, 2025. Many calculators still bake it in; here incentives default to **$0** and you enter only programs you've actually confirmed.
- **Winter is the test.** Production is modeled monthly (PVWatts-style factors, ~14% system losses, 0.5%/yr panel degradation) — a Central Valley December produces less than a third of July, and the numbers show it.
- **Real battery physics.** The battery only discharges what solar surplus actually stored, after round-trip losses, depth-of-discharge and reserve limits, and annual degradation. No free energy.
- **Honest billing.** Time-of-use peak/off-peak rates, NEM 3.0-style low export credit, fixed charges solar can't remove, proper amortized loan payments.
- **Every assumption is disclosed.** Each result ships with an expandable "assumptions behind these numbers" panel — rates, escalation, degradation, export credit — plus the estimate disclaimer.

Defaults are California-centric (TOU rates, NEM 3.0, CA climate profiles), and everything is editable live.

## The free tools

| Tool | What it answers |
|---|---|
| **Solar Savings (Simple)** | Bill in, payback out — a thin wrapper over the same engine as the Pro calculator, never a dumber one. |
| **Blackout Simulator** | How long a battery actually runs your fridge, Wi-Fi, CPAP… |
| **EV Switch** | EV vs. your current car, with a built-in vehicle database. |
| **Usage Estimator** | Whole-home kWh estimate when you don't have a bill handy. |
| **Appliance Auditor** | Add up future loads (EV, pool pump, HVAC…) before sizing anything. |
| **Smart Bill Decoder** | Which parts of your bill solar removes — and which it can't. |
| **NEM 1.0 / 2.0 / 3.0 explainers** | Why batteries matter under NEM 3.0. |

<a id="pro"></a>

## SolarPro Pro — for consultants

The consultation workflow is a paid tier: the **Client Consult Wizard** (guided six-step flow you run live with a client), the **full-control ROI Calculator** (retrofit-over-loan/PPA modeling, full rate control, battery dispatch strategy with depth-of-discharge, reserve, round-trip and degradation controls), and the **Proposal Generator** (branded printable client proposals with impact figures derived from the modeled system, plus every tool's "Export to Proposal").

Licensing is being set up now — **watch or star the repo** and the purchase link will appear here. A Pro subscription doubles as the commercial-use license this repo's [license](#license) requires.

## Self-host

Prebuilt images (amd64 + arm64) publish to GHCR on every push:

```bash
docker run -p 8080:80 ghcr.io/aiden0rchad/solar-toolkit:latest    # → http://localhost:8080
```

Or build it yourself: `docker build -t solar-toolkit . && docker run -p 8080:80 solar-toolkit` — `node:22-alpine` compiles, `nginx:alpine` serves the static bundle.

The app makes **zero external requests** (fonts are self-hosted), so it runs fully offline once loaded.

## Development

```bash
npm install
npm run dev        # dev server
npm test           # engine test suite (Vitest)
npm run build      # production build → dist/
```

React 18 · Vite 5 · Tailwind 3 · Recharts · lucide-react — plain JSX, no TypeScript, no backend. The ROI engine is pure functions in `src/engine/`; tools register in `src/tools/registry.jsx`.

## License

[PolyForm Noncommercial 1.0.0](LICENSE.md):

- ✅ **Personal, noncommercial use is free** — run it, study it, modify it for your own house.
- 💼 **Any business use requires a commercial license** — sales, consulting, lead generation, bundling. That's what [SolarPro Pro](#pro) is.

## Disclaimer

All outputs are **estimates for orientation and conversation** — not a quote, engineering design, or financial advice. Rates, incentives, and net-metering policy vary by utility and change over time; verify against your actual tariff before signing anything.
