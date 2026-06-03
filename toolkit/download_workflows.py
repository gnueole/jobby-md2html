import sys
import subprocess
import os

print("==============================================================")
print("⚠️  DEPRECATION WARNING: download_workflows.py has been merged")
print("   into the unified sync_n8n.py script.")
print("   Running 'python3 toolkit/sync_n8n.py --backup-all' on your behalf...")
print("==============================================================")

script_dir = os.path.dirname(os.path.abspath(__file__))
sync_script = os.path.join(script_dir, "sync_n8n.py")

# Call the unified script, passing through all other command line args
cmd = [sys.executable, sync_script, "--backup-all"] + sys.argv[1:]
res = subprocess.run(cmd)
sys.exit(res.returncode)
