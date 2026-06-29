import os
import json
import urllib.request
import ssl
import sys
import subprocess

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

def main():
    n_base_url = os.environ.get("N8N_BASE_URL", "https://n8n.eole.me")
    n_api_key = os.environ.get("N8N_API_KEY")
    table_id = "OtWoNuYUmoj7knoz"

    if not n_api_key:
        print("Error: N8N_API_KEY environment variable is not set.")
        sys.exit(1)

    mappings = {
        "JOBBY_DETECTOR_DB_ID": "notion_detector_db_id",
        "JOBBY_FEEDBACK_DB_ID": "notion_feedback_db_id",
        "JOBBY_TELEMETRY_DB_ID": "notion_telemetry_db_id",
        "JOBBY_ATOM_CV_DB_ID": "notion_atom_cv_db_id",
        "JOBBY_SEED_DB_ID": "notion_seed_db_id",
    }

    mode = "push"
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg in ["pull", "from-n8n"]:
            mode = "pull"
        elif arg in ["push", "to-n8n"]:
            mode = "push"

    if mode == "push":
        push_doppler_to_n8n(n_base_url, n_api_key, table_id, mappings)
    else:
        pull_n8n_to_doppler(n_base_url, n_api_key, table_id, mappings)

if __name__ == "__main__":
    main()
