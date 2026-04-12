const fs = require('fs');
const filepath = 'c:\\\\Users\\\\SMAIKI\\\\AtlanticRe\\\\frontend\\\\src\\\\pages\\\\TargetShare.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// 1. Remove exportCsv code
content = content.replace(/  \/\/  Export CSV \(client-side\)[\s\S]*?setExporting\(false\)\n    }\n  }\n/m, '');

// 2. Remove Exporter CSV button
content = content.replace(/          <button\n            onClick=\{exportCsv\}[\s\S]*?<\/button>\n/m, '');

// 3. Remove Parfaits pill type
content = content.replace(/type PillKey = 'top_potentiel' \| 'top_baisse' \| 'parfaits' \| 'all'/, "type PillKey = 'top_potentiel' | 'top_baisse' | 'all'");

// 4. Remove Parfaits pill button
content = content.replace(/          <PillButton active=\{pill === 'parfaits'\} onClick=\{\(\) => setPill\('parfaits'\)\}>\n             Parfaits\n          <\/PillButton>\n/m, '');

// 5. Extract Table section
const tableRegex = /        \{\/\*  Table  \*\/}\n        <div className="glass-card p-4">[\s\S]*?        <\/div>\n/m;
const tableMatch = content.match(tableRegex);
if (!tableMatch) console.log("Error finding Table section");
const tableSection = tableMatch[0];

// Remove Table section in current place (which is after Charts)
content = content.replace(tableRegex, '');

// 6. Replace Charts section header to be grid-cols-1 and remove Scatter chart
const chartsRegex = /        \{\/\*  Charts  \*\/}\n        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">\n([\s\S]*?)          \{\/\* Scatter \*\/\}[\s\S]*?(        <\/div>\n)/m;
const chartsMatch = content.match(chartsRegex);
if (!chartsMatch) console.log("Error finding Charts section");
const top15Section = chartsMatch[1];
const closingDiv = chartsMatch[2];

const newChartsSection = "        {/*  Charts  */}\n        <div className=\"grid grid-cols-1 gap-4\">\n" + top15Section + closingDiv;

// Replace old charts with new charts
content = content.replace(chartsRegex, newChartsSection);

// 7. Insert Table section above Charts section
const insertRegex = /        \{\/\*  Charts  \*\/}/;
content = content.replace(insertRegex, tableSection + '\n        {/*  Charts  */}');

fs.writeFileSync(filepath, content, 'utf-8');
console.log("Node script executed successfully.");
