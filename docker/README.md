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
├── vector.yaml                # Environment-Agnostic Vector Log Shipper Configuration
└── vector.tests.yaml          # Unit tests for vector.yaml's transforms (make vector-test)
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

2. **Opt-in by label**:
   Vector ships a container's logs only if it carries `vector.dev/collect=true`
   (`filter_project_logs`). Everything lands in one dataset; the project is a
   field, not a dataset.

3. **Before shipping** (`anonymize_client_ips`):
   * **Client IPs are truncated.** The last quoted field of an nginx access
     line, the visitor's address from X-Forwarded-For, keeps its /24 (IPv4) or
     /48 (IPv6).
   * **Stack traces stay whole.** The `docker_logs` source merges any line
     starting with whitespace into the event above it, so a trace is one event
     rather than one per frame.

4. **Testing**: `make vector-test` validates the config and runs
   `vector.tests.yaml` on the Vector version `vector.Dockerfile` pins. CI runs it
   before building the image.

## 📊 Telemetry Ingest

Besides container logs, Vector receives the editor's telemetry events. `server.js` posts them to Vector's HTTP source (`http_telemetry`, port 8080); the `normalize_telemetry` transform maps legacy field names onto `event_type` and `application`, and folds `prd`/`production` into `prod`; `axiom_telemetry_sink` ships them to the `eole-telemetry` dataset (`AXIOM_TELEMETRY_DATASET` overrides it). See [ARCHITECTURE.md](../ARCHITECTURE.md).

---

## 🔗 Jobby Project Links
* **[README](../README.md)** - Project overview, architecture, directives and guide.
* **[Installation Guide](../INSTALL.md)** - Learn how to set up Jobby locally or via Docker.
* **[Changelog](../CHANGELOG.md)** - Review releases and change history.
* **[Security Policy](../SECURITY.md)** - View our security policy and vulnerability reporting instructions.
* **[License](../LICENSE)** - View the MIT License terms.


