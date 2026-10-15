#!/usr/bin/env python3
"""Importa uma Prova de Acompanhamento do SIS (UEA/Vunesp) + gabarito oficial como rascunho, só questões em texto.

Uso: pip install pymupdf
     python3 scripts/import-sis.py ANO NUM prova.pdf gabarito.pdf     (NUM = 1, 2 ou 3 = série do ensino médio)
Gera content/questions/sis/<ano>-s<num>.json. Questões com figura/tabela, base incompleta ou anuladas
ficam de fora e são listadas no final. Tudo entra como 'draft'.
"""
import json, os, re, subprocess, sys, unicodedata
import pymupdf

pymupdf.TOOLS.mupdf_display_errors(False)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RANGE = re.compile(r'quest(?:ão|ões)\s+(?:de\s+)?(\d{2})\s*(?:a|à|e|ao|até)\s*(?:a\s+)?(\d{2})', re.I)
RANGE1 = re.compile(r'quest(?:ão)\s+(\d{2})', re.I)
QMARK = re.compile(r'^Quest[ãa]o[\s ]+(\d+)\s*$')
OPT = re.compile(r'^\(([A-E])\)\s*(.*)$')
CAPTION = re.compile(r'^(Imagem|Figura|Gráfico|Grafico|Tabela|Mapa|Quadro|Charge|Tirinha|Fonte da imagem)\s*\d*\b', re.I)

def stream(pdf):
    d = pymupdf.open(pdf); out = []
    for page in d:
        items = []
        for b in page.get_text('blocks'):
            x0, y0, x1, y1, t = b[:5]
            if not t.strip() or y0 > 800: continue
            if 'UEAM' in t and 'Confidencial' in t: continue
            items.append((0 if x0 < 297 else 1, y0, 'T', t))
        for im in page.get_image_info():
            r = im['bbox']
            if r[3] - r[1] > 25 and r[2] - r[0] > 40 and r[1] < 800: items.append((0 if r[0] < 297 else 1, r[1], 'F', ''))
        for r in page.get_drawings():
            r = r['rect']
            if r.width > 40 and r.height > 25 and r.y0 < 800: items.append((0 if r.x0 < 297 else 1, r.y0, 'F', ''))
        items.sort(key=lambda t: (t[0], t[1]))
        for _, _, k, t in items:
            if k == 'F': out.append(('F', ''))
            else:
                lns = [ln.strip() for ln in t.replace('\xa0', ' ').split('\n') if ln.strip()]
                if lns: out.append(('B', lns))
    return out

def gabarito(pdf):
    txt = subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True).stdout
    return {int(n): l for n, l in re.findall(r'(\d{1,2})\s*-\s*([A-E]|ANULADA|ANULAD[AO]|\*)', txt)}

def parse(items):
    qs, cur, base, prev_n = {}, None, None, 0
    for k, v in items:
        if k == 'F':
            tgt = cur if cur else base
            if tgt is not None: tgt['fig'] = True
            continue
        joined = ' '.join(v)
        if not QMARK.match(v[0]) and not OPT.match(v[0]):
            r = RANGE.search(joined) or RANGE1.search(joined)
            if r and re.search(r'responder|leia|observe|considere|texto|a partir', joined, re.I) and prev_n < int(r.group(1)) <= prev_n + 3:
                lo = int(r.group(1)); hi = int(r.group(2)) if r.re is RANGE else lo
                base = {'lo': lo, 'hi': hi, 'lines': list(v), 'fig': bool(CAPTION.match(v[0]))}; cur = None; continue
        for t in v:
            m = QMARK.match(t)
            if m and int(m.group(1)) == prev_n + 1:
                prev_n = int(m.group(1))
                if not (base and base['lo'] <= prev_n <= base['hi']): base = None
                cur = {'n': prev_n, 'lines': [], 'fig': False, 'base': base}; qs[prev_n] = cur; continue
            tgt = cur if cur else base
            if tgt is not None:
                if CAPTION.match(t): tgt['fig'] = True
                tgt['lines'].append(t)
    return qs

def mathfix(s): return ''.join(unicodedata.normalize('NFKC', c) if 0x1D400 <= ord(c) <= 0x1D7FF else c for c in s)

def join(lines):
    out = ''
    for t in lines:
        if out.endswith('-') and t[:1].islower(): out = out[:-1] + t
        else: out = (out + ' ' + t) if out else t
    return re.sub(r'\s+', ' ', mathfix(out)).strip()

def split(q):
    stmt, opts, co = [], {}, None
    for t in q['lines']:
        m = OPT.match(t)
        if m and (co is None and m.group(1) == 'A' or co and ord(m.group(1)) == ord(co) + 1):
            co = m.group(1); opts[co] = [m.group(2)]; continue
        (opts[co] if co else stmt).append(t)
    return stmt, opts

# O caderno não traz títulos de área; faixas conferidas à mão nos três cadernos de 2025
# (linguagens 1-12, humanas 13-30/29, natureza 30/31-36 e 46-60, matemática 37-45). Aproximado nas divisas.
def area(num, n):
    if n <= 12: return 'linguagens'
    if n <= (29 if num == 3 else 30): return 'humanas'
    if n <= 36: return 'natureza'
    if n <= 45: return 'matematica'
    return 'natureza'

def main():
    ano, num, pv, gb = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4]
    qs = parse(stream(pv)); ans = gabarito(gb)
    res, fora = [], []
    for n, q in sorted(qs.items()):
        letra = ans.get(n)
        if not letra or letra == '*' or letra.startswith('ANULAD'): fora.append((n, 'sem gabarito/anulada')); continue
        if q['fig'] or (q['base'] and q['base']['fig']): fora.append((n, 'figura/tabela')); continue
        stmt, opts = split(q)
        if len(opts) != 5 or any(not v or len(join(v)) > 500 for v in opts.values()): fora.append((n, 'alternativas incompletas')); continue
        enun = join(stmt)
        if q['base']: enun = join(q['base']['lines']) + '\n\n' + enun
        res.append({
            'id': f'sis-{ano}-s{num}-{n:02d}', 'stateCode': 'SIS', 'topic': area(num, n), 'year': ano,
            'statement': enun, 'options': [{'id': a.lower(), 'text': join(opts[a])} for a in 'ABCDE'],
            'correctOptionId': letra.lower(), 'images': [],
            'source': f'UEA/Vunesp - SIS {ano}', 'sourceRef': f'Prova de Acompanhamento {"I" * num}, {num}ª série, questão {n:02d}',
            'status': 'draft', 'reviewedBy': None,
        })
    os.makedirs(os.path.join(ROOT, 'content', 'questions', 'sis'), exist_ok=True)
    path = os.path.join(ROOT, 'content', 'questions', 'sis', f'{ano}-s{num}.json')
    json.dump(res, open(path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(f'{ano} s{num}: {len(qs)} detectadas, {len(res)} importadas; fora: {len(fora)}', {m: sum(1 for _, x in fora if x == m) for m in {x for _, x in fora}})

if __name__ == '__main__': main()
