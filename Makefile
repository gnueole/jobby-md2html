.PHONY: help setup dev docker-dev-up docker-dev-down docker-prod-up docker-prod-down n8n-backup n8n-push n8n-backup-dev n8n-push-dev n8n-deploy-error

# Default target: display help
help:
	@echo "======================================================================"
	@echo "                   🛠️  Jobby Project Makefile 🛠️"
	@echo "======================================================================"
	@echo "Configuration & Setup:"
	@echo "  make setup            - Run interactive configuration wizard"
	@echo ""
	@echo "Local Development:"
	@echo "  make dev              - Start the local lightweight node resume editor"
	@echo "  make docker-dev-up    - Start the local dev Docker containers (n8n, Gotenberg, mcp)"
	@echo "  make docker-dev-down  - Stop the local dev Docker containers"
	@echo ""
	@echo "Production Deployment:"
	@echo "  make docker-prod-up   - Start the production Docker containers (Traefik, n8n, Gotenberg)"
	@echo "  make docker-prod-down - Stop the production Docker containers"
	@echo ""
	@echo "n8n Workflow Syncing:"
	@echo "  make n8n-backup       - Backup all workflows from Production n8n to local n8n/"
	@echo "  make n8n-push         - Push/Import all local n8n/ workflows to Production n8n"
	@echo "  make n8n-backup-dev   - Backup all workflows from Local Dev n8n to local n8n/"
	@echo "  make n8n-push-dev     - Push/Import all local n8n/ workflows to Local Dev n8n"
	@echo "  make n8n-deploy-error - Deploy the Axiom error logging workflow to n8n"
	@echo "======================================================================"

# Run setup wizard
setup:
	python3 setup_wizard.py

# Local lightweight resume editor
dev:
	npm run dev

# Local Dev Docker Containers (WSL / Local Linux)
docker-dev-up:
	docker compose -f docker/dev/docker-compose.yml up -d

docker-dev-down:
	docker compose -f docker/dev/docker-compose.yml down

# Production Docker Containers (Remote / VPS)
docker-prod-up:
	docker compose -f docker/prod/docker-compose.yml up -d

docker-prod-down:
	docker compose -f docker/prod/docker-compose.yml down

# n8n Sync Commands
n8n-backup:
	python3 toolkit/sync_n8n.py --backup-all

n8n-push:
	python3 toolkit/sync_n8n.py --push-all

n8n-backup-dev:
	python3 toolkit/sync_n8n.py --backup-all --dev

n8n-push-dev:
	python3 toolkit/sync_n8n.py --push-all --dev

n8n-deploy-error:
	python3 toolkit/sync_n8n.py --deploy-error
