.PHONY: setup dev dev-web dev-inference deploy-hf deploy-vercel deploy-all rollback-hf rollback-vercel clean

setup:
	@bash scripts/setup-dev.sh

dev:
	turbo dev

dev-web:
	cd web && pnpm dev

dev-inference:
	cd inference && source .venv/bin/activate && python app.py

deploy-hf:
	@bash scripts/deploy-hf.sh

deploy-vercel:
	@bash scripts/deploy-vercel.sh

deploy-all: deploy-hf deploy-vercel

rollback-hf:
	@echo "Rollback not implemented for HF Space — use git revert + redeploy"

rollback-vercel:
	@echo "Use: vercel rollback <deployment-id>"

clean:
	rm -rf web/.next web/node_modules inference/.venv node_modules