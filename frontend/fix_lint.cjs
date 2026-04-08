const fs = require('fs');
const path = require('path');

const srcDir = 'src';

// Remove 'import React from "react"' or 'import React, {'
const fixReactImports = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import\s+React\s*,\s*\{\s*(.*?)\s*\}\s*from\s*['"]react['"]/g, 'import { $1 } from "react"');
  content = content.replace(/import\s+React\s+from\s*['"]react['"]\s*;/g, '');
  content = content.replace(/import\s+React\s+from\s*['"]react['"]\n/g, '');
  fs.writeFileSync(file, content);
}

const traverse = (dir) => {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      fixReactImports(fullPath);
    }
  });
}

// 1. Traverse to fix React imports
traverse(srcDir);

// 2. Fix specific file errors mentioned in log
const manualFixes = [
  { p: 'src/components/Charts/DistributionCharts.tsx', r: [ [/(entry,\s*index)/g, '_entry, index'] ] },
  { p: 'src/components/Charts/FinancesChart.tsx', r: [ [ /,\s*Legend/, '' ], [ /,\s*formatPercent/, '' ] ] },
  { p: 'src/components/Charts/RentabiliteChart.tsx', r: [ [ /BarChart,\s*/, '' ] ] },
  { p: 'src/hooks/useInactiveClients.ts', r: [ [ /import \{ InactiveClient \} from '\.\.\/types\/clients\.types'/, '' ] ] },
  { p: 'src/pages/Admin.tsx', r: [ [ /UserCreate,\s*/, '' ] ] },
  { p: 'src/pages/Analysis.tsx', r: [ [ /(entry,\s*index)/g, '_entry, index'] ] },
  { p: 'src/pages/CedanteAnalysis.tsx', r: [ [ /(entry,\s*index)/g, '_entry, index'], [ /,\s*LineChart/g, ''] ] },
  { p: 'src/pages/Comparison.tsx', r: [ [ /const { filterOptions } = useData\(\)/, ''], [ /const inverse =.*?;\n/, ''] ] },
  { p: 'src/pages/Dashboard.tsx', r: [ [ /const location = useLocation\(\)/, '' ], [ /import { useLocation .*? } from 'react-router-dom'/g, "import { useNavigate } from 'react-router-dom'"] ] },
  { p: 'src/pages/ExpositionRisques.tsx', r: [ [ /,\s*Cell\s*\} from 'recharts'/, "} from 'recharts'"], [ /interface KPIResult \{[\s\S]*?\}/, '' ], [ /const \{ filters, filterOptions \} = useData\(\)/, 'const { filters } = useData()' ] ] }
];

manualFixes.forEach(({p, r}) => {
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    r.forEach(([find, repl]) => {
      content = content.replace(find, repl);
    });
    fs.writeFileSync(p, content);
  }
});

console.log('Fixed lint issues');
