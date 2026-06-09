#!/usr/bin/env python3
import os
import sys
import secrets

def load_env(filepath):
    env = {}
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env

def save_env(filepath, values, header=""):
    env = load_env(filepath)
    env.update(values)
    
    with open(filepath, "w", encoding="utf-8") as f:
        if header:
            f.write(header + "\n")
        for k, v in env.items():
            if " " in v or "#" in v:
                f.write(f"{k}='{v}'\n")
            else:
                f.write(f"{k}={v}\n")
    
    try:
        os.chmod(filepath, 0o600)
    except Exception:
        pass

def mask_secret(value):
    if not value:
        return "[Empty]"
    if len(value) <= 8:
        return "*" * len(value)
    return value[:4] + "..." + value[-4:]

BLUE = "\033[94m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

def print_banner():
    print(f"{BOLD}{BLUE}============================================================={RESET}")
    print(f"{BOLD}{BLUE}           🔮  Jobby Configuration Wizard  🔮                {RESET}")
    print(f"{BOLD}{BLUE}============================================================={RESET}")
    print("Welcome! This wizard will guide you to set up your environment variables")
    print("for Development, Production, or both.\n")

def migrate_legacy_configs():
    # Migrate legacy configurations if they exist
    if os.path.exists(".env") and not os.path.exists(".env.dev"):
        try:
            os.rename(".env", ".env.dev")
            print(f"{YELLOW}Migrated legacy configuration .env to .env.dev{RESET}\n")
        except Exception as e:
            print(f"Error migrating .env to .env.dev: {e}\n")
            
    if os.path.exists(os.path.join("docker", ".env")) and not os.path.exists(".env.prod"):
        try:
            os.rename(os.path.join("docker", ".env"), ".env.prod")
            print(f"{YELLOW}Migrated legacy configuration docker/.env to .env.prod{RESET}\n")
        except Exception as e:
            print(f"Error migrating docker/.env to .env.prod: {e}\n")

def show_existing_configs():
    # Detect already created files
    env_files = [".env.dev", ".env.prod", "toolkit/.env"]
    existing_files = [f for f in env_files if os.path.exists(f)]
    if existing_files:
        print(f"{YELLOW}{BOLD}⚠️  Detected existing configuration files:{RESET}")
        for filepath in existing_files:
            print(f"   - {GREEN}{BOLD}{filepath}{RESET}")
        print()
        
        for filepath in existing_files:
            show = input(f"{YELLOW}Would you like to display the content of {GREEN}{BOLD}{filepath}{RESET}{YELLOW}? (y/n, default: n): {RESET}").lower().strip()
            if show == 'y':
                print(f"\n{BOLD}--- Content of {filepath} ---{RESET}")
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        print(f.read().strip())
                except Exception as e:
                    print(f"Error reading file: {e}")
                print(f"{BOLD}----------------------{RESET}\n")

def select_environment():
    print(f"{BOLD}1. Select your target environment:{RESET}")
    print("   [d] Local Development (WSL / Local Linux)")
    print("   [p] Remote Production Server")
    print("   [b] Both environments")
    
    choice = input(f"\n{YELLOW}{BOLD}Choose option (d/p/b, default: d): {RESET}").lower().strip() or "d"
    return choice

