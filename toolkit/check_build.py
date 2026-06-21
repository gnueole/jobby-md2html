import urllib.request
import json
import sys

def check_build():
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
                
                print(f"Latest Run details:")
                print(f"  Commit: [{commit_sha}] {commit_msg}")
                print(f"  Status: {status}")
                print(f"  Conclusion: {conclusion}")
                print(f"  URL: {html_url}")
                
                if status == "completed":
                    if conclusion == "success":
                        sys.exit(0)
                    else:
                        sys.exit(2)
                else:
                    print(f"Build is currently in progress (status: {status}). Please try again later.")
                    sys.exit(3)
    except Exception as e:
        print(f"Error checking GitHub actions: {e}")
        sys.exit(4)

if __name__ == "__main__":
    check_build()
