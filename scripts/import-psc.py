#!/usr/bin/env python3
"""Importa uma etapa do PSC/UFAM (prova + gabarito definitivo) como rascunho, só questões em texto.

Uso: pip install pymupdf
     python3 scripts/import-psc.py ANO ETAPA prova.pdf gabarito.pdf
Gera content/questions/psc/<ano>-et<etapa>.json. Questões com figura/tabela, base de texto
incompleta ou anuladas ficam de fora e são listadas no final (para tratar à mão).
Tudo entra como 'draft': falta a revisão humana.
"""
import json, os, re, subprocess, sys
import pymupdf

pymupdf.TOOLS.mupdf_display_errors(False)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RANGE = re.compile(r'quest(?:ão|ões)\s+(?:de\s+)?(\d{2})\s*(?:a|à|e|ao|até)\s*(?:a\s+)?(\d{2})', re.I)
RANGE1 = re.compile(r'(?:responder|resolver)\s+(?:à|a)\s+quest(?:ão)\s+(\d{2})', re.I)
QSTART = re.compile(r'^\s*(\d{2})\.\s+(\S.*)$')
OPT = re.compile(r'^\s*([a-e])\)\s*(.*)$')
AREAS = [('portugues', 'LÍNGUA PORTUGUESA'), ('literatura', 'LITERATURA'), ('historia', 'HISTÓRIA'), ('geografia', 'GEOGRAFIA'),
         ('biologia', 'BIOLOGIA'), ('quimica', 'QUÍMICA'), ('fisica', 'FÍSICA'), ('matematica', 'MATEMÁTICA')]

def stream(pdf):
    """Linhas na ordem de leitura (coluna esquerda, depois direita) com marcadores de figura."""
    d = pymupdf.open(pdf); out = []
    for page in d:
        items = []
        for b in page.get_text('blocks'):
            x0, y0, x1, y1, t = b[:5]
            if not t.strip() or y0 > 830 or y0 < 20: continue
            if re.match(r'^\s*PROCESSO SELETIVO', t) or re.fullmatch(r'\s*\d+\s*', t): continue
            items.append((0 if x0 < 300 else 1, y0, 'T', t))
        for im in page.get_image_info():
            r = im['bbox']
            if r[3] - r[1] > 25 and r[2] - r[0] > 40 and 50 < r[1] < 790: items.append((0 if r[0] < 300 else 1, r[1], 'F', ''))
        for r in page.get_drawings():
            r = r['rect']
            if r.width > 40 and r.height > 25 and 50 < r.y0 < 790: items.append((0 if r.x0 < 300 else 1, r.y0, 'F', ''))
        items.sort(key=lambda t: (t[0], t[1]))
        for _, _, k, t in items:
            if k == 'F': out.append(('F', ''))
            else:
                lns = [ln.strip() for ln in t.replace('\xa0', ' ').split('\n') if ln.strip()]
                if lns: out.append(('B', lns))
    return out

def gabarito(pdf):
    txt = subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True).stdout
    return {int(n): l for n, l in re.findall(r'(\d{2})\.?\s+(ANULADA|ANULAR|NULA|[A-E])\b', txt)}

CAPTION = re.compile(r'^(Imagem|Figura|Gráfico|Grafico|Tabela|Mapa|Quadro|Charge|Tirinha)\s*\d*\b', re.I)

