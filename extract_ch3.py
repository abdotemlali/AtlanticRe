import re

with open('rapport_pfe_ameliore.tex', 'r', encoding='utf-8') as f:
    text = f.read()

# Find Chapter 3 boundaries
match = re.search(r'(\\chapter\{Conception et choix technologiques\}.*?)(\\chapter\{Implémentation et résultats\})', text, re.DOTALL)
if not match:
    print('Chapter 3 not found')
    exit(1)

ch3_content = match.group(1)
ch4_start = match.group(2)

print(f'Chapter 3 length: {len(ch3_content)}')

# We will extract major components using regex based on their headers
sections = {}

# Architecture
sections['arch'] = re.search(r'(\\subsection\{Architecture globale de l\'application\}.*?)(?=\\subsection|\\section)', ch3_content, re.DOTALL).group(1)

# Choix technos
sections['tech'] = re.search(r'(\\subsection\{Choix technologiques\}.*?)(?=\\subsection|\\section)', ch3_content, re.DOTALL).group(1)

# Pipeline
sections['pipe'] = re.search(r'(\\subsection\{Pipeline de récupération des données externes\}.*?)(?=\\subsection\{Modèle multicritère|\\subsection|\\section)', ch3_content, re.DOTALL).group(1)

# Modele Multicritère
sections['modele_ml'] = re.search(r'(\\subsection\{Modèle multicritère d\'attractivité.*?)(?=\\subsection|\\section)', ch3_content, re.DOTALL).group(1)

# Modele multidimensionnel en etoile
sections['etoile'] = re.search(r'(\\subsection\{Modélisation multidimensionnelle des données\}.*?)(?=\\subsection|\\section)', ch3_content, re.DOTALL).group(1)

# Cas d'utilisation
sections['usecase'] = re.search(r'(\\subsection\{Diagrammes de cas d\'utilisation\}.*?)(?=\\subsection|\\section)', ch3_content, re.DOTALL).group(1)

# Classes
sections['classe'] = re.search(r'(\\subsection\{Diagramme de classes\}.*?)(?=\\subsection|\\section)', ch3_content, re.DOTALL).group(1)

# Séquences
sections['sequence'] = re.search(r'(\\subsection\{Diagrammes de séquence\}.*?)(?=\\subsection|\\section)', ch3_content, re.DOTALL).group(1)

# Modèle externe / interne
sections['interne'] = re.search(r'(\\subsection\{Modèle de données interne \(Axe 1\)\}.*?)(?=\\section)', ch3_content, re.DOTALL).group(1)

# Bilan
sections['bilan'] = re.search(r'(\\section\{Bilan du chapitre\}.*)', ch3_content, re.DOTALL).group(1)


for k in sections:
    print(f'{k}: {len(sections[k])}')

print('All sections extracted successfully.')
