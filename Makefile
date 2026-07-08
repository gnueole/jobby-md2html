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

# 🎨 COLOR CODES FOR MODERN HELP MENU (TrueColor ANSI)
GREEN     := \033[38;2;74;222;128m
BLUE      := \033[38;2;96;165;250m
PURPLE    := \033[38;2;167;139;250m
CYAN      := \033[38;2;45;212;191m
ORANGE    := \033[38;2;251;146;60m
GRAY      := \033[38;2;156;163;175m
DARK_GRAY := \033[38;2;75;85;99m
BOLD      := \033[1m
RESET     := \033[0m

# Semantic Typology mappings (Meta-colorization)
STYLE_TITLE       ?= $(CYAN)
STYLE_SECTION     ?= $(PURPLE)
STYLE_PHASE       ?= $(CYAN)
STYLE_DISCREET    ?= $(GRAY)
STYLE_INSTRUCTION ?= $(GREEN)
STYLE_RESULT      ?= $(GREEN)
STYLE_WARNING     ?= $(ORANGE)
STYLE_ERROR       ?= $(ORANGE)


# 🛠️ LOCAL DOCKER CONFIGURATION
DOCKER_DIR   := docker
COMPOSE_DEV  := $(DOCKER_DIR)/docker-compose.yml
COMPOSE_PROD := $(DOCKER_DIR)/docker-compose.prod.yml

.PHONY: help configure dev dev-up dev-down up down restart deploy deploy-infra deploy-n8n deploy-all _deploy deploy-delay checklogs check-build check-build-full n8n-backup n8n-push n8n-backup-dev n8n-push-dev n8n-deploy-error n8n-dbs-push n8n-dbs-pull n8n-dbs-list

# Default target
help:
	@printf "$(STYLE_TITLE)──────────────────────────────────────────────────────────────────────$(RESET)\n"
	@printf "                   🛠️  $(BOLD)$(PROJECT_NAME) Project Makefile$(RESET) 🛠️\n"
	@printf "$(STYLE_TITLE)──────────────────────────────────────────────────────────────────────$(RESET)\n"
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
	@echo "  make deploy-n8n       - Push production compose & pull/recreate only the n8n container"
	@echo "  make deploy-all       - Push production compose & pull/recreate all images"
	@echo "  make deploy-delay     - Wait 150s for GitHub Actions and then deploy"
	@echo "  make checklogs        - Fetch real-time production logs from VPS"
	@echo "  make check-build      - Query GitHub Actions build status (quiet on success, prints simple message on progress)"
	@echo "  make check-build-full - Display verbose details of the latest GitHub Actions workflow run"
	@echo ""
	@echo "n8n Workflow Syncing (Doppler aware):"
	@echo "  make n8n-backup       - Backup all workflows from Production n8n to local n8n/"
	@echo "  make n8n-push         - Push/Import all local n8n/ workflows to Production n8n"
	@echo "  make n8n-backup-dev   - Backup all workflows from Local Dev n8n to local n8n/"
	@echo "  make n8n-push-dev     - Push/Import all local n8n/ workflows to Local Dev n8n"
	@echo "  make n8n-deploy-error - Deploy the Axiom error logging workflow to n8n"
	@echo ""
	@echo "Notion Database Config Syncing:"
	@echo "  make n8n-dbs-push     - Push Notion database UIDs from Doppler config to n8n Data Table"
	@echo "  make n8n-dbs-pull     - Pull Notion database UIDs from n8n Data Table to Doppler config"
	@echo "  make n8n-dbs-list     - List and compare database config on both sides (diff status)"
	@printf "$(STYLE_TITLE)──────────────────────────────────────────────────────────────────────$(RESET)\n"

# Run configure wizard (checks dependencies and copies fallback env)
configure:
	@bash configure

# Local Node resume editor
dev:
	@if $(DOPPLER) --version >/dev/null 2>&1; then \
		echo "🔑 Refreshing development secrets from Doppler ($(DOPPLER_PROJECT))..."; \
		$(DOPPLER) secrets download --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_DEV) --no-file --format env > .env; \
	else \
		if [ ! -f .env ]; then \
			echo "⚠️ Doppler CLI not found. Copying $(DOCKER_DIR)/.env.example as .env fallback..."; \
			cp $(DOCKER_DIR)/.env.example .env; \
		fi \
	fi
	npm run dev

# 💻 DEVELOPMENT COMMANDS (LOCAL DOCKER)
dev-up:
	@echo "✨ Starting local development environment..."
	@if $(DOPPLER) --version >/dev/null 2>&1; then \
		echo "🔑 Refreshing development secrets from Doppler..."; \
		$(DOPPLER) secrets download --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_DEV) --no-file --format env > .env; \
	else \
		if [ ! -f .env ]; then \
			echo "⚠️ Doppler CLI not found. Copying docker/.env.example as .env fallback..."; \
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
	@$(MAKE) --no-print-directory _deploy SERVICES="mcp-notion gotenberg"

deploy-all:
	@$(MAKE) --no-print-directory _deploy SERVICES=""

_deploy:
	@printf "$(STYLE_RESULT)🚀 [1/4]$(RESET) Preparing deployment space on VPS $(BOLD)$(VPS_SSH)$(RESET)...\n"
	@ssh $(VPS_SSH) "mkdir -p $(VPS_PATH)" >/dev/null
	@printf "$(STYLE_PHASE)📦 [2/4]$(RESET) Uploading static assets and configuration files...\n"
	@scp $(COMPOSE_PROD) $(VPS_SSH):$(VPS_PATH)/docker-compose.prod.yml >/dev/null
	@printf "$(STYLE_PHASE)🔑 [3/4]$(RESET) Streaming production secrets from Doppler...\n"
	@if $(DOPPLER) --version >/dev/null 2>&1; then \
		if $(DOPPLER) secrets download --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_PROD) --no-file --format env > docker/.env.prod.temp 2>/dev/null; then \
			scp docker/.env.prod.temp $(VPS_SSH):$(VPS_PATH)/.env >/dev/null; \
			rm -f docker/.env.prod.temp; \
		else \
			printf "$(STYLE_ERROR)❌ Error: Doppler secrets download failed for project $(DOPPLER_PROJECT) (config: $(DOPPLER_CONFIG_PROD))!$(RESET)\n"; \
			rm -f docker/.env.prod.temp; \
			exit 1; \
		fi; \
	else \
		printf "$(STYLE_ERROR)❌ Error: Doppler CLI is not installed or not found in PATH!$(RESET)\n"; \
		exit 1; \
	fi
	@if [ "$(SERVICES)" = "" ]; then \
		ssh $(VPS_SSH) "cd $(VPS_PATH) && docker compose -f docker-compose.prod.yml pull" >/dev/null; \
	else \
		ssh $(VPS_SSH) "cd $(VPS_PATH) && docker compose -f docker-compose.prod.yml pull $(SERVICES)" >/dev/null; \
	fi
	@if [ "$(SERVICES)" = "" ] || echo "$(SERVICES)" | grep -q "jobby-editor"; then \
		REAL_VERSION=$$(ssh $(VPS_SSH) "docker run --rm ghcr.io/gnueole/jobby-md2html:latest node -e \"console.log(require('./package.json').version)\" 2>/dev/null || echo 'unknown'"); \
		if [ "$$REAL_VERSION" != "$(VERSION)" ]; then \
			if [ "$(FORCE)" != "1" ] && [ "$(F)" != "1" ]; then \
				printf "$(STYLE_ERROR)❌ Error: The image version ($$REAL_VERSION) differs from the local package.json version ($(VERSION))!$(RESET)\n"; \
				printf "   Deploy aborted. Wait for the GitHub Action to finish building the new image, or bypass using 'make deploy FORCE=1'.\n"; \
				exit 1; \
			fi \
		fi \
	fi
	@printf "$(STYLE_PHASE)🐳 [4/4]$(RESET) Recreating and starting production containers...\n"
	@ssh $(VPS_SSH) "docker rm -f jobby-editor mcp-notion gotenberg 2>/dev/null || true" >/dev/null
	@ssh $(VPS_SSH) "cd $(VPS_PATH) && docker compose -f docker-compose.prod.yml up -d --remove-orphans" >/dev/null
	@DEPLOYED_VERSION=$$(ssh $(VPS_SSH) "docker exec jobby-editor node -e \"console.log(require('./package.json').version)\" 2>/dev/null || echo '$(VERSION)'"); \
	printf "$(STYLE_RESULT)✅ Deployment of $(PROJECT_NAME) [$$DEPLOYED_VERSION / $(VPS_PROJECT_TAG)] successfully completed on production server!$(RESET)\n"

check-logs:
	@echo "📟 Fetching real-time production logs from VPS [$(VPS_SSH)]..."
	ssh $(VPS_SSH) "cd $(VPS_PATH) && docker compose -f docker-compose.prod.yml logs -f"

check-build:
	@python3 toolkit/check_build.py

check-build-full:
	@python3 toolkit/check_build.py --full

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

n8n-dbs-push:
	@if $(DOPPLER) --version >/dev/null 2>&1; then \
		echo "🔑 Pushing database IDs from Doppler to n8n Data Table..."; \
		$(DOPPLER) run --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_PROD) -- python3 toolkit/sync_doppler_dbs.py push; \
	else \
		python3 toolkit/sync_doppler_dbs.py push; \
	fi

n8n-dbs-pull:
	@if $(DOPPLER) --version >/dev/null 2>&1; then \
		echo "🔑 Pulling database IDs from n8n Data Table to Doppler..."; \
		$(DOPPLER) run --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_PROD) -- python3 toolkit/sync_doppler_dbs.py pull; \
	else \
		python3 toolkit/sync_doppler_dbs.py pull; \
	fi

n8n-dbs-list:
	@if $(DOPPLER) --version >/dev/null 2>&1; then \
		$(DOPPLER) run --project $(DOPPLER_PROJECT) --config $(DOPPLER_CONFIG_PROD) -- python3 toolkit/sync_doppler_dbs.py list; \
	else \
		python3 toolkit/sync_doppler_dbs.py list; \
	fi

