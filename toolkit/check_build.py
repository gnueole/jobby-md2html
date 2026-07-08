#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# ==============================================================================
# Author: Éole <hi@eole.me>
# Creation Date: 2026-07-08
# Last Update: 2026-07-08
# License: MIT
#
# Queries GitHub Actions API to check latest build/run status for the Jobby subproject.
# ==============================================================================

import urllib.request
import json
import sys
import os

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


def check_build():
    # Check for --full argument
    full = "--full" in sys.argv
    
    url = "https://api.github.com/repos/gnueole/jobby-md2html/actions/runs?branch=main"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0"}
    )
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                runs = data.get("workflow_runs", [])
                if not runs:
                    print("No workflow runs found.")
                    sys.exit(1)
                
                latest_run = runs[0]
                status = latest_run.get("status")
                conclusion = latest_run.get("conclusion")
                html_url = latest_run.get("html_url")
                head_commit = latest_run.get("head_commit") or {}
                commit_msg = head_commit.get("message", "Unknown").split("\n")[0]
                commit_sha = latest_run.get("head_sha", "Unknown")[:7]
                
                if full:
                    print(f"Latest Run details:")
                    print(f"  Commit: [{commit_sha}] {commit_msg}")
                    print(f"  Status: {status}")
                    print(f"  Conclusion: {conclusion}")
                    print(f"  URL: {html_url}")
                
                if status == "completed":
                    if conclusion == "success":
                        if not full:
                            print("Build status: completed (success)")
                        sys.exit(0)
                    else:
                        if not full:
                            print(f"Build status: completed (failed). Please check the logs at: {html_url}")
                        sys.exit(2)
                else:
                    if not full:
                        print("Build is in progress. Please try again later.")
                    sys.exit(0)
    except Exception as e:
        print(f"Error checking GitHub actions: {e}")
        sys.exit(4)

if __name__ == "__main__":
    check_build()
