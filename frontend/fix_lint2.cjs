const fs = require('fs');

// Restore React
const addReact = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  if(!content.includes("import React ")) {
      content = "import React from 'react';\n" + content;
  }
  fs.writeFileSync(file, content);
}

['src/components/FilterPanel.tsx', 'src/components/KPICards.tsx', 'src/pages/Comparison.tsx', 'src/pages/ExpositionRisques.tsx', 'src/pages/InactiveClients.tsx']
.forEach(addReact);

// Revert _entry everywhere generically
const revertEntry = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/_entry,\s*index/g, 'entry, index');
  fs.writeFileSync(file, content);
}

['src/components/Charts/DistributionCharts.tsx', 'src/pages/Analysis.tsx', 'src/pages/CedanteAnalysis.tsx']
.forEach(revertEntry);
