#!/usr/bin/env python3
"""Importa o Banco Nacional de Questões (Senatran, v1.0) a partir do texto extraído do PDF oficial.
Uso: python3 scripts/import-bnq.py texto.txt content/questions/am/bnq-001.json AM
Tudo entra como 'draft' (revisão humana antes de publicar)."""
import re, sys, json, random
src, out, uf = sys.argv[1:4]
txt = open(src, encoding='utf8').read()
txt = re.sub(r'CNH do Brasil - Ministério dos Transportes - Secretaria Nacional de Trânsito', '', txt)
mods = re.split(r'MÓDULO (\d+) - ([^\n]+)', txt)
random.seed(42)
TOP = [
 ('primeiros_socorros', r'primeiros socorros|v[ií]tima|hemorragia|desmaio|fratura|SAMU|reanima'),
 ('meio_ambiente_cidadania', r'ambient|polu|fuma[çc]a|descarte|reciclag|cidadania|ru[ií]do|lixo|sustent'),
 ('mecanica', r'motor|pneu|[óo]leo|freio|bateria|suspens|radiador|amortecedor|farol queimado|painel|calibr|escapamento|embreagem|correia'),
 ('sinalizacao', r'placa|sem[áa]foro|sinaliza[çc][ãa]o|marca[çc][ãa]o vi[áa]ria|gesto|agente de tr[âa]nsito'),
 ('direcao_defensiva', r'defensiv|dist[âa]ncia de seguran|chuva|neblina|aquaplan|cansa[çc]o|sono|velocidade adequada|ponto cego|ultrapassag|condi[çc][õo]es adversas'),
]
def topic(stmt, com, sign):
    if sign: return 'sinalizacao'
    t = stmt + ' ' + com
    for name, rx in TOP:
        if re.search(rx, stmt, re.I) or (name != 'sinalizacao' and re.search(rx, t, re.I) and name in ('primeiros_socorros','meio_ambiente_cidadania')): return name
    return 'legislacao'
qs, n = [], 0
for i in range(1, len(mods), 3):
    mod = mods[i]
    for blk in re.split(r'●\s*\(', mods[i+2])[1:]:
        m = re.match(r'([^)]+)\)\s*(\d+)\.\s*(.*?)\s*(?:Código da placa:\s*([\w\-]+)\s*)?Alternativa correta:\s*(.*?)\s*✓\s*(?:Comentário:\s*(.*?))?\s*Respostas incorretas:\s*(.*)$', blk, re.S)
        if not m: print('IGNORADA', mod, blk[:60].replace('\n',' ')); continue
        lvl, num, stmt, sign, ok, com, wrong = m.groups()
        wr = [w.strip() for w in re.split(r'✗', wrong) if w.strip()]
        wr = [re.sub(r'\s+', ' ', w) for w in wr]
        if len(wr) != 3: print('ALT!=3', mod, num, len(wr)); continue
        opts = [re.sub(r'\s+', ' ', ok.strip())] + wr
        order = list(range(4)); random.shuffle(order)
        letters = 'abcd'
        options = [{'id': letters[k], 'text': opts[j]} for k, j in enumerate(order)]
        correct = letters[order.index(0)]
        com = re.sub(r'\s+', ' ', com or '').strip()
        arts = re.findall(r'[Aa]rt(?:igo)?s?\.?\s*(\d+[A-Za-z]?)', com)
        res = re.search(r'Resolu[çc][ãa]o (?:CONTRAN )?(?:n[ºo°]\s*)?([\d\.]+)', com)
        ref = None
        if arts: ref = 'CTB, art. ' + ', '.join(dict.fromkeys(arts[:3]))
        elif res: ref = 'Resolução CONTRAN ' + res.group(1)
        n += 1
        q = {'id': f'bnq-{mod}-{int(num):03d}', 'stateCode': uf, 'topic': topic(stmt, com, sign),
             'statement': re.sub(r'\s+', ' ', stmt).strip(), 'options': options, 'correctOptionId': correct,
             'explanation': com or None, 'legalRef': (ref or 'Banco Nacional de Questões v1.0 (Senatran)'),
             'status': 'draft', 'reviewedBy': None,
             'source': f'Banco Nacional de Questões v1.0 - Senatran/CNH do Brasil, módulo {mod}, q. {num}, nível {lvl}'}
        if sign: q['signCode'] = sign
        if not q['explanation']: del q['explanation']
        qs.append(q)
json.dump(qs, open(out, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(len(qs), 'questões')
