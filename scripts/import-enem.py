#!/usr/bin/env python3
"""Importa uma prova do ENEM (caderno oficial do INEP + gabarito oficial) como rascunho.

Uso: pip install pymupdf
     python3 scripts/import-enem.py ANO DIA caderno.pdf gabarito.pdf [--cor azul]
Gera content/questions/enem/<ano>-d<dia>.json e as figuras em public/enem/<ano>/.
Tudo entra como 'draft': o enunciado e o gabarito vêm do INEP; falta só a revisão humana
(conferir texto e figura) e, de preferência, uma explicação da resolução.
"""
import json, os, re, subprocess, sys
import pymupdf

pymupdf.TOOLS.mupdf_display_errors(False)
WM = re.compile(r'ENEM\s*20\d\d')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# Áreas por dia. 2017 em diante: dia 1 = Linguagens + Humanas, dia 2 = Natureza + Matemática.
AREAS_NOVO = {1: [(1, 45, 'linguagens'), (46, 90, 'humanas')], 2: [(91, 135, 'natureza'), (136, 180, 'matematica')]}
AREAS_ANTIGO = {1: [(1, 45, 'humanas'), (46, 90, 'natureza')], 2: [(91, 135, 'linguagens'), (136, 180, 'matematica')]}
# ENEM 2009-2016 (dia 1 Humanas+Natureza). O dia 1 de 2017+ trocou a ordem.
def areas(ano, dia):
    return (AREAS_ANTIGO if ano <= 2016 else AREAS_NOVO)[dia]

def parse(pdf):
    d = pymupdf.open(pdf)
    qs, order, cur, lang = {}, [], None, 'en'
    segs = {}
    for pno, page in enumerate(d):
        items = []
        for b in page.get_text('dict')['blocks']:
            x0, y0, x1, y1 = b['bbox']
            if y0 < 62 or y1 > 752: continue
            if b['type'] == 0:
                txt = ''.join(s['text'] for l in b['lines'] for s in l['spans'])
                if WM.search(txt) or txt.strip().startswith('*0') or (x1 - x0) < 4 or (y1 - y0) < 4: continue
            items.append((0 if (x0 + x1) / 2 < 285 else 1, y0, b))
        items.sort(key=lambda t: (t[0], t[1]))
        draws = [dr['rect'] for dr in page.get_drawings()]
        open_seg = {}
        def start(key, col, ytop):
            sg = {'page': pno, 'col': col, 'y0': ytop, 'y1': None, 'figs': []}
            segs.setdefault(key, []).append(sg); open_seg[col] = sg
        for col, y0, b in items:
            if cur is not None and col not in open_seg: start(cur['key'], col, 64)
            x0, _, x1, y1 = b['bbox']
            if b['type'] == 1:
                if cur and (x1 - x0) > 40 and (y1 - y0) > 25 and not cur['opts']: open_seg[col]['figs'].append(pymupdf.Rect(b['bbox']))
                continue
            for l in b['lines']:
                t = ''.join(s['text'] for s in l['spans']).replace(' ', ' ').rstrip()
                ly = l['bbox'][1]
                if 'opção espanhol' in t: lang = 'es'
                if 'opção inglês' in t: lang = 'en'
                m = re.match(r'^QUESTÃO\s+(\d+)\s*$', t.strip())
                if m:
                    if cur and col in open_seg and open_seg[col]['y1'] is None: open_seg[col]['y1'] = ly - 2
                    n = int(m.group(1)); key = (n, lang if n <= 5 else '-')
                    cur = {'n': n, 'lang': key[1], 'key': key, 'lines': [], 'opts': False, 'short': 0}
                    qs[key] = cur; order.append(key); start(key, col, ly - 4); continue
                if cur is None: continue
                if re.match(r'^Questões de \d+ a \d+', t.strip()) or t.strip().startswith(('LINGUAGENS, CÓDIGOS', 'CIÊNCIAS ', 'MATEMÁTICA E')): continue
                if re.match(r'^[A-E]\t', t) and not cur['opts']:
                    cur['opts'] = True
                    if col in open_seg and open_seg[col]['y1'] is None: open_seg[col]['y1'] = ly - 2
                cur['lines'].append(t)
            if cur is not None:
                if not cur['opts'] and b['type'] == 0 and sum(len(''.join(sp['text'] for sp in l['spans'])) for l in b['lines']) < 40 and (x1 - x0) < 200: cur['short'] += 1
                cur['lines'].append('\0')  # fim de bloco (parágrafo)
        for key, sl in segs.items():
            for sg in sl:
                if sg['page'] != pno: continue
                y1 = sg['y1'] if sg['y1'] is not None else 748
                xr = (0, 286) if sg['col'] == 0 else (286, 600)
                for r in draws:
                    if r.width > 40 and r.height > 25 and r.y0 >= sg['y0'] - 2 and r.y1 <= y1 + 2 and r.x0 >= xr[0] - 2 and r.x1 <= xr[1] + 40:
                        sg['figs'].append(r); sg['vec'] = sg.get('vec', 0) + 1
    out = []
    for key in order:
        q = qs[key]; stmt, opts, co = [], {}, None
        for t in q['lines']:
            m = re.match(r'^([A-E])\t\s*(.*)$', t)
            if m and (co is None or m.group(1) > co):
                co = m.group(1); opts[co] = [m.group(2)]; continue
            (opts[co] if co else stmt).append(t)
        q['statement'] = paragraphs(stmt)
        q['options'] = {a: re.sub(r'\s+', ' ', ' '.join(x for x in v if x != '\0')).strip() for a, v in opts.items()}
        q['segs'] = segs.get(key, [])
        out.append(q)
    return d, out

