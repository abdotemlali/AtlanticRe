import re

with open(r'c:\Users\SMAIKI\AtlanticRe\frontend\src\pages\TargetShare.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove exportCsv code
content = re.sub(r'  //  Export CSV \(client-side\).*?setExporting\(false\)\n    }\n  }\n', '', content, flags=re.DOTALL)

# 2. Remove Exporter CSV button
content = re.sub(r'          <button\n            onClick=\{exportCsv\}.*?</button>\n', '', content, flags=re.DOTALL)

# 3. Remove Parfaits pill type
content = re.sub(r"type PillKey = 'top_potentiel' \| 'top_baisse' \| 'parfaits' \| 'all'", "type PillKey = 'top_potentiel' | 'top_baisse' | 'all'", content)

# 4. Remove Parfaits pill button
content = re.sub(r"          <PillButton active=\{pill === 'parfaits'\} onClick=\{\(\) => setPill\('parfaits'\)\}>\n             Parfaits\n          </PillButton>\n", '', content)

# 5. Extract Table section
p_table = re.compile(r'        \{/\*  Table  \*/\}\n        <div className=\"glass-card p-4\">\n(?:.*?)        </div>\n', re.DOTALL)
m_table = p_table.search(content)
if not m_table: print("Error finding Table section")
table_section = m_table.group(0)

# Remove Table section in current place (which is after Charts)
content = p_table.sub('', content)

# 6. Replace Charts section header to be grid-cols-1 and remove Scatter chart
p_charts = re.compile(r'        \{/\*  Charts  \*/\}\n        <div className=\"grid grid-cols-1 xl:grid-cols-2 gap-4\">\n(.*?)          \{/\* Scatter \*/\}.*?(        </div>\n)', re.DOTALL)
m_charts = p_charts.search(content)
if not m_charts: print("Error finding Charts section")
top15_section = m_charts.group(1) # This is the Top 15 section
closing_div = m_charts.group(2)   # The closing div of grid

new_charts_section = "        {/*  Charts  */}\n        <div className=\"grid grid-cols-1 gap-4\">\n" + top15_section + closing_div

# Replace old charts with new charts
content = p_charts.sub(new_charts_section, content)

# 7. Insert Table section above Charts section
p_insert = re.compile(r'        \{/\*  Charts  \*/\}')
content = p_insert.sub(table_section + '\n        {/*  Charts  */}', content)

with open(r'c:\Users\SMAIKI\AtlanticRe\frontend\src\pages\TargetShare.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Python script executed successfully.")
