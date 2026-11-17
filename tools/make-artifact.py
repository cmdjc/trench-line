#!/usr/bin/env python3
"""Build artifact/trench-line.html (the claude.ai Artifact copy) from trench-line.html.

Usage: python3 tools/make-artifact.py   (run from the project root)

The standalone file is the source of truth. The Artifact copy differs in five ways:
  1. no <!DOCTYPE>/<html>/<head>/<body> wrapper (the Artifact host adds its own)
  2. dark palette also follows the host's data-theme attribute
  3. 16px side gutters that respect phone safe-area insets
  4. overlays padded for safe-area insets
  5. saves fall back to localStorage when window.storage is absent
Each replacement asserts its target exists, so the script fails loudly if the source drifts.
"""
import os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(root, 'trench-line.html')).read()

def rep(a, b):
    global s
    assert a in s, 'pattern not found: ' + a[:70]
    s = s.replace(a, b, 1)

rep('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Trench Line</title>',
    '<title>Trench Line</title>\n<meta name="claude:viewport-fit-sides" content="cover">')
rep('</style>\n</head>\n<body>', '</style>')
rep('</body>\n</html>', '')
dark = """--bg:#1d2017; --panel:#292d20; --ink:#e7e0c7; --muted:#a39d80; --line:#444935;
    --brass:#d8af4e; --red:#e56b50; --btn:#5f7040; --btn-ink:#f6f1de; --btn-off:#363a2b; --btn-off-ink:#7f7b66;"""
rep("@media (prefers-color-scheme: dark){\n  :root{\n    color-scheme:dark;\n    " + dark + "\n  }\n}",
    "@media (prefers-color-scheme: dark){\n  :root:not([data-theme=\"light\"]){\n    color-scheme:dark;\n    " + dark + "\n  }\n}\n:root[data-theme=\"dark\"]{\n    color-scheme:dark;\n    " + dark + "\n}")
rep(".game{max-width:600px;margin:0 auto;padding:calc(8px + env(safe-area-inset-top)) 10px calc(14px + env(safe-area-inset-bottom))}",
    ".game{max-width:600px;margin:0 auto;padding-block:8px 14px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}")
rep("justify-content:center;padding:16px;z-index:10;overflow:auto}",
    "justify-content:center;padding:calc(16px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) calc(16px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));z-index:10;overflow:auto}")
rep("const store=(typeof window.storage!=='undefined'&&window.storage&&window.storage.set)?window.storage:null;",
"""/* published page: saves live in this browser's own storage for this page */
const store=(()=>{
  if(typeof window.storage!=='undefined'&&window.storage&&window.storage.set)return window.storage;
  try{
    const ls=window.localStorage,probe='trenchline-probe';ls.setItem(probe,'1');ls.removeItem(probe);
    return {
      get:async k=>{const v=ls.getItem(k);return v===null?null:{key:k,value:v}},
      set:async(k,v)=>{ls.setItem(k,v);return {key:k,value:v}},
      delete:async k=>{ls.removeItem(k);return {key:k}}
    };
  }catch(e){return null}
})();""")
os.makedirs(os.path.join(root, 'artifact'), exist_ok=True)
open(os.path.join(root, 'artifact', 'trench-line.html'), 'w').write(s)
print('wrote artifact/trench-line.html')
