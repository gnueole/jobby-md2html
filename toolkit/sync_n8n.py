import json
import urllib.request
import urllib.error
import ssl
import sys
import os
import argparse
import re

# Global configuration variables to be populated by ensure_env()
API_KEY = None
WORKFLOW_ID = None
BASE_URL = None
N8N_URL = None

# SSL context bypassing validation
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def generate_env(force=False):
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    template = (
        "# Production n8n Configuration\n"
        "N8N_API_KEY=\n"
        "N8N_WORKFLOW_ID=\n"
        "N8N_BASE_URL=https://n8n.eole.me\n\n"
        "# Local Development n8n Configuration (WSL / Overrides)\n"
        "DEV_N8N_API_KEY=\n"
        "DEV_N8N_WORKFLOW_ID=\n"
        "DEV_N8N_BASE_URL=http://localhost:5678\n"
    )
    if not os.path.exists(env_path) or force or os.path.getsize(env_path) == 0:
        with open(env_path, "w", encoding="utf-8") as f:
            f.write(template)
        print(f"SUCCESS: Generated default .env file template at {env_path}")
        print("Please fill in the variables inside it.")
        return True
    else:
        print(f"INFO: .env file already exists at {env_path}")
        return False

def ensure_env(require_workflow_id=True, use_dev=False, api_key_override=None, workflow_id_override=None, base_url_override=None):
    global API_KEY, WORKFLOW_ID, BASE_URL, N8N_URL
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    
    config = {}
    if os.path.exists(env_path) and os.path.getsize(env_path) > 0:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                val = val.strip().strip('"').strip("'")
                config[key.strip()] = val
    elif not use_dev:
        print(f"Error: .env file is missing or empty at {env_path}")
        print("Please run this script with the --init-env option to generate a template.")
        sys.exit(1)
        
    if use_dev:
        API_KEY = api_key_override or config.get("DEV_N8N_API_KEY")
        WORKFLOW_ID = workflow_id_override or config.get("DEV_N8N_WORKFLOW_ID")
        BASE_URL = base_url_override or config.get("DEV_N8N_BASE_URL") or "http://localhost:5678"
    else:
        API_KEY = api_key_override or config.get("N8N_API_KEY")
        WORKFLOW_ID = workflow_id_override or config.get("N8N_WORKFLOW_ID")
        BASE_URL = base_url_override or config.get("N8N_BASE_URL", "https://n8n.eole.me")
        
    BASE_URL = BASE_URL.rstrip("/")
    
    if not API_KEY and not use_dev:
        print("Error: Missing credentials in .env file.")
        print("Please ensure N8N_API_KEY and N8N_BASE_URL are populated in your .env file.")
        sys.exit(1)
        
    if require_workflow_id and not WORKFLOW_ID:
        print("Error: Missing WORKFLOW_ID in .env file or command override (--id).")
        sys.exit(1)
        
    if WORKFLOW_ID:
        N8N_URL = f"{BASE_URL}/api/v1/workflows/{WORKFLOW_ID}"

def slugify(text):
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[-\s]+", "-", text).strip("-")

