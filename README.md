# Grid UI

The browser console for [Grid Platform](https://github.com/gridplatform) — where you review infrastructure, run releases, and watch logs.

It talks to **[grid-core](https://github.com/gridplatform/grid-core)** over the HTTP API. The UI shows state and starts actions; core (and the CLI) do the real work.

**Docs:** [grid-docs](https://gridplatform.org/doc/) · **Website:** [gridplatform.org](https://gridplatform.org)

## What you can do here

| Area | Purpose |
|------|---------|
| Deployments | Start work against a provider and resource type |
| Infrastructure | See units from your desired-state tree and their status |
| Releases | Plan / apply / destroy with live logs |
| Topology | Map-style view of providers and networks |
| Monitoring / Alerts | Metrics and alert rules (when the host monitoring plane is running) |
| Admin | Users and platform settings |

Some pages (APM, logging, extra clouds) can be hidden with **feature flags** in `src/config/featureFlags.ts`. Flags only affect the console — they do not block the API or CLI.

## Requirements

- Node.js 20+ (see `.nvmrc` if present)
- A running **grid-core** API (`VITE_GRID_API_URL` / build-time API base)

For a full product install (UI + API together), use [grid-core/install](https://github.com/gridplatform/grid-core/tree/main/install) and [grid-docs → Install](https://gridplatform.org/doc/Install/Overview).

## Development

```bash
npm install
# Point at a local core API, e.g.:
# export VITE_GRID_API_URL=http://localhost:3000/api/v1
npm run dev
```

```bash
npm run build
npm test
```

## Related repositories

| Repository | What it’s for |
|------------|---------------|
| [grid-core](https://github.com/gridplatform/grid-core) | Runs Grid and serves this console’s API |
| [grid-cli](https://github.com/gridplatform/grid-cli) | Same jobs from a terminal |
| [grid-terraform](https://github.com/gridplatform/grid-terraform) | Cloud building blocks used on apply |
| [grid-config](https://github.com/gridplatform/grid-config) | **Example** desired-state JSON (create your own for real use) |
| [grid-docs](https://gridplatform.org/doc/) | Guides |

## License

MIT — see [LICENSE](LICENSE).
