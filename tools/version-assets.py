"""Adds ?v=<content hash> to every local .js/.css the pages load, so browsers
fetch the new file as soon as it changes instead of using an old saved copy.

Run from the repo root after editing any .js/.css file:  python3 tools/version-assets.py
"""
import glob, hashlib, os, re

ref = re.compile(r'''((?:src|href)=")([A-Za-z0-9_.-]+\.(?:js|css))(?:\?v=[0-9a-f]+)?(")''')
hashes = {}

def version(name):
    if name not in hashes:
        hashes[name] = hashlib.md5(open(name, 'rb').read()).hexdigest()[:8] if os.path.isfile(name) else None
    return hashes[name]

changed = 0
for page in sorted(glob.glob('*.html')):
    src = open(page, encoding='utf-8').read()
    out = ref.sub(lambda m: m.group(1) + m.group(2) + (f'?v={version(m.group(2))}' if version(m.group(2)) else '') + m.group(3), src)
    if out != src:
        open(page, 'w', encoding='utf-8').write(out)
        changed += 1
print(f'{changed} page(s) updated; versions: ' + ', '.join(f'{k}={v}' for k, v in sorted(hashes.items()) if v))