def configure_dev(toolkit_values, dev_values):
    print(f"\n{BOLD}{CYAN}-------------------------------------------------------------{RESET}")
    print(f"{BOLD}{CYAN}🛠️  Configuring Local Development Environment{RESET}")
    print(f"{BOLD}{CYAN}-------------------------------------------------------------{RESET}")
    print("First, make sure your local Docker environment is running by executing:")
    print(f"   {BOLD}docker compose -f docker/dev/docker-compose.yml up -d{RESET}\n")
    
    print(f"{BOLD}Step 1: Local n8n Connection{RESET}")
    print("Connect to your local n8n instance at: http://localhost:5678")
    print("To generate an API key, go to: Settings -> Personal settings -> API Keys")
    dev_api = input(f"{YELLOW}Paste your local n8n API key (or press Enter to skip): {RESET}").strip()
    if dev_api:
        toolkit_values["DEV_N8N_API_KEY"] = dev_api
        
    dev_wf = input(f"{YELLOW}Enter your local jobby n8n workflow ID (or press Enter to skip): {RESET}").strip()
    if dev_wf:
        toolkit_values["DEV_N8N_WORKFLOW_ID"] = dev_wf
    toolkit_values["DEV_N8N_BASE_URL"] = "http://localhost:5678"
    
    print(f"\n{BOLD}Step 2: Notion API Token (for mcp-notion dev server){RESET}")
    print("To get a token, create an internal integration at: https://www.notion.so/my-integrations")
    dev_notion = input(f"{YELLOW}Enter your local Notion token (or press Enter to skip): {RESET}").strip()
    if dev_notion:
        dev_values["NOTION_TOKEN"] = dev_notion
        
    print(f"\n{BOLD}Step 3: Webhook Security Token (X_N8N_TOKEN){RESET}")
    print("This token protects the jobby-editor and n8n webhook communication.")
    dev_web_token = input(f"{YELLOW}Enter a webhook token (or press Enter to auto-generate a secure random one): {RESET}").strip()
    if not dev_web_token:
        dev_web_token = secrets.token_hex(24)
        print(f"Generated secure random token: {GREEN}{dev_web_token}{RESET}")
    dev_values["X_N8N_TOKEN"] = dev_web_token
    dev_values["TZ"] = "UTC"
    
    print(f"\n{BOLD}Step 4: Google Analytics (optional){RESET}")
    dev_gtag = input(f"{YELLOW}Enter your Google Analytics Measurement ID (e.g., G-BLZSKHC2KE, or press Enter to skip): {RESET}").strip()
    if dev_gtag:
        dev_values["GOOGLE_TAG_ID"] = dev_gtag

def configure_prod(toolkit_values, prod_values):
    print(f"\n{BOLD}{CYAN}-------------------------------------------------------------{RESET}")
    print(f"{BOLD}{CYAN}🚀  Configuring Production Environment{RESET}")
    print(f"{BOLD}{CYAN}-------------------------------------------------------------{RESET}")
    
    print(f"{BOLD}Step 1: Production Domain details{RESET}")
    domain = input(f"{YELLOW}Enter your production domain name (e.g., cv.eole.me): {RESET}").strip()
    if domain:
        prod_values["DOMAIN_NAME"] = domain
        
    email = input(f"{YELLOW}Enter your email for Let's Encrypt SSL certificates (e.g., admin@eole.me): {RESET}").strip()
    if email:
        prod_values["ACME_EMAIL"] = email
        
    print(f"\n{BOLD}Step 2: Production n8n Connection{RESET}")
    if domain:
        n8n_url = f"https://n8n.{domain}" if not domain.startswith("cv.") else f"https://{domain}"
        print(f"Navigate to your production n8n instance at: {n8n_url} (or n8n.eole.me)")
    else:
        print("Navigate to your production n8n instance (e.g., https://n8n.eole.me)")
    print("Generate an API key: Settings -> Personal settings -> API Keys")
    prod_api = input(f"{YELLOW}Paste your production n8n API key (or press Enter to skip): {RESET}").strip()
    if prod_api:
        toolkit_values["N8N_API_KEY"] = prod_api
        
    prod_wf = input(f"{YELLOW}Enter your production jobby n8n workflow ID (or press Enter to skip): {RESET}").strip()
    if prod_wf:
        toolkit_values["N8N_WORKFLOW_ID"] = prod_wf
        
    if domain:
        toolkit_values["N8N_BASE_URL"] = f"https://n8n.{domain}" if not domain.startswith("cv.") else f"https://{domain}"
    else:
        toolkit_values["N8N_BASE_URL"] = "https://n8n.eole.me"
        
    print(f"\n{BOLD}Step 3: Notion API Token (for production mcp-notion server){RESET}")
    prod_notion = input(f"{YELLOW}Enter your production Notion token (or press Enter to skip): {RESET}").strip()
    if prod_notion:
        prod_values["NOTION_TOKEN"] = prod_notion
        
    print(f"\n{BOLD}Step 4: Axiom Logging Configuration{RESET}")
    print("To send container logs to Axiom, configure the dataset and ingest token:")
    axiom_dataset = input(f"{YELLOW}Enter your Axiom dataset name (e.g., vps-eole-me): {RESET}").strip()
    if axiom_dataset:
        prod_values["AXIOM_DATASET"] = axiom_dataset
        
    axiom_token = input(f"{YELLOW}Enter your Axiom ingest token (or press Enter to skip): {RESET}").strip()
    if axiom_token:
        prod_values["AXIOM_TOKEN"] = axiom_token
        
    print(f"\n{BOLD}Step 5: Webhook Security Token (X_N8N_TOKEN){RESET}")
    prod_web_token = input(f"{YELLOW}Enter a production webhook token (or press Enter to auto-generate a secure random one): {RESET}").strip()
    if not prod_web_token:
        prod_web_token = secrets.token_hex(24)
        print(f"Generated secure random token: {GREEN}{prod_web_token}{RESET}")
    prod_values["X_N8N_TOKEN"] = prod_web_token
    prod_values["TZ"] = "Europe/Paris"

    print(f"\n{BOLD}Step 6: Google Analytics Configuration (optional){RESET}")
    prod_gtag = input(f"{YELLOW}Enter your production Google Analytics Measurement ID (e.g., G-BLZSKHC2KE, or press Enter to skip): {RESET}").strip()
    if prod_gtag:
        prod_values["GOOGLE_TAG_ID"] = prod_gtag

