#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# ==============================================================================
# Author: Éole <hi@eole.me>
# Creation Date: 2026-06-11
# Last Update: 2026-07-08
# License: MIT
#
# n8n Workflow Sync & Maintenance Toolkit. Supports logs fetching, backups, restores, and syntax patches.
# ==============================================================================

import json
import urllib.request
import urllib.error
import ssl
import sys
import os
import argparse
import re
import uuid
import datetime

# Ensure UTF-8 output on Windows to prevent UnicodeEncodeErrors with emojis
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


# Terminal escape sequences for TrueColor/ANSI styling
COLOR_RESET   = "\033[0m"
COLOR_BOLD    = "\033[1m"
COLOR_CYAN    = "\033[38;2;45;212;191m"
COLOR_GREEN   = "\033[38;2;74;222;128m"
COLOR_YELLOW  = "\033[38;2;253;224;71m"
COLOR_RED     = "\033[38;2;244;63;94m"
COLOR_PURPLE  = "\033[38;2;167;139;250m"
COLOR_GRAY    = "\033[38;2;156;163;175m"

# Semantic style variables (Meta-colorization)
STYLE_TITLE       = COLOR_CYAN
STYLE_SECTION     = COLOR_PURPLE
STYLE_PHASE       = COLOR_CYAN
STYLE_DISCREET    = COLOR_GRAY
STYLE_INSTRUCTION = COLOR_GREEN
STYLE_RESULT      = COLOR_GREEN
STYLE_WARNING     = COLOR_YELLOW
STYLE_ERROR       = COLOR_RED

def log_success(msg):
    print(f"  {STYLE_RESULT}✔{COLOR_RESET}  {msg}")

def log_warn(msg):
    print(f"  {STYLE_WARNING}⚠{COLOR_RESET}  {msg}")

def log_error(msg):
    print(f"  {STYLE_ERROR}✘{COLOR_RESET}  {msg}", file=sys.stderr)

def log_info(msg):
    print(f"  {STYLE_PHASE}ℹ{COLOR_RESET}  {msg}")

# Global configuration variables to be populated by ensure_env()
API_KEY = None
WORKFLOW_ID = None
BASE_URL = None
N8N_URL = None

# SSL context initialized in main
ctx = None

def generate_env(force=False):
    """
    Generates a default .env configuration file template for the toolkit.
    
    Args:
        force (bool): If True, overwrites the existing .env file.
        
    Returns:
        bool: True if file was created/updated, False if it already existed.
    """
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
    """
    Loads and validates n8n environment variables from the .env configuration file or system environment.
    
    Args:
        require_workflow_id (bool): If True, exits the script if no workflow ID is resolved.
        use_dev (bool): If True, uses DEV_ variables instead of production variables.
        api_key_override (str): Manual override for the n8n API Key.
        workflow_id_override (str): Manual override for the active workflow ID.
        base_url_override (str): Manual override for the n8n instance base URL.
    """
    global API_KEY, WORKFLOW_ID, BASE_URL, N8N_URL
    
    # Try current working directory first, fallback to script directory
    cwd_env = os.path.join(os.getcwd(), ".env")
    env_path = cwd_env if os.path.exists(cwd_env) else os.path.join(os.path.dirname(__file__), ".env")
    
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
        
    if use_dev:
        API_KEY = api_key_override or config.get("DEV_N8N_API_KEY") or os.environ.get("DEV_N8N_API_KEY")
        WORKFLOW_ID = workflow_id_override or config.get("DEV_N8N_WORKFLOW_ID") or os.environ.get("DEV_N8N_WORKFLOW_ID")
        BASE_URL = base_url_override or config.get("DEV_N8N_BASE_URL") or os.environ.get("DEV_N8N_BASE_URL") or "http://localhost:5678"
    else:
        API_KEY = api_key_override or config.get("N8N_API_KEY") or os.environ.get("N8N_API_KEY")
        WORKFLOW_ID = workflow_id_override or config.get("N8N_WORKFLOW_ID") or os.environ.get("N8N_WORKFLOW_ID")
        BASE_URL = base_url_override or config.get("N8N_BASE_URL") or os.environ.get("N8N_BASE_URL") or "https://n8n.eole.me"
        
    BASE_URL = BASE_URL.rstrip("/")
    
    if not API_KEY and not use_dev:
        print("Error: Missing credentials in .env file or environment.")
        print("Please ensure N8N_API_KEY and N8N_BASE_URL are populated in your .env file or environment.")
        sys.exit(1)
        
    if require_workflow_id and not WORKFLOW_ID:
        print("Error: Missing WORKFLOW_ID in .env file, environment, or command override (--id).")
        sys.exit(1)
        
    if WORKFLOW_ID:
        N8N_URL = f"{BASE_URL}/api/v1/workflows/{WORKFLOW_ID}"

