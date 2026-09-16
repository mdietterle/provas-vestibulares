import json
import re
import os

html_path = '/Users/martimdietterle/.gemini/antigravity/brain/d5e55a21-d913-4e68-9b7f-74552b150000/.user_uploaded/media_1786493585221.html'
with open(html_path, 'r') as f:
    html = f.read()

m = re.search(r'const DATA = \[(.*?)\];', html, re.DOTALL)
data_str = m.group(1)

siglas = re.findall(r's:"([^"]+)"', data_str)
acervos = re.findall(r'acervo:"([^"]+)"', data_str)
nomes = re.findall(r'n:"([^"]+)"', data_str)

services = os.listdir('/Users/martimdietterle/provas/backend/app/services')

implemented_map = {
    'ENEM': 'enem',
    'ITA': 'ita',
    'USP / FUVEST': 'fuvest',
    'UNICAMP': 'unicamp',
    'UDESC': 'udesc',
    'UFPel': 'ufpel',
    'UFPR': 'ufpr',
    'UFRGS': 'ufrgs',
    'UFSC': 'ufsc',
    'PUCPR': 'pucpr',
    'PUC-Rio': 'pucrio',
    'PUCRS': 'pucrs',
    'ESPM': 'espm',
    'FGV': 'fgv',
    'ACAFE': 'acafe',
}

missing_full = []
missing_part = []

missing_full = []
missing_part = []

for block in re.finditer(r'\{([^}]+)\}', data_str):
    text = block.group(1)
    
    # Sigla
    m_s = re.search(r's:"([^"]+)"', text)
    if not m_s: continue
    sigla = m_s.group(1)
    
    # Nome
    m_n = re.search(r'n:"([^"]+)"', text)
    nome = m_n.group(1) if m_n else sigla
    
    # Acervo
    m_a = re.search(r'acervo:"([^"]+)"', text)
    acervo = m_a.group(1) if m_a else "none"
    
    if sigla in implemented_map and implemented_map[sigla] in services:
        continue
    if sigla == 'UnB':
        continue
    
    if acervo == 'full':
        missing_full.append(f"{sigla} ({nome})")
    elif acervo == 'part':
        missing_part.append(f"{sigla} ({nome})")

print("### Faltam implementar (Acervo FULL - Têm Repositório de Provas e Gabaritos):")
for s in missing_full:
    print(f"- {s}")

print("\n### Faltam implementar (Acervo PARCIAL - Arquivos incompletos ou perdidos em editais):")
for s in missing_part:
    print(f"- {s}")
