import json
with open('toolkit/workflow_backup.json') as f:
    wf = json.load(f)
node = [n for n in wf['nodes'] if 'Génération' in n['name']][0]
js = node['parameters']['jsCode']

with open('toolkit/sync_n8n.py') as f:
    code = f.read()

# Extract new_js_code
start = code.find('new_js_code = r"""') + len('new_js_code = r"""')
end = code.find('"""', start)
new_js = code[start:end]

print("js contains parts.map:", "parts.map" in js)
print("new_js contains parts.map:", "parts.map" in new_js)
print("js contains map(part:", "map(part" in js)
print("new_js contains map(part:", "map(part" in new_js)
print("Equal?", js == new_js)
