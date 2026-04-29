import re

with open('c:/Users/TEMLALI/.gemini/antigravity/scratch/reinsurance-platform/presentation_finale_canva_speech.md', 'r', encoding='utf-8') as f:
    text = f.read()

# Insert new slides before '## SLIDE 4 — Architecture'
insertion = '''## SLIDE 4 — Cadre du Projet : Données & Environnement de Test

**🎨 Visuel (Canva) :** 
**Titre :** 🔒 Cadre de Développement & Confidentialité
**Schéma :** Icône "Base de données anonymisée" croisée avec le logo "Localhost / Offline". Badge "Environnement Isolé".

**🗣️ Speech :**
> "Avant de vous présenter l'architecture, nous tenons à rassurer sur un point critique : la confidentialité. Pour cette phase de développement, toutes les données visualisées aujourd'hui sont factices. Nous n'avons reproduit que la structure exacte de vos templates réels. De plus, l'application et les tests tournent intégralement en local sur le PC de notre encadrant, de manière totalement hermétique et sans aucune interaction réseau avec l'extérieur."

---

## SLIDE 5 — Vision de Déploiement : Sécurité On-Premise

**🎨 Visuel (Canva) :** 
**Titre :** 🛡️ Vision d'Hébergement & Intranet
**Schéma :** Un serveur privé avec un bouclier, représentant l'intranet sécurisé d'Atlantic Re.

**🗣️ Speech :**
> "Notre vision pour l'avenir de la plateforme s'inscrit dans cette même exigence. Portail360 n'a pas vocation à être déployé sur un Cloud public. L'objectif final est d'héberger ce travail directement sur les serveurs internes de l'entreprise (On-Premise). L'outil et ses données resteront la propriété exclusive et locale de votre infrastructure, avant d'aborder plus profondément l'architecture technique."

---

## SLIDE 6 — Architecture de la Plateforme (Vue globale)'''

text = text.replace('## SLIDE 4 — Architecture de la Plateforme (Vue globale)', insertion)

def replacer(match):
    num = int(match.group(1))
    if num >= 5:
        return 'SLIDE ' + str(num + 2)
    return match.group(0)

# Temporarily mark SLIDE 6 (the original SLIDE 4 that we just inserted) to not be touched by our increment
text = text.replace('## SLIDE 6 — Architecture de la Plateforme (Vue globale)', '## SLIDE_TEMP_6 — Architecture de la Plateforme (Vue globale)')

# Replace 'SLIDE X' where X >= 5 in the rest of the text
text = re.sub(r'SLIDE (\d+)', replacer, text)

# Also need to replace '(SLIDES 5-6)' format
def range_replacer(match):
    start = int(match.group(1))
    end = int(match.group(2))
    if start >= 5:
        return f'SLIDES {start+2}-{end+2}'
    return match.group(0)

text = re.sub(r'SLIDES (\d+)-(\d+)', range_replacer, text)

# Restore SLIDE 6
text = text.replace('## SLIDE_TEMP_6', '## SLIDE 6')

with open('c:/Users/TEMLALI/.gemini/antigravity/scratch/reinsurance-platform/presentation_finale_canva_speech.md', 'w', encoding='utf-8') as f:
    f.write(text)
print('Done!')
