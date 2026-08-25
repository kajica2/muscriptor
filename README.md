# MuScriptor

Multi-platform music transcription service: audio/video → MIDI via the MuScriptor 1.3B model.

## Architecture

- **Hugging Face Space** (`kaidjuric/muscriptor-video`) — ZeroGPU inference (Gradio SDK)
- **Vercel** (`muscriptor-web`) — Next.js 15 frontend + API proxy
- **GitHub** (`kajica2/muscriptor`) — Source + CI/CD

See `muscriptor-prd-expert.md` in the PR description for the full PRD.

## Repo layout

```
muscriptor/
├── inference/         HF Space code (Gradio app.py + model)
├── web/               Next.js 15 frontend
├── shared/            Shared TypeScript types + Python utils
├── docs/              Docusaurus documentation
├── scripts/           deploy-hf.sh, deploy-vercel.sh, setup-dev.sh
├── .github/
│   ├── workflows/     ci.yml, deploy-hf.yml, deploy-vercel.yml, release.yml
│   └── actions/       setup-node, setup-python composite actions
├── Makefile           deploy-hf / deploy-vercel / deploy-all / rollback-*
├── turbo.json         monorepo orchestration
├── vercel.json        Vercel project config
└── LICENSE
```

## Quick start

```bash
make setup       # pnpm + Python venv + Vercel link + .env
make deploy-all  # push GH + HF Space + Vercel
```

## CI/CD

- `ci.yml` — PR checks: web (pnpm type-check/lint/test/build) + inference (ruff/mypy/pytest)
- `deploy-hf.yml` — push to `inference/**` → upload to HF Space
- `deploy-vercel.yml` — push to `web/**` → `vercel deploy --prod`
- `release.yml` — versioned GitHub releases

## Required secrets (GH repo settings)

- `HF_TOKEN` — Hugging Face write token
- `VERCEL_TOKEN` — Vercel deploy token
- `vars.HF_USERNAME` — `kaidjuric`

## License

MIT