def slugify(text):
    """
    Converts arbitrary string content into a URL-friendly, lowercase slug.
    
    Args:
        text (str): The string content to slugify.
        
    Returns:
        str: The cleaned and formatted slug string.
    """
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[-\s]+", "-", text).strip("-")

def get_relevant_comment():
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    git_msg = None
    for cwd in [None, os.path.dirname(os.path.abspath(__file__)), os.path.dirname(os.path.dirname(os.path.abspath(__file__)))]:
        try:
            import subprocess
            res = subprocess.run(
                ["git", "log", "-n", "1", "--oneline"],
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=True
            )
            if res.stdout.strip():
                git_msg = res.stdout.strip()
                break
        except Exception:
            continue
            
    if not git_msg:
        git_msg = "No git commit info available"
        
    return f"Published on {timestamp} | Git: {git_msg}"

def update_publish_info_nodes(wf, comment):
    # Update root level comment
    wf["//"] = comment
    
    # Find or create sticky note
    nodes = wf.setdefault("nodes", [])
    sticky_node = None
    for node in nodes:
        if node.get("name") == "Last Publish Info" and node.get("type") == "n8n-nodes-base.stickyNote":
            sticky_node = node
            break
            
    if not sticky_node:
        min_x = 0
        min_y = 0
        if nodes:
            xs = [n.get("position", [0, 0])[0] for n in nodes if n.get("position")]
            ys = [n.get("position", [0, 0])[1] for n in nodes if n.get("position")]
            if xs:
                min_x = min(xs)
            if ys:
                min_y = min(ys)
        
        sticky_node = {
            "parameters": {
                "content": "",
                "height": 150,
                "width": 300,
                "color": 6
            },
            "id": str(uuid.uuid4()),
            "name": "Last Publish Info",
            "type": "n8n-nodes-base.stickyNote",
            "typeVersion": 1,
            "position": [min_x - 350, min_y]
        }
        nodes.append(sticky_node)
        
    sticky_node["parameters"]["content"] = f"### Last Publish Info\n\n{comment}"

def fetch_workflow():
    """
    Downloads the active workflow configuration from the target n8n instance.
    
    Returns:
        dict: The parsed JSON representation of the workflow.
    """
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
    """
    Pushes a workflow structure to update the active workflow on the n8n instance.
    
    Args:
        wf (dict): The workflow JSON object.
        
    Returns:
        bool: True if updated successfully, False otherwise.
    """
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
        print(f"Error push workflow: {e}")
        return False

def activate_workflow():
    """
    Triggers publishing/activation of the active workflow on the n8n instance.
    
    Returns:
        bool: True if successfully activated, False otherwise.
    """
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

def deactivate_workflow_by_id(workflow_id):
    """
    Deactivates a specific workflow on n8n by its ID.
    
    Args:
        workflow_id (str): The target n8n workflow ID.
        
    Returns:
        bool: True if successfully deactivated, False otherwise.
    """
    url = f"{BASE_URL}/api/v1/workflows/{workflow_id}/deactivate"
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
                print(f"SUCCESS: Workflow {workflow_id} successfully deactivated on n8n!")
                return True
    except Exception as e:
        print(f"Warning: Could not deactivate workflow {workflow_id}: {e}")
    return False

def list_workflows():
    """
    Fetches the metadata list of all workflows configured on the target n8n server.
    
    Returns:
        list: A list of dict objects containing workflow metadata.
    """
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