def fetch_workflow():
    req = urllib.request.Request(
        N8N_URL,
        headers={
            "X-N8N-API-KEY": API_KEY,
            "Accept": "application/json"
        },
        method="GET"
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.status == 200:
                return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching workflow from n8n: {e}")
        sys.exit(1)

def push_workflow(wf):
    raw_settings = wf.get("settings", {})
    clean_settings = {}
    for k in ["executionOrder", "errorWorkflow"]:
        if k in raw_settings:
            clean_settings[k] = raw_settings[k]

    payload = {
        "name": wf.get("name"),
        "nodes": wf.get("nodes"),
        "connections": wf.get("connections"),
        "settings": clean_settings,
        "staticData": wf.get("staticData")
    }
    
    req = urllib.request.Request(
        N8N_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "X-N8N-API-KEY": API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        method="PUT"
    )
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.status == 200:
                print("SUCCESS: Workflow updated successfully on n8n!")
                return True
            else:
                print(f"FAILED status={response.status}")
                return False
    except urllib.error.HTTPError as e:
        print(f"HTTPError: {e.code} - {e.reason}")
        print(e.read().decode('utf-8'))
        return False
    except Exception as e:
        print(f"Error pushing workflow: {e}")
        return False

def activate_workflow():
    req = urllib.request.Request(
        f"{N8N_URL}/activate",
        data=b"{}",
        headers={
            "X-N8N-API-KEY": API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.status == 200:
                print("SUCCESS: Workflow successfully activated/published on n8n!")
                return True
            else:
                print(f"FAILED to activate workflow, status={response.status}")
                return False
    except Exception as e:
        print(f"Warning: Could not auto-activate workflow via API: {e}")
        return False

def list_workflows():
    url = f"{BASE_URL}/api/v1/workflows"
    req = urllib.request.Request(
        url,
        headers={
            "X-N8N-API-KEY": API_KEY,
            "Accept": "application/json"
        },
        method="GET"
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.status == 200:
                res = json.loads(response.read().decode('utf-8'))
                return res.get("data", [])
    except Exception as e:
        print(f"Error listing workflows from n8n: {e}")
    return []

def create_workflow(wf):
    url = f"{BASE_URL}/api/v1/workflows"
    raw_settings = wf.get("settings", {})
    clean_settings = {}
    for k in ["executionOrder", "errorWorkflow"]:
        if k in raw_settings:
            clean_settings[k] = raw_settings[k]

    payload = {
        "name": wf.get("name"),
        "nodes": wf.get("nodes"),
        "connections": wf.get("connections"),
        "settings": clean_settings,
        "staticData": wf.get("staticData")
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "X-N8N-API-KEY": API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.status in (200, 201):
                new_wf = json.loads(response.read().decode('utf-8'))
                print(f"SUCCESS: Workflow '{new_wf.get('name')}' created with ID {new_wf.get('id')}!")
                return new_wf
    except Exception as e:
        print(f"Error creating workflow: {e}")
    return None

def update_workflow_by_id(workflow_id, wf):
    url = f"{BASE_URL}/api/v1/workflows/{workflow_id}"
    raw_settings = wf.get("settings", {})
    clean_settings = {}
    for k in ["executionOrder", "errorWorkflow"]:
        if k in raw_settings:
            clean_settings[k] = raw_settings[k]

    payload = {
        "name": wf.get("name"),
        "nodes": wf.get("nodes"),
        "connections": wf.get("connections"),
        "settings": clean_settings,
        "staticData": wf.get("staticData")
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "X-N8N-API-KEY": API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        method="PUT"
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.status == 200:
                print(f"SUCCESS: Workflow '{wf.get('name')}' (ID: {workflow_id}) updated successfully!")
                return True
    except Exception as e:
        print(f"Error updating workflow {workflow_id}: {e}")
    return False

def activate_workflow_by_id(workflow_id):
    url = f"{BASE_URL}/api/v1/workflows/{workflow_id}/activate"
    req = urllib.request.Request(
        url,
        data=b"{}",
        headers={
            "X-N8N-API-KEY": API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.status == 200:
                print(f"SUCCESS: Workflow {workflow_id} successfully activated/published on n8n!")
                return True
    except Exception as e:
        print(f"Warning: Could not auto-activate workflow {workflow_id}: {e}")
    return False

def backup_all(n8n_dir, use_dev):
    import subprocess
    global API_KEY, BASE_URL
    
    if use_dev and not API_KEY:
        print("API Key not set. Attempting Docker fallback for workflow export...")
        container_name = "n8n-server-dev"
        try:
            check_res = subprocess.run(
                ["docker", "inspect", "-f", "{{.State.Running}}", container_name],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
            )
            if check_res.returncode != 0:
                err_msg = check_res.stderr or check_res.stdout or ""
                if "permission denied" in err_msg.lower() or "cannot connect" in err_msg.lower():
                    print("Docker daemon connection error (permission denied or daemon not running).")
                    print("If you are running WSL, make sure Docker Desktop is active on Windows.")
                    print("You can also run these commands manually to export:")
                    print(f"  sg docker -c \"docker exec -u node {container_name} n8n export:workflow --all --output=/tmp/n8n_export\"")
                    print(f"  sg docker -c \"docker cp {container_name}:/tmp/n8n_export/. {n8n_dir}/\"")
                else:
                    print(f"Error checking status for container '{container_name}': {err_msg.strip()}")
                sys.exit(1)
            elif "true" not in check_res.stdout.lower():
                print(f"Error: Docker container '{container_name}' is not running.")
                print("Please start your dev environment using 'docker compose -f docker/dev/docker-compose.yml up -d' first.")
                sys.exit(1)
            
            print("Exporting workflows inside the container...")
            subprocess.run(["docker", "exec", container_name, "mkdir", "-p", "/tmp/n8n_export"], check=True)
            export_res = subprocess.run(
                ["docker", "exec", "-u", "node", container_name, "n8n", "export:workflow", "--all", "--output=/tmp/n8n_export"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
            )
            if export_res.returncode != 0:
                print("Error: n8n export command failed inside the container:")
                print(export_res.stderr)
                sys.exit(1)
                
            print("Copying exported workflows from container...")
            subprocess.run(["docker", "cp", f"{container_name}:/tmp/n8n_export/.", n8n_dir + "/"], check=True)
            print(f"SUCCESS: Workflows exported successfully to {n8n_dir} folder.")
            return True
        except Exception as e:
            print(f"Docker fallback failed: {e}")
            print("\nPlease make sure Docker is running and you have necessary permissions.")
            print("Alternatively, you can run these commands manually:")
            print(f"  sg docker -c \"docker exec -u node {container_name} n8n export:workflow --all --output=/tmp/n8n_export\"")
            print(f"  sg docker -c \"docker cp {container_name}:/tmp/n8n_export/. {n8n_dir}/\"")
            sys.exit(1)

    print(f"Connecting to n8n at: {BASE_URL}")
    req = urllib.request.Request(
        f"{BASE_URL}/api/v1/workflows",
        headers={"X-N8N-API-KEY": API_KEY, "Accept": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.status == 200:
                workflows_data = json.loads(response.read().decode("utf-8")).get("data", [])
                print(f"Found {len(workflows_data)} workflows on target n8n.")
                
                for wf in workflows_data:
                    name = wf.get("name", "untitled")
                    wf_id = wf.get("id")
                    filename = f"{slugify(name)}.json"
                    file_path = os.path.join(n8n_dir, filename)
                    
                    wf_req = urllib.request.Request(
                        f"{BASE_URL}/api/v1/workflows/{wf_id}",
                        headers={"X-N8N-API-KEY": API_KEY, "Accept": "application/json"}
                    )
                    with urllib.request.urlopen(wf_req, context=ctx) as wf_res:
                        full_wf = json.loads(wf_res.read().decode("utf-8"))
                        with open(file_path, "w", encoding="utf-8") as out:
                            json.dump(full_wf, out, indent=2, ensure_ascii=False)
                        print(f"  - Saved: n8n/{filename} (ID: {wf_id})")
                print("SUCCESS: All workflows saved locally.")
                return True
            else:
                print(f"Error: Server returned status {response.status}")
                sys.exit(1)
    except Exception as e:
        print(f"Error fetching workflows: {e}")
        sys.exit(1)

def push_all(n8n_dir, use_dev):
    import subprocess
    global API_KEY, BASE_URL
    
    if not os.path.exists(n8n_dir):
        print(f"Error: Workflows directory '{n8n_dir}' does not exist.")
        sys.exit(1)
        
    json_files = [f for f in os.listdir(n8n_dir) if f.endswith(".json")]
    if not json_files:
        print(f"Warning: No .json workflow files found in '{n8n_dir}'.")
        return True
        
    if use_dev and not API_KEY:
        print("API Key not set. Attempting Docker fallback for workflow import...")
        container_name = "n8n-server-dev"
        try:
            check_res = subprocess.run(
                ["docker", "inspect", "-f", "{{.State.Running}}", container_name],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
            )
            if check_res.returncode != 0:
                err_msg = check_res.stderr or check_res.stdout or ""
                if "permission denied" in err_msg.lower() or "cannot connect" in err_msg.lower():
                    print("Docker daemon connection error (permission denied or daemon not running).")
                    print("If you are running WSL, make sure Docker Desktop is active on Windows.")
                    print("You can also run these commands manually to import:")
                    print(f"  sg docker -c \"docker cp {n8n_dir}/. {container_name}:/tmp/n8n_import/\"")
                    print(f"  sg docker -c \"docker exec -u node {container_name} n8n import:workflow --input=/tmp/n8n_import\"")
                else:
                    print(f"Error checking status for container '{container_name}': {err_msg.strip()}")
                sys.exit(1)
            elif "true" not in check_res.stdout.lower():
                print(f"Error: Docker container '{container_name}' is not running.")
                print("Please start your dev environment using 'docker compose -f docker/dev/docker-compose.yml up -d' first.")
                sys.exit(1)
            
            print(f"Copying workflows to container '{container_name}'...")
            subprocess.run(["docker", "exec", container_name, "mkdir", "-p", "/tmp/n8n_import"], check=True)
            subprocess.run(["docker", "cp", f"{n8n_dir}/.", f"{container_name}:/tmp/n8n_import/"], check=True)
            
            print("Importing workflows inside the container...")
            import_res = subprocess.run(
                ["docker", "exec", "-u", "node", container_name, "n8n", "import:workflow", "--input=/tmp/n8n_import"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
            )
            if import_res.returncode == 0:
                print("SUCCESS: Workflows imported successfully via Docker CLI!")
                print(import_res.stdout)
                return True
            else:
                print("Error: n8n import command failed inside the container:")
                print(import_res.stderr)
                sys.exit(1)
        except Exception as e:
            print(f"Docker fallback failed: {e}")
            print("\nPlease make sure Docker is running and you have necessary permissions.")
            print("Alternatively, you can run these commands manually:")
            print(f"  sg docker -c \"docker cp {n8n_dir}/. {container_name}:/tmp/n8n_import/\"")
            print(f"  sg docker -c \"docker exec -u node {container_name} n8n import:workflow --input=/tmp/n8n_import\"")
            sys.exit(1)

    print(f"Connecting to n8n at: {BASE_URL}")
    existing_workflows = list_workflows()
    existing_map = {wf.get("name", "").lower(): wf.get("id") for wf in existing_workflows if "name" in wf}
    
    print(f"Found {len(existing_workflows)} existing workflows on target n8n.")
    print(f"Preparing to import {len(json_files)} workflows from '{n8n_dir}'...")
    
    for filename in json_files:
        file_path = os.path.join(n8n_dir, filename)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                wf = json.load(f)
        except Exception as e:
            print(f"Error reading workflow file '{filename}': {e}. Skipping.")
            continue
            
        name = wf.get("name")
        if not name:
            print(f"Warning: Workflow file '{filename}' is missing 'name' field. Skipping.")
            continue
            
        name_lower = name.lower()
        if name_lower in existing_map:
            wf_id = existing_map[name_lower]
            print(f"Updating workflow: '{name}' (ID: {wf_id})...")
            if update_workflow_by_id(wf_id, wf):
                if wf.get("active") is True:
                    activate_workflow_by_id(wf_id)
        else:
            print(f"Creating new workflow: '{name}'...")
            new_wf = create_workflow(wf)
            if new_wf:
                wf_id = new_wf.get("id")
                if wf_id and wf.get("active") is True:
                    activate_workflow_by_id(wf_id)
                    
    print("SUCCESS: Bulk workflow import/push completed.")
    return True

def activate_all():
    global API_KEY, BASE_URL
    print(f"Listing workflows to activate on: {BASE_URL}")
    workflows = list_workflows()
    count = 0
    for wf in workflows:
        wf_id = wf.get("id")
        if wf_id:
            print(f"Activating workflow: '{wf.get('name')}' (ID: {wf_id})...")
            if activate_workflow_by_id(wf_id):
                count += 1
    print(f"SUCCESS: Activated {count} workflows.")

def main():
    parser = argparse.ArgumentParser(description="n8n Jobby Workflow Sync & Maintenance Toolkit")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--backup", action="store_true", help="Download current workflow from n8n and save as local backup JSON")
    group.add_argument("--backup-all", action="store_true", help="Download all workflows from n8n and save in local n8n/ directory")
    group.add_argument("--fix", action="store_true", help="Automatically fix the JS Code node syntax errors (split/join newline bugs) and H3 -> H2 structural splitting")
    group.add_argument("--push", action="store_true", help="Push the local backup JSON workflow back to n8n")
    group.add_argument("--push-all", action="store_true", help="Push/import all workflows in local n8n/ directory to the target n8n instance")
    group.add_argument("--activate", action="store_true", help="Activate/Publish the workflow on n8n")
    group.add_argument("--activate-all", action="store_true", help="Activate/Publish all workflows on n8n")
    group.add_argument("--deploy-error", action="store_true", help="Deploy the error trigger to Axiom workflow to n8n")
    group.add_argument("--init-env", action="store_true", help="Generate a default .env file template")
    
    parser.add_argument("--dev", action="store_true", help="Target the local development n8n instance instead of production")
    parser.add_argument("--id", type=str, help="Override N8N_WORKFLOW_ID / DEV_N8N_WORKFLOW_ID")
    parser.add_argument("--api-key", type=str, help="Override N8N_API_KEY / DEV_N8N_API_KEY")
    parser.add_argument("--base-url", type=str, help="Override N8N_BASE_URL / DEV_N8N_BASE_URL")
    parser.add_argument("--file", type=str, help="Override input/output file path for --backup, --push, or --fix")

    args = parser.parse_args()
    
    if args.init_env:
        generate_env(force=True)
        sys.exit(0)
        
    require_wf_id = not (args.backup_all or args.push_all or args.activate_all or args.deploy_error)
    
    ensure_env(
        require_workflow_id=require_wf_id,
        use_dev=args.dev,
        api_key_override=args.api_key,
        workflow_id_override=args.id,
        base_url_override=args.base_url
    )
    
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    n8n_dir = os.path.join(project_root, "n8n")
    os.makedirs(n8n_dir, exist_ok=True)
    
    backup_file = args.file or os.path.join(os.path.dirname(__file__), "workflow_backup.json")
    
    if args.backup:
        print("Fetching workflow from n8n...")
        wf = fetch_workflow()
        with open(backup_file, "w", encoding="utf-8") as f:
            json.dump(wf, f, indent=2, ensure_ascii=False)
        print(f"Backup saved successfully to: {backup_file}")
        
    elif args.backup_all:
        backup_all(n8n_dir, args.dev)
        
    elif args.fix:
        print("Fetching workflow from n8n to apply fixes...")
        wf = fetch_workflow()
        nodes = wf.get("nodes", [])
        updated = False
        
        new_js_code = r"""// 1. Récupération du CV et des deux nouvelles propriétés Notion
const properties = $('Webhook').item.json.body?.data?.properties || {};
const richTextArray = properties.CV?.rich_text || [];

// Extraction propre depuis Get PageID
const company = $('Get PageID').first().json.company || 'company';
const jobTitle = $('Get PageID').first().json.jobTitle || 'job';

let mdText = richTextArray.map(block => block.plain_text || '').join('');

// Fallback: Parser Markdown robuste aligné sur marked.js
function robustMarkdownToHtml(md) {
  const lines = md.split(/\r?\n/);
  let htmlOutput = [];
  let inList = false;

  for (let line of lines) {
    let trimmed = line.trim();
    if (!/^[-\*]\s+/.test(trimmed) && inList) {
      htmlOutput.push('</ul>');
      inList = false;
    }
    if (trimmed === '---' || trimmed === '***') {
      htmlOutput.push('<hr />');
      continue;
    }
    if (trimmed.startsWith('>')) {
      let content = line.replace(/^>\s*/, '').trim().replace(/^"(.*)"$/, '$1');
      htmlOutput.push(`<blockquote>${content}</blockquote>`);
      continue;
    }
    if (trimmed.startsWith('# ')) { htmlOutput.push(`<h1>${trimmed.substring(2)}</h1>`); continue; }
    if (trimmed.startsWith('## ')) { htmlOutput.push(`<h2>${trimmed.substring(3)}</h2>`); continue; }
    if (trimmed.startsWith('### ')) { htmlOutput.push(`<h3>${trimmed.substring(4)}</h3>`); continue; }
    if (trimmed.startsWith('#### ')) { htmlOutput.push(`<h4>${trimmed.substring(5)}</h4>`); continue; }
    if (trimmed.startsWith('##### ')) { htmlOutput.push(`<h5>${trimmed.substring(6)}</h5>`); continue; }
    if (trimmed.startsWith('###### ')) { htmlOutput.push(`<h6>${trimmed.substring(7)}</h6>`); continue; }

    if (/^[-\*]\s+/.test(trimmed)) {
      if (!inList) { htmlOutput.push('<ul>'); inList = true; }
      htmlOutput.push(`<li>${trimmed.replace(/^[-\*]\s+/, '')}</li>`);
      continue;
    }
    if (trimmed !== '') {
      if (line.includes('•') || line.includes('·')) {
        htmlOutput.push(`<p style="text-align: justify; text-justify: inter-word;">${line}</p>`);
      } else {
        htmlOutput.push(`<p>${line}</p>`);
      }
    }
  }
  if (inList) htmlOutput.push('</ul>');

  let finalBody = htmlOutput.join('\n');
  finalBody = finalBody.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  finalBody = finalBody.replace(/\*(.*?)\*/g, '<em>$1</em>');
  finalBody = finalBody.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return finalBody;
}

// Fonction utilitaire pour nettoyer les caractères spéciaux du futur nom de fichier
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Supprime les accents
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/[^a-z0-9\-]/g, ''); // Supprime le reste
}

const finalFileName = `javarre-${slugify(company)}-${slugify(jobTitle)}`;

// 3. RECUPERATION CONFIG & CSS DE DATA TABLE
const config = JSON.parse($('Read Config from Table').first().json.value);
const templatesCss = $('Read CSS from Table').first().json.value;

// 4. PARSER MARKDOWN AVEC LE MEME COMPILATEUR QUE L'EDITEUR (MARKED.JS VIA CDN)
let compiledHtml;
try {
  const cdnUrl = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
  const response = await fetch(cdnUrl);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const markedText = await response.text();
  const evalGlobal = new Function(markedText + '\nreturn marked;');
  const marked = evalGlobal();
  
  marked.setOptions({
    gfm: true,
    breaks: true
  });
  
  let processedMd = mdText;
  processedMd = processedMd.replace(/:accent\[([^\]]+)\]/g, '<span class="resume-accent">$1</span>');
  processedMd = processedMd.replace(/:muted\[([^\]]+)\]/g, '<span class="resume-muted">$1</span>');
  
  compiledHtml = marked.parse(processedMd);
  
  // Post-process styling for paragraph tags with separators/bullets to justify
  compiledHtml = compiledHtml.replace(/<p>((?:(?!<\/p>).)*(?:[•·])(?:(?!<\/p>).)*)<\/p>/g, '<p style="text-align: justify; text-justify: inter-word;">$1</p>');
} catch (error) {
  console.warn('Fallback: Failed to load marked.js from CDN, using robustMarkdownToHtml', error);
  compiledHtml = robustMarkdownToHtml(mdText);
  compiledHtml = compiledHtml.replace(/:accent\[([^\]]+)\]/g, '<span class="resume-accent">$1</span>');
  compiledHtml = compiledHtml.replace(/:muted\[([^\]]+)\]/g, '<span class="resume-muted">$1</span>');
}

// Traitement du bloc contact si présent
compiledHtml = compiledHtml.replace(/\[CONTACT\s*:\s*([^\]]+)\]/gi, (match, contents) => {
    const parts = contents.split('|').map(p => p.trim());
    const formattedParts = parts.map(part => {
        if (part.includes('@') && !part.includes(' ')) {
            return `<a href="mailto:${part}">${part}</a>`;
        }
        if (part.startsWith('http://') || part.startsWith('https://')) {
            const cleanUrl = part.replace(/^https?:\/\/(www\.)?/, '');
            return `<a href="${part}" target="_blank">${cleanUrl}</a>`;
        }
        return `<span>${part}</span>`;
    });
    return `<div class="resume-contact-bar">${formattedParts.join(' &nbsp;•&nbsp; ')}</div>`;
});

// 5. LAYOUT 2 COLUMNS RESTRUCTURING
let finalHtml = compiledHtml;
if (config.layoutMode === '2-column') {
    const parts = compiledHtml.split(/(?=<h[23]\b)/i);
    const headerHtml = parts[0];
    let mainHtml = '';
    let sidebarHtml = '';
    
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part.toLowerCase().startsWith('<h2')) {
            mainHtml += part;
        } else if (part.toLowerCase().startsWith('<h3')) {
            sidebarHtml += part;
        }
    }
    
    finalHtml = `
        <div class="resume-header">
            ${headerHtml}
        </div>
        <div class="resume-columns ${config.sidebarPosition === 'left' ? 'sidebar-left' : ''}">
            <div class="resume-main-col">
                ${mainHtml}
            </div>
            <div class="resume-sidebar-col" style="background-color: ${config.sidebarBg}; color: ${config.sidebarText};">
                ${sidebarHtml}
            </div>
        </div>
    `;
}

// 6. GENERATE INLINE CSS VARIABLES
const inlineVariables = `
:root {
    --resume-font-family: ${config.fontFamily};
    --resume-font-size: ${config.fontSize}px;
    --resume-line-height: ${config.lineHeight};
    --resume-heading-scale: ${config.headingScale};
    --resume-margin-x: ${config.marginX}px;
    --resume-margin-y: ${config.marginY}px;
    --resume-section-spacing: ${config.sectionSpacing}px;
    --resume-color-bg: ${config.colorBg || '#ffffff'};
    --resume-color-headings: ${config.colorHeadings};
    --resume-color-body: ${config.colorBody};
    --resume-color-links: ${config.colorLinks};
    --resume-color-accent: ${config.colorAccent};
    --resume-sidebar-bg: ${config.sidebarBg || '#2d3748'};
    --resume-sidebar-text: ${config.sidebarText || '#ffffff'};
}`;

// 7. ASSEMBLE STANDALONE DOCUMENT
const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${finalFileName}</title>
  <style>
    /* INLINED_FONTS_PLACEHOLDER */
  </style>
  <style>
    ${inlineVariables}
    ${templatesCss}
    @media print {
      @page {
        size: A4 portrait;
        margin-top: ${config.marginY}px;
        margin-bottom: ${config.marginY}px;
        margin-left: ${config.marginX}px;
        margin-right: ${config.marginX}px;
      }
      .a4-sheet {
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
      }
    }
    body {
        background-color: var(--resume-color-bg, #ffffff);
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
    }
    .a4-sheet {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 auto;
    }
  </style>
</head>
<body>
  <article class="a4-sheet" id="resume-output">
    ${finalHtml}
  </article>
</body>
</html>`;

return [
  {
    json: {
      compiledBody: standaloneHtml,
      pdfFileName: finalFileName,
      printBackground: "true",
      marginTop: "0in",
      marginBottom: "0in",
      marginLeft: "0in",
      marginRight: "0in"
    }
  }
];"""

        fonts_css_path = os.path.join(os.path.dirname(__file__), "inlined_fonts.css")
        if os.path.exists(fonts_css_path):
            with open(fonts_css_path, "r", encoding="utf-8") as f:
                inlined_fonts_css = f.read()
        else:
            print("Warning: inlined_fonts.css not found, placeholder will not be replaced!")
            inlined_fonts_css = ""

        js_code_to_push = new_js_code.replace("/* INLINED_FONTS_PLACEHOLDER */", inlined_fonts_css)

        for node in nodes:
            if "code" in node.get("type", "").lower() and "Génération" in node.get("name", ""):
                print(f"Found target Code node: '{node.get('name')}'")
                js_code = node.get("parameters", {}).get("jsCode", "")
                if js_code != js_code_to_push:
                    node["parameters"]["jsCode"] = js_code_to_push
                    updated = True
                    print("Updated Génération Code node parameters to the latest version.")

        if updated:
            print("Applying corrections to n8n...")
            if push_workflow(wf):
                activate_workflow()
        else:
            print("No changes or fixes to apply. It might be already fixed.")
            
    elif args.push:
        if not os.path.exists(backup_file):
            print(f"Error: Local backup file not found at {backup_file}")
            sys.exit(1)
        print(f"Reading local workflow file from {backup_file}...")
        with open(backup_file, "r", encoding="utf-8") as f:
            wf = json.load(f)
        print("Pushing workflow to n8n...")
        if push_workflow(wf):
            activate_workflow()
            
    elif args.push_all:
        push_all(n8n_dir, args.dev)
            
    elif args.activate:
        print("Activating workflow on n8n...")
        activate_workflow()
        
    elif args.activate_all:
        activate_all()
        
    elif args.deploy_error:
        error_wf_file = os.path.join(os.path.dirname(__file__), "error_workflow.json")
        if not os.path.exists(error_wf_file):
            print(f"Error: Error workflow file not found at {error_wf_file}")
            sys.exit(1)
        print(f"Reading error workflow file from {error_wf_file}...")
        with open(error_wf_file, "r", encoding="utf-8") as f:
            error_wf = json.load(f)
        
        target_name = error_wf.get("name")
        print(f"Searching for existing workflow named '{target_name}'...")
        all_wfs = list_workflows()
        
        existing_wf_id = None
        for wf in all_wfs:
            if wf.get("name") == target_name:
                existing_wf_id = wf.get("id")
                break
                
        if existing_wf_id:
            print(f"Found existing workflow with ID {existing_wf_id}. Updating it...")
            if update_workflow_by_id(existing_wf_id, error_wf):
                activate_workflow_by_id(existing_wf_id)
        else:
            print("No existing workflow found. Creating a new one...")
            new_wf = create_workflow(error_wf)
            if new_wf:
                activate_workflow_by_id(new_wf.get("id"))

if __name__ == "__main__":
    main()
