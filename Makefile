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
VPS_SSH  := eole.me
VPS_PATH := /home/eole/projects/jobby-md2html

# 🔑 SECRETS MANAGEMENT (DOPPLER)
DOPPLER_PROJECT     := jobby
DOPPLER_CONFIG_DEV  := dev
DOPPLER_CONFIG_PROD := prd



# Find doppler binary (robust check for WSL non-interactive paths)
DOPPLER := $(shell which doppler 2>/dev/null || ( [ -f $(HOME)/bin/doppler ] && echo $(HOME)/bin/doppler ) || echo doppler)

# 🛠️ LOCAL DOCKER CONFIGURATION
DOCKER_DIR   := docker
COMPOSE_DEV  := $(DOCKER_DIR)/docker-compose.yml
COMPOSE_PROD := $(DOCKER_DIR)/docker-compose.prod.yml

.PHONY: help configure dev dev-up dev-down up down restart deploy deploy-delay checklogs n8n-backup n8n-push n8n-backup-dev n8n-push-dev n8n-deploy-error

# Default target
help:
	@echo "======================================================================"
	@echo "                   🛠️  Jobby Project Makefile 🛠️"
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
	@echo "  make deploy           - Push production compose & stream secrets from Doppler to VPS"
	@echo "  make deploy-delay     - Wait 150s for GitHub Actions and then deploy"
	@echo "  make checklogs        - Fetch real-time production logs from VPS"
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
	echo "🚀 Jobby ($(VERSION)) is ready locally! (http://localhost:$$PORT_RESOLVED)"

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
	@echo "🚀 Deploying Jobby stack to VPS Target [$(VPS_SSH)]..."
# 1. Ensure the remote deployment directory exists
	ssh $(VPS_SSH) "mkdir -p $(VPS_PATH)"
# 2. SCP the production compose file
	scp $(COMPOSE_PROD) $(VPS_SSH):$(VPS_PATH)/docker-compose.prod.yml
# 3. Stream production secrets from Doppler to remote VPS .env or fallback
	@if $(DOPPLER) --version >/dev/null 2>&1; then \
		echo "🔑 Envoi des secrets de production Doppler vers le VPS..."; \
		$(DOPPLER) secrets download --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_PROD) --no-file --format env | ssh $(VPS_SSH) "cat > $(VPS_PATH)/.env"; \
	else \
		echo "⚠️ Doppler non trouvé. Copie du fallback .env.prod vers le VPS..."; \
		scp docker/.env.prod $(VPS_SSH):$(VPS_PATH)/.env; \
	fi
# 4. Pull the immutable image from GHCR and recreate containers (NO local build)
	@echo "📥 Pulling latest custom images (jobby-editor, vector) from GHCR..."
	ssh $(VPS_SSH) "cd $(VPS_PATH) && \
		docker compose -f docker-compose.prod.yml pull jobby-editor vector && \
		docker compose -f docker-compose.prod.yml up -d --remove-orphans"
	@echo "✅ Deployment successfully completed on production server !"

checklogs:
	@echo "📟 Fetching real-time production logs from VPS [$(VPS_SSH)]..."
	ssh $(VPS_SSH) "cd $(VPS_PATH) && docker compose -f docker-compose.prod.yml logs -f"

deploy-delay:
	@echo "⏳ Waiting 150 seconds for GitHub Actions build to complete..."
	git push && sleep 150 && $(MAKE) deploy

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
