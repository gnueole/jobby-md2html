# ==============================================================================
# 🛠️ JOBBY — RESUME EDITOR & PIPELINES
# ==============================================================================
# Description : Local development management and automated VPS deployment.
# Read version from package.json dynamically as single source of truth
VERSION       := $(shell node -e "console.log(require('./package.json').version)")
# Version     : $(VERSION)
# Author      : Éole <hi@eole.me>
# License     : MIT
# ==============================================================================

# ⚙️ INFRASTRUCTURE VARIABLES (SECURED)
VPS_SSH              := eole.me
VPS_PROJECT_NAME     := $(shell git config --get remote.origin.url | sed 's/.*\///; s/\.git$$//')
VPS_PROJECT_TAG      := $(shell git rev-parse --short HEAD)
VPS_PATH             := /home/eole/projects/$(VPS_PROJECT_NAME)

PROJECT_NAME         := $(shell echo $(VPS_PROJECT_NAME) | cut -d'-' -f1 | sed 's/./\u&/')

# 🔑 SECRETS MANAGEMENT (DOPPLER)
DOPPLER_PROJECT     := eole-me
DOPPLER_CONFIG_DEV  := dev
DOPPLER_CONFIG_PROD := prd_$(DOPPLER_PROJECT)-$(shell echo $(PROJECT_NAME) | tr '[:upper:]' '[:lower:]')



# Find doppler binary (robust check for WSL non-interactive paths)
DOPPLER := $(shell which doppler 2>/dev/null || ( [ -f $(HOME)/bin/doppler ] && echo $(HOME)/bin/doppler ) || echo doppler)

# 🛠️ LOCAL DOCKER CONFIGURATION
DOCKER_DIR   := docker
COMPOSE_DEV  := $(DOCKER_DIR)/docker-compose.yml
COMPOSE_PROD := $(DOCKER_DIR)/docker-compose.prod.yml

.PHONY: help configure dev dev-up dev-down up down restart deploy deploy-infra deploy-all _deploy deploy-delay checklogs check-build n8n-backup n8n-push n8n-backup-dev n8n-push-dev n8n-deploy-error

# Default target
help:
	@echo "======================================================================"
	@echo "                   🛠️  $(PROJECT_NAME) Project Makefile 🛠️"
	@echo "======================================================================"
	@echo "Configuration & Setup:"
	@echo "  make configure        - Run system configuration and env setup"
	@echo ""
	@echo "Local Development:"
	@echo "  make dev              - Start local Node resume editor (loads/downloads .env)"
	@echo "  make up               - Start local dev Docker containers (HMR resume, n8n, gotenberg)"
	@echo "  make down             - Stop local dev Docker containers"
	@echo "  make restart          - Restart local dev Docker containers"
	@echo ""
	@echo "Production Deployment (VPS - cv.eole.me):"
	@echo "  make deploy           - Push production compose & pull only custom editor/vector images"
	@echo "  make deploy-infra     - Push production compose & pull only infra images (n8n, gotenberg, etc.)"
	@echo "  make deploy-all       - Push production compose & pull/recreate all images"
	@echo "  make deploy-delay     - Wait 150s for GitHub Actions and then deploy"
	@echo "  make checklogs        - Fetch real-time production logs from VPS"
	@echo "  make check-build      - Query GitHub Actions workflow run status for latest main commit"
	@echo ""
	@echo "n8n Workflow Syncing (Doppler aware):"
	@echo "  make n8n-backup       - Backup all workflows from Production n8n to local n8n/"
	@echo "  make n8n-push         - Push/Import all local n8n/ workflows to Production n8n"
	@echo "  make n8n-backup-dev   - Backup all workflows from Local Dev n8n to local n8n/"
	@echo "  make n8n-push-dev     - Push/Import all local n8n/ workflows to Local Dev n8n"
	@echo "  make n8n-deploy-error - Deploy the Axiom error logging workflow to n8n"
	@echo "======================================================================"

# Run configure wizard (checks dependencies and copies fallback env)
configure:
	@bash configure

# Local Node resume editor
dev:
	@if [ ! -f .env ]; then \
		if $(DOPPLER) --version >/dev/null 2>&1; then \
			echo "🔑 Downloading development secrets from Doppler ($(DOPPLER_PROJECT))..."; \
			$(DOPPLER) secrets download --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_DEV) --no-file --format env > .env; \
		else \
			echo "⚠️ Doppler CLI not found. Copying $(DOCKER_DIR)/.env.example as .env fallback..."; \
			cp $(DOCKER_DIR)/.env.example .env; \
		fi \
	fi
	npm run dev

# 💻 DEVELOPMENT COMMANDS (LOCAL DOCKER)
dev-up:
	@echo "✨ Starting local development environment..."
	@if [ ! -f .env ]; then \
		if $(DOPPLER) --version >/dev/null 2>&1; then \
			echo "🔑 Téléchargement des secrets de dev depuis Doppler..."; \
			$(DOPPLER) secrets download --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_DEV) --no-file --format env > .env; \
		else \
			echo "⚠️ Doppler non trouvé. Copie de docker/.env.example comme .env..."; \
			cp docker/.env.example .env; \
		fi \
	fi
	docker compose -f $(COMPOSE_DEV) --env-file .env up -d
	@PORT_RESOLVED=$$(node -e "const fs = require('fs'); let p = '3010'; try { p = fs.readFileSync('.env', 'utf8').split('\n').find(l => l.startsWith('PORT=')).split('=')[1].replace(/['\r\u0022]/g, ''); } catch(e){} console.log(p.trim());"); \
	echo "🚀 $(PROJECT_NAME) ($(VERSION) / $(VPS_PROJECT_TAG)) is ready locally! (http://localhost:$$PORT_RESOLVED)"

