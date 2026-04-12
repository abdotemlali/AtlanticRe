const fs = require('fs');
const filepath = 'c:\\\\Users\\\\SMAIKI\\\\AtlanticRe\\\\frontend\\\\src\\\\pages\\\\TargetShare.tsx';
let lines = fs.readFileSync(filepath, 'utf-8').split('\n');

function writeLines() {
    fs.writeFileSync(filepath, lines.join('\n'), 'utf-8');
}

// Just copy table section and top 15 section, then rewrite the whole middle body
// Find bounds exactly
const lineIndex = (str) => lines.findIndex(l => l.includes(str));

let cStart = lineIndex('{/*  Charts  */}');
let scatterStart = lineIndex('{/* Scatter */}');
let tableStart = lineIndex('{/*  Table  */}');
// find end of table (the </div> before the last </div>)
// It's line 600 based on my read
let tableEnd = 600 - 1; // 0-indexed is 599

let chartsToBeforeScatter = lines.slice(cStart, scatterStart);
let top15End = scatterStart - 1;

let top15Block = lines.slice(cStart + 1, top15End);
// fix the grid col
for(let i=0; i<top15Block.length; i++) {
   if(top15Block[i].includes('grid-cols-1 xl:grid-cols-2')) {
       top15Block[i] = top15Block[i].replace('grid-cols-1 xl:grid-cols-2', 'grid-cols-1');
       break;
   }
}

// table block
let tableBlock = lines.slice(tableStart, tableEnd + 1);

// We need to replace from cStart to tableEnd with: TableBlock then Charts { Top15 }
let newBlock = [
    ...tableBlock,
    '',
    '        {/*  Charts  */}',
    ...top15Block,
    '        </div>'
];

lines.splice(cStart, tableEnd - cStart + 1, ...newBlock);

// remove button Parfaits
let parfaitsBtnStart = lines.findIndex(l => l.includes("PillButton active={pill === 'parfaits'}"));
if (parfaitsBtnStart !== -1) {
    lines.splice(parfaitsBtnStart, 3);
}

// remove Type parfaits
let pillTypeIndex = lines.findIndex(l => l.includes("type PillKey ="));
if(pillTypeIndex !== -1) {
    lines[pillTypeIndex] = lines[pillTypeIndex].replace(" | 'parfaits'", "");
}

// remove Export button
let expBtnStart = lines.findIndex(l => l.includes("<button") && lines[l+1] && lines[l+1].includes("onClick={exportCsv}"));
if (expBtnStart !== -1) {
    let expBtnEnd = expBtnStart;
    while(!lines[expBtnEnd].includes("</button>")) expBtnEnd++;
    lines.splice(expBtnStart, expBtnEnd - expBtnStart + 1);
}

// remove exportCsv function
let exportCsvStart = lines.findIndex(l => l.includes("//  Export CSV"));
if (exportCsvStart !== -1) {
    let exportCsvEnd = lines.findIndex(l => l.includes("const handleSort ="));
    if (exportCsvEnd !== -1) {
        lines.splice(exportCsvStart, exportCsvEnd - exportCsvStart);
    }
}

writeLines();
console.log("Script successful!");