def paragraphs(lines):
    blocks, cur = [], []
    for t in lines:
        if t == '\0':
            if cur: blocks.append(cur); cur = []
        else: cur.append(t.strip())
    if cur: blocks.append(cur)
    paras = []
    for b in blocks:
        b = [x for x in b if x]
        if not b: continue
        verso = len(b) >= 3 and max(len(x) for x in b) < 52  # poema/letra: preserva as quebras
        paras.append('\n'.join(b) if verso else re.sub(r'\s+', ' ', ' '.join(b)))
    return '\n\n'.join(paras).strip()

def gabarito(pdf, dia):
    txt = subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True).stdout
    tk = txt.split(); ans = {}; i = 0
    while i < len(tk):
        if tk[i].isdigit() and 1 <= int(tk[i]) <= 180:
            n = int(tk[i]); j = i + 1; ls = []
            while j < len(tk) and re.fullmatch(r'[A-E]', tk[j]) and len(ls) < 2: ls.append(tk[j]); j += 1
            if ls:
                if dia == 1 and n <= 5 and len(ls) == 2: ans[(n, 'en')], ans[(n, 'es')] = ls[0], ls[1]
                elif dia == 1 and n <= 5: ans[(n, 'es')] = ls[0]
                else: ans[(n, '-')] = ls[0]
                i = j; continue
        i += 1
    return ans

def main():
    ano, dia, pv, gb = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4]
    cor = sys.argv[sys.argv.index('--cor') + 1] if '--cor' in sys.argv else 'azul'
    d, qs = parse(pv); ans = gabarito(gb, dia)
    imgdir = os.path.join(ROOT, 'public', 'enem', str(ano)); os.makedirs(imgdir, exist_ok=True)
    area_of = lambda n: next((a for lo, hi, a in areas(ano, dia) if lo <= n <= hi), None)
    res, problemas = [], []
    for q in qs:
        n = q['n']
        # Tabelas e diagramas vetoriais não viram texto confiável: usa a imagem inteira da questão.
        complexa = q['short'] >= 6 or any(sg.get('vec') for sg in q['segs'])
        as_img = len(q['options']) < 5 or complexa
        imgs, i = [], 0
        for sg in q['segs']:
            y1 = sg['y1'] if sg['y1'] is not None else 748
            if as_img or (len(q['statement']) < 20 and not any(s['figs'] for s in q['segs'])):
                if y1 - sg['y0'] < 14: continue
                u = pymupdf.Rect(30 if sg['col'] == 0 else 288, sg['y0'], 284 if sg['col'] == 0 else 540, y1)
            elif sg['figs']:
                u = pymupdf.Rect(sg['figs'][0])
                for r in sg['figs'][1:]: u |= r
                u = u + (-2, -2, 2, 2)
            else: continue
            if u.height < 10 or u.width < 10: continue
            i += 1; fn = f"d{dia}-{n:03d}{'' if q['lang']=='-' else q['lang']}-{i}.png"
            d[sg['page']].get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=u).save(os.path.join(imgdir, fn)); imgs.append(f'/enem/{ano}/{fn}')
        k = (n, q['lang']); letra = ans.get(k)
        area = area_of(n)
        if not letra or not area: problemas.append((n, q['lang'], 'sem gabarito/área')); continue
        if not as_img and (len(q['statement']) < 8 and not imgs): problemas.append((n, q['lang'], 'sem enunciado'))
        res.append({
            'id': f"enem-{ano}-d{dia}-{n:03d}{'' if q['lang']=='-' else '-' + q['lang']}",
            'stateCode': 'ENEM', 'topic': area, 'year': ano,
            'statement': q['statement'],
            'options': [{'id': a.lower(), 'text': '' if as_img else q['options'][a]} for a in 'ABCDE'],
            'correctOptionId': letra.lower(),
            'images': imgs, **({'optionsAsImage': True} if as_img else {}),
            'source': f'INEP - ENEM {ano}', 'sourceRef': f'{dia}º dia, caderno {cor}, questão {n}' + (' (inglês)' if q['lang'] == 'en' else ' (espanhol)' if q['lang'] == 'es' else ''),
            'status': 'archived' if q['lang'] == 'es' else 'draft', 'reviewedBy': None,
        })
    os.makedirs(os.path.join(ROOT, 'content', 'questions', 'enem'), exist_ok=True)
    path = os.path.join(ROOT, 'content', 'questions', 'enem', f'{ano}-d{dia}.json')
    json.dump(res, open(path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(f'{path}: {len(res)} questões, {sum(1 for r in res if r["images"])} com figura, {sum(1 for r in res if r.get("optionsAsImage"))} com alternativas em figura')
    if problemas: print('ATENÇÃO:', problemas)

if __name__ == '__main__': main()