def fetch_executions(limit=10, status=None):
    """
    Queries and prints recent execution logs/history from the target n8n instance.
    
    Args:
        limit (int): The maximum number of executions to fetch (default: 10).
        status (str): Optional status filter ('success', 'failed', 'running', 'waiting').
    """
    global API_KEY, BASE_URL, WORKFLOW_ID
    url = f"{BASE_URL}/api/v1/executions"
    params = []
    if WORKFLOW_ID:
        params.append(f"workflowId={WORKFLOW_ID}")
    params.append(f"limit={limit}")
    if status:
        api_status = "error" if status == "failed" else status
        params.append(f"status={api_status}")
        
    url += "?" + "&".join(params)
    
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
                executions = res.get("data", [])
                if not executions:
                    print("No executions found.")
                    return
                print(f"\n📋 Last {len(executions)} executions on {BASE_URL}:")
                print("-" * 80)
                for item in executions:
                    e_id = item.get("id")
                    e_status = item.get("status", "unknown").upper()
                    started = item.get("startedAt", "")
                    stopped = item.get("stoppedAt", "")
                    w_id = item.get("workflowId", "")
                    
                    status_symbol = "🟢" if e_status == "SUCCESS" else "🔴" if e_status == "FAILED" else "🟡"
                    print(f"{status_symbol} Execution ID: {e_id} | Status: {e_status} | Workflow ID: {w_id}")
                    print(f"   Started: {started} | Stopped: {stopped}")
                    
                    error = item.get("error")
                    if error:
                        if isinstance(error, dict):
                            print(f"   ❌ Error: {error.get('message', 'Unknown error')}")
                            if error.get("description"):
                                print(f"      Description: {error.get('description')}")
                        else:
                            print(f"   ❌ Error: {error}")
                    print("-" * 80)
            else:
                print(f"Failed to fetch executions, status={response.status}")
    except Exception as e:
        print(f"Error fetching executions: {e}")

def create_workflow(wf):
    """
    Creates a new workflow on the target n8n instance.
    
    Args:
        wf (dict): The workflow configuration to create.
        
    Returns:
        dict: The created workflow metadata on success, None on failure.
    """
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
    """
    Updates an existing workflow on n8n by its workflow ID.
    
    Args:
        workflow_id (str): The target n8n workflow ID.
        wf (dict): The workflow configuration to push.
        
    Returns:
        bool: True if successfully updated, False otherwise.
    """
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
    """
    Activates/Publishes a specific workflow on n8n by its ID.
    
    Args:
        workflow_id (str): The target n8n workflow ID.
        
    Returns:
        bool: True if successfully activated, False otherwise.
    """
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

def backup_all(n8n_dir, use_dev, container_name="n8n-server-dev"):
    """
    Downloads all workflows from n8n and saves them locally as JSON files.
    If in dev mode without an API key, falls back to using local Docker CLI exports.
    
    Args:
        n8n_dir (str): Destination directory path.
        use_dev (bool): Whether to attempt Docker fallback if API credentials are missing.
        container_name (str): Docker container name for the fallback command.
        
    Returns:
        bool: True if successful, False otherwise.
    """
    import subprocess
    global API_KEY, BASE_URL
    
    if use_dev and not API_KEY:
        print("API Key not set. Attempting Docker fallback for workflow export...")
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
                        print(f"  - Saved: {n8n_dir}/{filename} (ID: {wf_id})")
                print("SUCCESS: All workflows saved locally.")
                return True
            else:
                print(f"Error: Server returned status {response.status}")
                sys.exit(1)
    except Exception as e:
        print(f"Error fetching workflows: {e}")
        sys.exit(1)

