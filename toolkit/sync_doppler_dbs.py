#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# ==============================================================================
# Author: Éole <hi@eole.me>
# Creation Date: 2026-07-08
# Last Update: 2026-07-08
# License: MIT
#
# Synchronizes Notion database UIDs from Doppler configurations to n8n Data Tables for the Jobby subproject.
# ==============================================================================

import os
import json
import urllib.request
import ssl
import sys
import subprocess

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


def get_n8n_headers(n_api_key):
    return {
        "X-N8N-API-KEY": n_api_key,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

def push_doppler_to_n8n(n_base_url, n_api_key, table_id, mappings):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    print(f"[*] Pushing Doppler database IDs to n8n data table '{table_id}'...")

    for env_name, table_key in mappings.items():
        val = os.environ.get(env_name)
        if not val:
            print(f"[i] Skipping {env_name} (not found in Doppler/env)")
            continue

        val = val.strip().replace('"', '').replace("'", "")
        print(f"Upserting row: key='{table_key}'")

        payload = {
            "filter": {
                "type": "and",
                "filters": [
                    {
                        "columnName": "key",
                        "condition": "eq",
                        "value": table_key
                    }
                ]
            },
            "data": {
                "key": table_key,
                "value": val
            }
        }

        req = urllib.request.Request(
            f"{n_base_url}/api/v1/data-tables/{table_id}/rows/upsert",
            data=json.dumps(payload).encode("utf-8"),
            headers=get_n8n_headers(n_api_key),
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, context=ctx) as res:
                res.read()
            print(f"[OK] Successfully pushed '{table_key}' to n8n.")
        except Exception as e:
            print(f"[ERR] Failed to push '{table_key}': {e}")

def pull_n8n_to_doppler(n_base_url, n_api_key, table_id, mappings):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    print(f"[*] Pulling config from n8n data table '{table_id}' to Doppler...")

    req = urllib.request.Request(
        f"{n_base_url}/api/v1/data-tables/{table_id}/rows?limit=250",
        headers=get_n8n_headers(n_api_key),
        method="GET"
    )

    try:
        with urllib.request.urlopen(req, context=ctx) as res:
            response_data = json.loads(res.read().decode("utf-8"))
    except Exception as e:
        print(f"[ERR] Failed to fetch rows from n8n: {e}")
        return

    rows = response_data.get("data", [])
    if not rows:
        print("[i] No rows found in n8n table.")
        return

    # Invert the mapping to find Doppler keys by table keys
    rev_mappings = {v: k for k, v in mappings.items()}
    db_ids_to_set = {}

    for row in rows:
        key = row.get("key")
        val = row.get("value")
        if key in rev_mappings and val:
            db_ids_to_set[rev_mappings[key]] = val

    if not db_ids_to_set:
        print("[i] No matching Jobby database configuration keys found in n8n table to pull.")
        return

    # Call Doppler CLI to set the database IDs
    project = os.environ.get("DOPPLER_PROJECT", "eole-me")
    config = os.environ.get("DOPPLER_CONFIG", "prd_eole-me-jobby")

    cmd = ["doppler", "secrets", "set", f"--project={project}", f"--config={config}"]
    for k, v in db_ids_to_set.items():
        cmd.append(f"{k}={v}")

    print(f"Updating Doppler config '{config}' with {len(db_ids_to_set)} database IDs...")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, errors="ignore")
        print("[OK] Successfully updated Doppler database config!")
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"[ERR] Failed to write database IDs to Doppler: {e.stderr or e.output}")

