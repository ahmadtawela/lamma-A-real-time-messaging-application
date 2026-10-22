import re, json, glob, os, sys
used = {}
for f in glob.glob('src/**/*.js*', recursive=True):
    s = open(f).read()
    for m in re.finditer(r"""\bt\(\s*['"]([a-zA-Z]+\.[A-Za-z0-9_.]+)['"]""", s): used.setdefault(m.group(1), f)
    for m in re.finditer(r"""\bt\(\s*`([a-zA-Z]+\.[^`]*)`""", s): used.setdefault('DYN:' + m.group(1), f)
    for m in re.finditer(r"""['"]((?:nav|admin|chat|auth|common|errors|settings|groups|contacts|profile|status|calls|search|notifications)\.[A-Za-z0-9_]+)['"]""", s): used.setdefault('STR:' + m.group(1), f)
def load(l):
    d = {}
    for p in glob.glob(f'src/locales/{l}/*.json'): d[os.path.basename(p)[:-5]] = json.load(open(p))
    return d
en, ar = load('en'), load('ar')
def has(d, key):
    ns, k = key.split('.', 1); t = d.get(ns, {})
    return k in t or any(x.startswith(k + '_') for x in t)
missing = sorted({k.replace('STR:', '') for k in used if k.startswith(('STR:',)) or not k.startswith('DYN:')} )
miss = [k for k in missing if not has(en, k)]
print('MISSING EN:', len(miss)); print('\n'.join(miss))
print('DYNAMIC:'); print('\n'.join(sorted(k for k in used if k.startswith('DYN:'))))