def push_all(n8n_dir, use_dev, container_name="n8n-server-dev"):
    """
    Imports/updates all local JSON workflows in the target n8n instance.
    If in dev mode without an API key, falls back to using local Docker CLI imports.
    
    Args:
        n8n_dir (str): Source directory containing local workflow JSON files.
        use_dev (bool): Whether to attempt Docker fallback if API credentials are missing.
        container_name (str): Docker container name for the fallback command.
        
    Returns:
        bool: True if successful, False otherwise.
    """
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
    comment = get_relevant_comment()
    
    for filename in json_files:
        file_path = os.path.join(n8n_dir, filename)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                wf = json.load(f)
        except Exception as e:
            print(f"Error reading workflow file '{filename}': {e}. Skipping.")
            continue
            
        update_publish_info_nodes(wf, comment)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(wf, f, indent=2, ensure_ascii=False)
            
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
    """
    Loops through all workflows registered on n8n and activates them.
    """
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

def deactivate_all():
    """
    Loops through all workflows registered on n8n and deactivates them.
    """
    global API_KEY, BASE_URL
    print(f"Listing workflows to deactivate on: {BASE_URL}")
    workflows = list_workflows()
    count = 0
    for wf in workflows:
        wf_id = wf.get("id")
        if wf_id:
            print(f"Deactivating workflow: '{wf.get('name')}' (ID: {wf_id})...")
            if deactivate_workflow_by_id(wf_id):
                count += 1
    print(f"SUCCESS: Deactivated {count} workflows.")