def list_dbs(n_base_url, n_api_key, table_id, mappings):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    print(f"[*] Fetching database IDs from n8n data table '{table_id}'...")

    req = urllib.request.Request(
        f"{n_base_url}/api/v1/data-tables/{table_id}/rows?limit=250",
        headers=get_n8n_headers(n_api_key),
        method="GET"
    )

    try:
        with urllib.request.urlopen(req, context=ctx) as res:
            response_data = json.loads(res.read().decode("utf-8"))
    except Exception as e:
        print(f"[ERR] Failed to fetch rows from n8n: {e}")
        return

    rows = response_data.get("data", [])
    n8n_vals = {}
    for row in rows:
        key = row.get("key")
        val = row.get("value")
        if key and val:
            n8n_vals[key] = val

    # ANSI color codes
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RESET = "\033[0m"

    print("\nJobby Notion Database Configuration Comparison:")
    divider = "-" * 85
    print(divider)
    print(f"{'Database Name (Key)':<25} | {'Doppler Value':<20} | {'n8n Value':<20} | {'Status':<10}")
    print(divider)

    has_diffs = False

    for env_name, table_key in mappings.items():
        doppler_val = os.environ.get(env_name, "").strip().replace('"', '').replace("'", "")
        n8n_val = n8n_vals.get(table_key, "").strip()

        doppler_display = doppler_val if doppler_val else "Not Set"
        n8n_display = n8n_val if n8n_val else "Not Set"

        # Truncate for display if long
        if len(doppler_display) > 17:
            doppler_display = doppler_display[:14] + "..."
        if len(n8n_display) > 17:
            n8n_display = n8n_display[:14] + "..."

        if doppler_val == n8n_val:
            if not doppler_val:
                status_raw = "NOT SET"
                status_color = RED
                has_diffs = True  # Treat NOT SET as an issue to prompt action
            else:
                status_raw = "MATCH"
                status_color = GREEN
        else:
            status_raw = "DIFF"
            status_color = RED
            has_diffs = True

        # Pad first to preserve column alignment, then wrap with color
        doppler_padded = f"{doppler_display:<20}"
        n8n_padded = f"{n8n_display:<20}"
        status_padded = f"{status_raw:<10}"

        if not doppler_val:
            doppler_padded = f"{RED}{doppler_padded}{RESET}"
        if not n8n_val:
            n8n_padded = f"{RED}{n8n_padded}{RESET}"

        status_colored = f"{status_color}{status_padded}{RESET}"

        print(f"{table_key:<25} | {doppler_padded} | {n8n_padded} | {status_colored}")

    print(divider)
    if has_diffs:
        # Check if they are just not set or actually differ
        actual_diff = False
        for env_name, table_key in mappings.items():
            d_val = os.environ.get(env_name, "").strip()
            n_val = n8n_vals.get(table_key, "").strip()
            if d_val != n_val:
                actual_diff = True
                break
        
        if actual_diff:
            print(f"{RED}[!] Warning: Differences detected between Doppler and n8n database IDs.{RESET}")
        else:
            print(f"{RED}[!] Warning: Some database IDs are Not Set (missing configuration).{RESET}")
        
        print("    Run 'make n8n-push-dbs' to push Doppler -> n8n.")
        print("    Run 'make n8n-pull-dbs' to pull n8n -> Doppler.")
    else:
        print(f"{GREEN}[OK] Doppler and n8n database IDs are in sync.{RESET}")
    print()

def main():
    n_base_url = os.environ.get("N8N_BASE_URL", "https://n8n.eole.me")
    n_api_key = os.environ.get("N8N_API_KEY")
    table_id = "OtWoNuYUmoj7knoz"

    if not n_api_key:
        print("Error: N8N_API_KEY environment variable is not set.")
        sys.exit(1)

    mappings = {
        "JOBBY_NOTION_DETECTOR_DB_ID": "notion_detector_db_id",
        "JOBBY_NOTION_FEEDBACK_DB_ID": "notion_feedback_db_id",
        "JOBBY_NOTION_TELEMETRY_DB_ID": "notion_telemetry_db_id",
        "JOBBY_NOTION_ATOM_CV_DB_ID": "notion_atom_cv_db_id",
        "JOBBY_NOTION_SEED_DB_ID": "notion_seed_db_id",
    }

    mode = "push"
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg in ["pull", "from-n8n"]:
            mode = "pull"
        elif arg in ["push", "to-n8n"]:
            mode = "push"
        elif arg in ["list", "diff", "compare"]:
            mode = "list"

    if mode == "push":
        push_doppler_to_n8n(n_base_url, n_api_key, table_id, mappings)
    elif mode == "pull":
        pull_n8n_to_doppler(n_base_url, n_api_key, table_id, mappings)
    elif mode == "list":
        list_dbs(n_base_url, n_api_key, table_id, mappings)

if __name__ == "__main__":
    main()