def save_configurations(toolkit_values, dev_values, prod_values):
    print(f"\n{BOLD}{BLUE}============================================================={RESET}")
    print(f"{BOLD}{BLUE}💾  Saving Configurations...                                 {RESET}")
    print(f"{BOLD}{BLUE}============================================================={RESET}")
    
    if toolkit_values:
        save_env(
            os.path.join("toolkit", ".env"),
            toolkit_values,
            "# n8n Sync and Maintenance Toolkit Configurations"
        )
        print(f"✅ Saved toolkit variables to: {GREEN}toolkit/.env{RESET}")
        for k, v in toolkit_values.items():
            print(f"   - {k}: {mask_secret(v)}")
        
    if dev_values:
        save_env(
            ".env.dev",
            dev_values,
            "# Local Development Docker Compose Variables"
        )
        print(f"✅ Saved development variables to: {GREEN}.env.dev{RESET}")
        for k, v in dev_values.items():
            print(f"   - {k}: {mask_secret(v)}")
        
    if prod_values:
        save_env(
            ".env.prod",
            prod_values,
            "# Production Stack Docker Compose Variables"
        )
        print(f"✅ Saved production variables to: {GREEN}.env.prod{RESET}")
        for k, v in prod_values.items():
            print(f"   - {k}: {mask_secret(v)}")

def main():
    print_banner()
    migrate_legacy_configs()
    show_existing_configs()
    
    choice = select_environment()
    
    dev_values = {}
    prod_values = {}
    toolkit_values = {}
    
    if choice in ("d", "b"):
        configure_dev(toolkit_values, dev_values)
        
    if choice in ("p", "b"):
        configure_prod(toolkit_values, prod_values)
        
    save_configurations(toolkit_values, dev_values, prod_values)
    
    print(f"\n{BOLD}{GREEN}🎉 Wizard setup completed successfully!{RESET}\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{YELLOW}{BOLD}👋 Setup cancelled by user. Exiting...{RESET}\n")
        sys.exit(0)