def retry_execution(execution_id):
    """
    Retries a failed execution by ID via n8n public API.
    """
    url = f"{BASE_URL}/api/v1/executions/{execution_id}/retry"
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
            if response.status in (200, 201):
                res = json.loads(response.read().decode('utf-8'))
                print(f"SUCCESS: Successfully triggered retry for execution {execution_id}.")
                print(f"New Execution ID: {res.get('id') or 'unknown'}")
                return True
    except urllib.error.HTTPError as e:
        print(f"HTTPError retrying execution {execution_id}: {e.code} - {e.reason}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"Error retrying execution {execution_id}: {e}")
    return False

def inspect_execution(execution_id):
    """
    Fetches details of a specific execution and prints detailed error logs if failed.
    """
    url = f"{BASE_URL}/api/v1/executions/{execution_id}"
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
                item = json.loads(response.read().decode('utf-8'))
                print(f"\n🔍 Inspecting Execution ID: {execution_id}")
                print("-" * 80)
                e_status = item.get("status", "unknown").upper()
                w_id = item.get("workflowId", "")
                started = item.get("startedAt", "")
                stopped = item.get("stoppedAt", "")
                
                status_symbol = "🟢" if e_status == "SUCCESS" else "🔴" if e_status == "FAILED" else "🟡"
                print(f"Status: {status_symbol} {e_status} | Workflow ID: {w_id}")
                print(f"Timestamps: Started {started} | Stopped {stopped}")
                
                error = item.get("error")
                if error:
                    print(f"❌ Failure Details:")
                    if isinstance(error, dict):
                        print(f"   Message: {error.get('message', 'Unknown error')}")
                        if error.get("description"):
                            print(f"   Description: {error.get('description')}")
                        if error.get("stack"):
                            print(f"   Stack Trace:\n{error.get('stack')}")
                    else:
                        print(f"   Message: {error}")
                
                # Check for failed node execution details
                execution_data = item.get("data", {})
                result_data = execution_data.get("resultData", {})
                run_data = result_data.get("runData", {})
                
                failed_nodes = []
                for node_name, run_info in run_data.items():
                    for run_index, task_info in enumerate(run_info):
                        if task_info.get("error"):
                            failed_nodes.append((node_name, task_info.get("error")))
                
                if failed_nodes:
                    print("\n🛑 Failed Node Details:")
                    for node_name, node_error in failed_nodes:
                        print(f"  • Node Name: '{node_name}'")
                        if isinstance(node_error, dict):
                            print(f"    Error: {node_error.get('message') or node_error.get('description')}")
                        else:
                            print(f"    Error: {node_error}")
                print("-" * 80)
                return True
    except urllib.error.HTTPError as e:
        print(f"HTTPError fetching execution {execution_id}: {e.code} - {e.reason}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching execution {execution_id}: {e}")
    return False

def check_credentials(n8n_dir):
    """
    Fetches registered credentials from n8n and checks them against credentials referenced in local workflows.
    """
    global API_KEY, BASE_URL
    print(f"Fetching registered credentials from n8n at {BASE_URL}...")
    url = f"{BASE_URL}/api/v1/credentials"
    req = urllib.request.Request(
        url,
        headers={
            "X-N8N-API-KEY": API_KEY,
            "Accept": "application/json"
        },
        method="GET"
    )
    
    server_creds = set()
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.status == 200:
                creds_data = json.loads(response.read().decode('utf-8')).get("data", [])
                for cred in creds_data:
                    c_name = cred.get("name")
                    c_id = cred.get("id")
                    if c_name:
                        server_creds.add(c_name)
                    if c_id:
                        server_creds.add(c_id)
    except Exception as e:
        print(f"Error fetching credentials: {e}")
        return False
        
    print(f"Found {len(server_creds)} configured credentials on n8n server.")
    
    # Read local workflows and search for referenced credentials
    if not os.path.exists(n8n_dir):
        print(f"Warning: Workflow directory '{n8n_dir}' does not exist. Cannot check local workflow credentials.")
        return False
        
    json_files = [f for f in os.listdir(n8n_dir) if f.endswith(".json")]
    if not json_files:
        print("No local workflow files found to inspect.")
        return True
        
    print(f"Analyzing {len(json_files)} local workflows for credentials...")
    referenced_creds = {}
    
    for filename in json_files:
        file_path = os.path.join(n8n_dir, filename)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                wf = json.load(f)
                nodes = wf.get("nodes", [])
                for node in nodes:
                    credentials = node.get("credentials")
                    if credentials:
                        for cred_type, cred_ref in credentials.items():
                            cred_name = cred_ref.get("id") or cred_ref.get("name")
                            if cred_name:
                                referenced_creds.setdefault(cred_name, []).append(wf.get("name", filename))
        except Exception as e:
            continue

    if not referenced_creds:
        print("No credentials references found in local workflows.")
        return True
        
    print("\n🔍 Cross-referencing credentials:")
    print("-" * 80)
    missing_count = 0
    for cred_name, wf_list in referenced_creds.items():
        unique_wfs = list(set(wf_list))
        if cred_name in server_creds:
            print(f"🟢 OK: '{cred_name}' is configured on server (used by: {', '.join(unique_wfs)})")
        else:
            print(f"⚠️  MISSING: '{cred_name}' NOT found on server! (required by: {', '.join(unique_wfs)})")
            missing_count += 1
            
    print("-" * 80)
    if missing_count > 0:
        print(f"WARNING: {missing_count} required credentials seem to be missing on the target n8n instance.")
        print("Please configure them in the n8n UI before executing these workflows.")
    else:
        print("SUCCESS: All referenced credentials are present on the target server.")
    return True

def sync_token(n8n_dir, use_dev=False, container_name="n8n-server-dev", credential_name="webhook-token"):
    """
    1. Reads X_N8N_TOKEN from .env.
    2. Creates or updates the httpHeaderAuth credential via n8n API.
    3. Programmatically modifies local workflows in n8n_dir to:
       - Set Webhook node to use Header Auth and bind it to the credential.
       - Remove vps_token setting from Load Token node.
       - Configure Verify Token node as a pass-through.
     4. Pushes the modified workflows to the n8n server.
    """
    global API_KEY, BASE_URL
    
    if not API_KEY:
        print("Error: N8N API Key is required to sync credentials. Please set it in your .env or pass --api-key.")
        return False
        
    # 1. Resolve X_N8N_TOKEN
    env_paths = [
        os.path.join(os.path.dirname(n8n_dir), ".env"),
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.path.dirname(__file__), ".env")
    ]
    
    token_value = os.environ.get("X_N8N_TOKEN")
    if token_value:
        print("Loaded X_N8N_TOKEN from environment variables.")
    else:
        for env_path in env_paths:
            if os.path.exists(env_path):
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip().startswith("X_N8N_TOKEN="):
                            token_value = line.split("=", 1)[1].strip().strip('"').strip("'")
                            break
                if token_value:
                    print(f"Loaded X_N8N_TOKEN from {env_path}")
                    break
                
    if not token_value:
        print("Error: X_N8N_TOKEN not found in environment or any .env file checked.")
        return False
        
    print(f"Token value: {token_value[:6]}...{token_value[-6:]}")
    
    # 2. Check n8n server for credential
    print(f"Checking registered credentials on n8n server for '{credential_name}'...")
    url = f"{BASE_URL}/api/v1/credentials"
    req = urllib.request.Request(
        url,
        headers={"X-N8N-API-KEY": API_KEY, "Accept": "application/json"}
    )
    
    cred_id = None
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.status == 200:
                creds = json.loads(response.read().decode('utf-8')).get("data", [])
                for c in creds:
                    if c.get("name") == credential_name and c.get("type") == "httpHeaderAuth":
                        cred_id = c.get("id")
                        break
    except Exception as e:
        print(f"Error checking credentials: {e}")
        return False
        
    payload = {
        "name": credential_name,
        "type": "httpHeaderAuth",
        "data": {
            "name": "x-n8n-token",
            "value": token_value,
            "allowedHttpRequestDomains": "all"
        }
    }
    
    if cred_id:
        print(f"Credential '{credential_name}' already exists (ID: {cred_id}). Deleting old one to recreate...")
        cred_url = f"{BASE_URL}/api/v1/credentials/{cred_id}"
        del_req = urllib.request.Request(
            cred_url,
            headers={"X-N8N-API-KEY": API_KEY},
            method="DELETE"
        )
        try:
            with urllib.request.urlopen(del_req, context=ctx) as response:
                if response.status == 200:
                    print(f"Successfully deleted old credential {cred_id}.")
        except Exception as e:
            print(f"Warning: Could not delete old credential: {e}")

    print(f"Creating credential '{credential_name}'...")
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
                res_data = json.loads(response.read().decode('utf-8'))
                cred_id = res_data.get("id")
                print(f"SUCCESS: Credential sync completed. (ID: {cred_id})")
            else:
                print(f"Failed to sync credential, status={response.status}")
                return False
    except Exception as e:
        print(f"Error syncing credential: {e}")
        return False
        
    # 3. Modify local workflow JSON files
    if not os.path.exists(n8n_dir):
        print(f"Error: Workflows directory '{n8n_dir}' does not exist.")
        return False
        
    json_files = [f for f in os.listdir(n8n_dir) if f.endswith(".json")]
    modified_any = False
    
    for filename in json_files:
        file_path = os.path.join(n8n_dir, filename)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                wf = json.load(f)
        except Exception:
            continue
            
        nodes = wf.get("nodes", [])
        webhook_node = None
        load_token_node = None
        verify_token_node = None
        file_modified = False
        
        # Generic credential ID update
        for n in nodes:
            creds = n.get("credentials", {})
            for cred_type, cred_ref in creds.items():
                if cred_ref.get("name") == credential_name and cred_ref.get("id") != cred_id:
                    print(f"  - Updating credential '{credential_name}' ID to {cred_id} in node '{n.get('name')}'")
                    cred_ref["id"] = cred_id
                    file_modified = True
            
            # Identify specific nodes for compatibility patches
            if n.get("type") == "n8n-nodes-base.webhook" and n.get("name") == "Webhook":
                webhook_node = n
            elif n.get("type") == "n8n-nodes-base.set" and n.get("name") == "Load Token":
                load_token_node = n
            elif n.get("type") == "n8n-nodes-base.code" and n.get("name") == "Verify Token":
                verify_token_node = n

        if webhook_node and (load_token_node or verify_token_node):
            # Configure Webhook Auth
            if webhook_node.get("parameters", {}).get("authentication") != "headerAuth":
                webhook_node.setdefault("parameters", {})["authentication"] = "headerAuth"
                file_modified = True
            
            web_creds = webhook_node.setdefault("credentials", {}).setdefault("httpHeaderAuth", {})
            if web_creds.get("id") != cred_id:
                web_creds["id"] = cred_id
                web_creds["name"] = credential_name
                file_modified = True
            
            # Remove vps_token parameter from Load Token if present
            if load_token_node:
                vals = load_token_node.get("parameters", {}).get("values", {})
                strings = vals.get("string", [])
                new_strings = [s for s in strings if s.get("name") != "vps_token"]
                if len(new_strings) != len(strings):
                    vals["string"] = new_strings
                    file_modified = True
                
            # If Verify Token node exists, update its jsCode to be a secure pass-through
            if verify_token_node:
                expected_js = "return { json: { system_prompt: $input.item.json.body.system_prompt, body: $input.item.json.body } };"
                if verify_token_node.get("parameters", {}).get("jsCode") != expected_js:
                    verify_token_node.setdefault("parameters", {})["jsCode"] = expected_js
                    print(f"  - Updated 'Verify Token' node to be a secure pass-through.")
                    file_modified = True
                    
        if file_modified:
            print(f"Modifying workflow file: '{filename}'...")
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(wf, f, indent=2, ensure_ascii=False)
            modified_any = True
            
    if modified_any:
        print("SUCCESS: Local workflows modified. Pushing updated workflows to n8n server...")
        return push_all(n8n_dir, use_dev=use_dev, container_name=container_name)
        
    return True