def parse(items):
    qs, cur, base, area_i, area, prev_n = {}, None, None, -1, None, 0
    for k, v in items:
        if k == 'F':
            tgt = cur if cur else base
            if tgt is not None: tgt['fig'] = True
            continue
        joined = ' '.join(v)
        qm = QSTART.match(v[0])
        if not (qm and int(qm.group(1)) == prev_n + 1) and not OPT.match(v[0]):
            r = RANGE.search(joined); r1 = RANGE1.search(joined)
            if (r or r1) and re.search(r'respond|resolv|a partir|apoio|leia|observe|considere|texto', joined, re.I):
                lo = int((r or r1).group(1)); hi = int(r.group(2)) if r else lo
                if lo > prev_n and lo <= prev_n + 3:
                    cut = next((i for i, t in enumerate(v) if i and (m2 := QSTART.match(t)) and int(m2.group(1)) == prev_n + 1), len(v))
                    base = {'lo': lo, 'hi': hi, 'lines': list(v[:cut]), 'fig': bool(CAPTION.match(v[0]))}; cur = None
                    v = v[cut:]
                    if not v: continue
        for t in v:
            if any(t.strip().upper() == title for _, title in AREAS):
                for i, (key, title) in enumerate(AREAS):
                    if t.strip().upper() == title and i > area_i: area_i, area = i, key
                continue
            m = QSTART.match(t)
            if m and int(m.group(1)) == prev_n + 1:
                prev_n = int(m.group(1))
                if not (base and base['lo'] <= prev_n <= base['hi']): base = None
                cur = {'n': prev_n, 'area': area, 'lines': [m.group(2)], 'fig': False, 'base': base}
                qs[prev_n] = cur; continue
            tgt = cur if cur else base
            if tgt is not None:
                if CAPTION.match(t): tgt['fig'] = True
                tgt['lines'].append(t)
    return qs, area

def split(q):
    stmt, opts, co = [], {}, None
    for t in q['lines']:
        m = OPT.match(t)
        if m and (co is None and m.group(1) == 'a' or co and ord(m.group(1)) == ord(co) + 1):
            co = m.group(1); opts[co] = [m.group(2)]; continue
        (opts[co] if co else stmt).append(t)
    return ' '.join(stmt), {a: ' '.join(v) for a, v in opts.items()}, 

def mathfix(s):
    import unicodedata
    return ''.join(unicodedata.normalize('NFKC', c) if 0x1D400 <= ord(c) <= 0x1D7FF else c for c in s)

def norm(s):
    s = re.sub(r'\s+', ' ', mathfix(s)).strip()
    return re.split(r'\s+(?=Nas quest(?:ões|ão) em que for necess)', s)[0]

def main():
    ano, et, pv, gb = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4]
    items = stream(pv); ans = gabarito(gb)
    qs, _ = parse(items)
    res, fora = [], []
    for n, q in sorted(qs.items()):
        letra = ans.get(n)
        if not letra: fora.append((n, 'sem gabarito')); continue
        if letra in ('ANULADA', 'ANULAR', 'NULA'): fora.append((n, 'anulada')); continue
        if any('( )' in x for x in q['lines']): fora.append((n, 'relação de colunas')); continue
        if q['fig'] or (q['base'] and q['base']['fig']): fora.append((n, 'figura/tabela')); continue
        stmt, opts = split(q)[0], split(q)[1]
        if len(opts) != 5 or any(len(v) < 1 or len(v) > 600 for v in opts.values()): fora.append((n, 'alternativas incompletas')); continue
        base = ''
        if q['base']:
            bl = [x for x in q['base']['lines']]
            base = ' '.join(bl)
        enun = norm((base + '\n\n' if base else '') + stmt)
        if base: enun = norm(base) + '\n\n' + norm(stmt)
        res.append({
            'id': f'psc-{ano}-e{et}-{n:02d}', 'stateCode': 'PSC', 'topic': q['area'], 'year': ano,
            'statement': enun,
            'options': [{'id': a, 'text': norm(opts[a])} for a in 'abcde'],
            'correctOptionId': letra.lower(), 'images': [],
            'source': f'UFAM - PSC {ano}', 'sourceRef': f'{et}ª etapa, questão {n:02d}',
            'status': 'draft', 'reviewedBy': None,
        })
    os.makedirs(os.path.join(ROOT, 'content', 'questions', 'psc'), exist_ok=True)
    path = os.path.join(ROOT, 'content', 'questions', 'psc', f'{ano}-et{et}.json')
    json.dump(res, open(path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(f'{ano} et{et}: {len(qs)} detectadas, {len(res)} importadas; fora: {len(fora)}', {m: sum(1 for _, x in fora if x == m) for m in {x for _, x in fora}})

if __name__ == '__main__': main()