dev-down:
	@echo "🛑 Stopping local development containers..."
	@if [ -f .env ]; then \
		docker compose -f $(COMPOSE_DEV) --env-file .env down; \
	else \
		docker compose -f $(COMPOSE_DEV) down; \
	fi

up: dev-up
down: dev-down
restart: down up

# 🚀 AUTOMATED DEPLOYMENT PIPELINE (VPS)
deploy:
	@$(MAKE) --no-print-directory _deploy SERVICES="jobby-editor"

deploy-infra:
	@$(MAKE) --no-print-directory _deploy SERVICES="traefik mcp-notion gotenberg n8n vector"

deploy-all:
	@$(MAKE) --no-print-directory _deploy SERVICES=""

_deploy:
	@echo "🚀 Deploying $(PROJECT_NAME) stack [$(VERSION)/$(VPS_PROJECT_TAG)] to VPS '$(VPS_SSH)' on '$(VPS_PATH)'..."
# 1. Ensure the remote deployment directory exists
	ssh $(VPS_SSH) "mkdir -p $(VPS_PATH)"
# 2. SCP the production compose file
	scp $(COMPOSE_PROD) $(VPS_SSH):$(VPS_PATH)/docker-compose.prod.yml
# 3. Stream production secrets from Doppler to remote VPS .env
	@if $(DOPPLER) --version >/dev/null 2>&1; then \
		echo "🔑 Envoi des secrets de production Doppler vers le VPS..."; \
		if $(DOPPLER) secrets download --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_PROD) --no-file --format env > docker/.env.prod.temp; then \
			scp docker/.env.prod.temp $(VPS_SSH):$(VPS_PATH)/.env; \
			rm -f docker/.env.prod.temp; \
		else \
			echo "❌ Error: Doppler secrets download failed for project $(DOPPLER_PROJECT) (config: $(DOPPLER_CONFIG_PROD))!"; \
			rm -f docker/.env.prod.temp; \
			exit 1; \
		fi; \
	else \
		echo "❌ Error: Doppler CLI is not installed or not found in PATH!"; \
		exit 1; \
	fi
# 4. Pull and recreate
	@if [ "$(SERVICES)" = "" ]; then \
		echo "📥 Pulling all images from GHCR & Docker Hub..."; \
		ssh $(VPS_SSH) "cd $(VPS_PATH) && docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d --remove-orphans"; \
	else \
		echo "📥 Pulling specified images ($(SERVICES))..."; \
		ssh $(VPS_SSH) "cd $(VPS_PATH) && docker compose -f docker-compose.prod.yml pull $(SERVICES) && docker compose -f docker-compose.prod.yml up -d --remove-orphans"; \
	fi
	@echo "✅ Deployment of $(PROJECT_NAME) [$(VERSION) / $(VPS_PROJECT_TAG)] successfully completed on production server !"

check-logs:
	@echo "📟 Fetching real-time production logs from VPS [$(VPS_SSH)]..."
	ssh $(VPS_SSH) "cd $(VPS_PATH) && docker compose -f docker-compose.prod.yml logs -f"

check-build:
	@python3 toolkit/check_build.py

deploy-delay:
	@echo "⏳ Waiting 150 seconds for GitHub Actions build to complete..."
	git push && sleep 150 && $(MAKE) --no-print-directory deploy

# 🔄 N8N SYNC COMMANDS (DOPPLER ENHANCED)
n8n-backup:
	@if $(DOPPLER) --version >/dev/null 2>&1; then \
		echo "🔑 Streaming production secrets via Doppler to python sync tool..."; \
		$(DOPPLER) run --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_PROD) -- python3 toolkit/sync_n8n.py --backup-all; \
	else \
		python3 toolkit/sync_n8n.py --backup-all; \
	fi

n8n-push:
	@if $(DOPPLER) --version >/dev/null 2>&1; then \
		echo "🔑 Streaming production secrets via Doppler to python sync tool..."; \
		$(DOPPLER) run --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_PROD) -- python3 toolkit/sync_n8n.py --push-all; \
	else \
		python3 toolkit/sync_n8n.py --push-all; \
	fi

n8n-backup-dev:
	@if $(DOPPLER) --version >/dev/null 2>&1; then \
		echo "🔑 Streaming development secrets via Doppler to python sync tool..."; \
		$(DOPPLER) run --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_DEV) -- python3 toolkit/sync_n8n.py --backup-all --dev; \
	else \
		python3 toolkit/sync_n8n.py --backup-all --dev; \
	fi

n8n-push-dev:
	@if $(DOPPLER) --version >/dev/null 2>&1; then \
		echo "🔑 Streaming development secrets via Doppler to python sync tool..."; \
		$(DOPPLER) run --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_DEV) -- python3 toolkit/sync_n8n.py --push-all --dev; \
	else \
		python3 toolkit/sync_n8n.py --push-all --dev; \
	fi

n8n-deploy-error:
	@if $(DOPPLER) --version >/dev/null 2>&1; then \
		echo "🔑 Streaming production secrets via Doppler to python sync tool..."; \
		$(DOPPLER) run --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_PROD) -- python3 toolkit/sync_n8n.py --deploy-error; \
	else \
		python3 toolkit/sync_n8n.py --deploy-error; \
	fi
