const fs = require('fs');

const extractSortIcon = () => {
  const path = 'src/pages/ExpositionRisques.tsx';
  let content = fs.readFileSync(path, 'utf8');
  
  // Extract
  const sortIconRegex = /\s*const SortIcon = \(\{\s*field\s*\}\s*:\s*\{\s*field:\s*keyof TopRisk\s*\}\) => \{[\s\S]*?\}\n/g;
  content = content.replace(sortIconRegex, '');
  
  // Add to root (find last import)
  const sortIconRoot = `
const SortIcon = ({ field, currentField, direction }: { field: keyof TopRisk; currentField: keyof TopRisk; direction: 'asc' | 'desc' }) => {
  if (currentField !== field) return <ArrowUpDown size={14} className="opacity-30" />
  return direction === 'asc' ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />
}
`;
  let lines = content.split('\n');
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImport = i;
    }
  }
  lines.splice(lastImport + 1, 0, sortIconRoot);
  content = lines.join('\n');
  
  // Update usage replacing all occurrences
  content = content.replace(/<SortIcon field="([^"]+)" \/>/g, '<SortIcon field="$1" currentField={sortField} direction={sortDirection} />');
  
  fs.writeFileSync(path, content);
};

const replaceColors = () => {
  const files = [
    'src/pages/Admin.tsx',
    'src/pages/ChangePassword.tsx',
    'src/pages/ResetPassword.tsx',
    'src/pages/MarketSelection.tsx',
    'src/pages/Recommendations.tsx'
  ];
  
  const rules = {
    '#2d3e50': 'var(--color-navy)',
    '#6b8c2a': 'hsl(83,52%,36%)',
    '#4e6820': 'hsl(83,54%,27%)',
    '#b07d00': 'hsl(30,88%,40%)',
    '#a02020': 'hsl(358,66%,40%)',
    '#d64045': 'var(--color-red)',
    '#f4a261': 'hsl(30,88%,56%)',
    '#7a8a99': 'var(--color-gray-500)',
    '#eef0f3': 'var(--color-gray-100)',
    '#cbd2da': 'var(--color-gray-200)',
    '#f5f6f8': 'var(--color-off-white)',
    '#4a5568': 'var(--color-gray-600)'
  };
  
  files.forEach(f => {
    if(!fs.existsSync(f)) return;
    let content = fs.readFileSync(f, 'utf8');
    for(const [find, replace] of Object.entries(rules)) {
      content = content.replace(new RegExp(find, 'gi'), replace);
    }
    fs.writeFileSync(f, content);
  });
};

try {
  extractSortIcon();
  replaceColors();
  console.log('DONE');
} catch (e) {
  console.error(e);
}