def main():
    """
    Main CLI entrypoint. Parses arguments and dispatches the corresponding utility actions.
    """
    global ctx
    parser = argparse.ArgumentParser(description="n8n Jobby Workflow Sync & Maintenance Toolkit")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--backup", action="store_true", help="Download current workflow from n8n and save as local backup JSON")
    group.add_argument("--backup-all", action="store_true", help="Download all workflows from n8n and save in local n8n/ directory")
    group.add_argument("--fix", action="store_true", help="Automatically fix the JS Code node syntax errors (split/join newline bugs) and H3 -> H2 structural splitting")
    group.add_argument("--push", action="store_true", help="Push the local backup JSON workflow back to n8n")
    group.add_argument("--push-all", action="store_true", help="Push/import all workflows in local n8n/ directory to the target n8n instance")
    group.add_argument("--activate", action="store_true", help="Activate/Publish the workflow on n8n")
    group.add_argument("--activate-all", action="store_true", help="Activate/Publish all workflows on n8n")
    group.add_argument("--deactivate", action="store_true", help="Deactivate the workflow on n8n")
    group.add_argument("--deactivate-all", action="store_true", help="Deactivate all workflows on n8n")
    group.add_argument("--deploy-error", action="store_true", help="Deploy the error trigger to Axiom workflow to n8n")
    group.add_argument("--init-env", action="store_true", help="Generate a default .env file template")
    group.add_argument("--logs", action="store_true", help="Fetch and display execution logs/history from n8n")
    group.add_argument("--retry", type=str, metavar="EXECUTION_ID", help="Retry a failed execution by its ID")
    group.add_argument("--inspect", type=str, metavar="EXECUTION_ID", help="Inspect detailed error logs of a specific execution ID")
    group.add_argument("--check-credentials", action="store_true", help="Check if n8n server has credentials required by local workflows")
    group.add_argument("--sync-token", action="store_true", help="Sync Webhook token credential to n8n server and update local workflows")
    
    parser.add_argument("--dev", action="store_true", help="Target the local development n8n instance instead of production")
    parser.add_argument("--id", type=str, help="Override N8N_WORKFLOW_ID / DEV_N8N_WORKFLOW_ID")
    parser.add_argument("--api-key", type=str, help="Override N8N_API_KEY / DEV_N8N_API_KEY")
    parser.add_argument("--base-url", type=str, help="Override N8N_BASE_URL / DEV_N8N_BASE_URL")
    parser.add_argument("--file", type=str, help="Override input/output file path for --backup, --push, or --fix")
    parser.add_argument("--dir", type=str, help="Override n8n directory (defaults to workspace 'n8n/' if found, otherwise skill's 'n8n/')")
    parser.add_argument("--container", type=str, default="n8n-server-dev", help="Name of Docker container for dev backup/push fallback (default: n8n-server-dev)")
    parser.add_argument("--credential-name", type=str, default="webhook-token", help="Name of n8n httpHeaderAuth credential (default: webhook-token)")
    parser.add_argument("--insecure", action="store_true", help="Bypass SSL certificate verification")
    parser.add_argument("--limit", type=int, default=10, help="Number of execution logs to fetch (default: 10)")
    parser.add_argument("--status", type=str, choices=["success", "failed", "error", "running", "waiting"], help="Filter executions by status")

    args = parser.parse_args()
    
    if args.init_env:
        generate_env(force=True)
        sys.exit(0)
        
    require_wf_id = not (args.backup_all or args.push_all or args.activate_all or args.deactivate_all or args.deploy_error or args.logs or args.retry or args.inspect or args.check_credentials or args.sync_token)
    
    ensure_env(
        require_workflow_id=require_wf_id,
        use_dev=args.dev,
        api_key_override=args.api_key,
        workflow_id_override=args.id,
        base_url_override=args.base_url
    )
    
    # Initialize SSL context
    if args.dev or args.insecure:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    else:
        ctx = ssl.create_default_context()
        
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    if args.dir:
        n8n_dir = os.path.abspath(args.dir)
    else:
        # Check if an 'n8n' folder exists in the current working directory
        cwd_n8n = os.path.join(os.getcwd(), "n8n")
        if os.path.isdir(cwd_n8n):
            n8n_dir = cwd_n8n
        else:
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
        backup_all(n8n_dir, args.dev, container_name=args.container)
        
    elif args.fix:
        print("Fetching workflow from n8n to apply fixes...")
        
        # Load JS template dynamically from templates/generation_node.js
        templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")
        template_file = os.path.join(templates_dir, "generation_node.js")
        
        if not os.path.exists(template_file):
            print(f"Error: JS template file not found at {template_file}")
            sys.exit(1)
            
        with open(template_file, "r", encoding="utf-8") as tf:
            new_js_code = tf.read()
            
        wf = fetch_workflow()
        nodes = wf.get("nodes", [])
        updated = False

        fonts_css_path = os.path.join(os.path.dirname(__file__), "inlined_fonts.css")
        if os.path.exists(fonts_css_path):
            with open(fonts_css_path, "r", encoding="utf-8") as f:
                inlined_fonts_css = f.read()
        else:
            print("Warning: inlined_fonts.css not found, placeholder will not be replaced!")
            inlined_fonts_css = ""

        js_code_to_push = new_js_code.replace("/* INLINED_FONTS_PLACEHOLDER */", inlined_fonts_css)

        for node in nodes:
            if "code" in node.get("type", "").lower() and ("Génération" in node.get("name", "") or "Generation" in node.get("name", "")):
                print(f"Found target Code node: '{node.get('name')}'")
                js_code = node.get("parameters", {}).get("jsCode", "")
                if js_code != js_code_to_push:
                    node["parameters"]["jsCode"] = js_code_to_push
                    updated = True
                    print("Updated Generation Code node parameters to the latest version.")

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
            
        comment = get_relevant_comment()
        update_publish_info_nodes(wf, comment)
        with open(backup_file, "w", encoding="utf-8") as f:
            json.dump(wf, f, indent=2, ensure_ascii=False)
            
        print("Pushing workflow to n8n...")
        if push_workflow(wf):
            activate_workflow()
            
    elif args.push_all:
        push_all(n8n_dir, args.dev, container_name=args.container)
            
    elif args.activate:
        print("Activating workflow on n8n...")
        activate_workflow()
        
    elif args.activate_all:
        activate_all()

    elif args.deactivate:
        print("Deactivating workflow on n8n...")
        if WORKFLOW_ID:
            deactivate_workflow_by_id(WORKFLOW_ID)
            
    elif args.deactivate_all:
        deactivate_all()
        
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
                
    elif args.logs:
        fetch_executions(limit=args.limit, status=args.status)
        
    elif args.retry:
        retry_execution(args.retry)
        
    elif args.inspect:
        inspect_execution(args.inspect)
        
    elif args.check_credentials:
        check_credentials(n8n_dir)
        
    elif args.sync_token:
        sync_token(n8n_dir, use_dev=args.dev, container_name=args.container, credential_name=args.credential_name)

if __name__ == "__main__":
    main()
