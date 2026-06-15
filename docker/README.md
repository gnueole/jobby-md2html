# Jobby Docker Architecture & Deployment

*Author: Julien (Éole) Avarre (<hi@eole.me>)*


This directory contains the Docker configurations, build files, and orchestration settings for the Jobby project. The directory is structured to clearly separate environment-specific orchestration from shared, environment-agnostic container definitions.

## 📁 Directory Structure

```text
docker/
├── docker-compose.yml         # Local WSL/Linux Development Orchestration
├── docker-compose.prod.yml    # Remote Production Orchestration
├── Dockerfile                 # Shared Node.js Web Editor Container Definition
├── README.md                  # This file
├── vector.Dockerfile          # Shared Vector Log Shipper Container Definition
└── vector.yaml                # Environment-Agnostic Vector Log Shipper Configuration
```

## 🛠️ Environment Isolation (Dev vs. Prod)

* **`docker/docker-compose.yml`**: Mounts the local project directory as a volume (`../:/app`) for live-reloading during code development. Binds services strictly to `127.0.0.1` for local safety.
* **`docker/docker-compose.prod.yml`**: Deploys the production stack using pre-built images from the GitHub Container Registry. Incorporates Traefik for public SSL termination (`80`/`443`) and resource boundaries for stability.

## 🪵 Log Segregation & Agnostic Vector Shipper

To prevent log mixing across shared hosts (e.g. between a `production` stack and a `test` stack on the same server), the Vector log shipper configuration is **entirely environment-agnostic** and parameterized using variables:

1. **Axiom Dataset Parameterization**:
   The shipping endpoint inside `vector.yaml` resolves dynamically:
   ```yaml
   uri: "https://eu-central-1.aws.edge.axiom.co/v1/ingest/${AXIOM_DATASET}"
   headers:
     Authorization: "Bearer ${AXIOM_TOKEN}"
   ```
   * Set `AXIOM_DATASET` to your production dataset in your production stack (`.env.prod`).
   * Set `AXIOM_DATASET` to a different dataset name (e.g., test/staging dataset) in your test stack.

2. **Docker Compose Project Filtering**:
   Vector matches and forwards container logs based on their Docker Compose project name:
   ```yaml
   condition: '.label."com.docker.compose.project" == "${COMPOSE_PROJECT_NAME}"'
   ```
   * The production compose file sets `COMPOSE_PROJECT_NAME=n8n-eole-prod`.
   * A test compose file would set `COMPOSE_PROJECT_NAME=n8n-eole-test`.
   Vector will automatically isolate and ship only logs belonging to that specific project.

---

## 🔗 Jobby Project Links
* **[README](../README.md)** - Project overview, architecture, directives and guide.
* **[Installation Guide](../INSTALL.md)** - Learn how to set up Jobby locally or via Docker.
* **[Changelog](../CHANGELOG.md)** - Review releases and change history.
* **[Security Policy](../SECURITY.md)** - View our security policy and vulnerability reporting instructions.
* **[License](../LICENSE)** - View the MIT License terms.


