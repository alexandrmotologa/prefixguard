const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

function buildLogoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <clipPath id="squircle-clip">
      <rect x="24" y="24" width="976" height="976" rx="220" />
    </clipPath>

    <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f5ff"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>

    <linearGradient id="cyan-eye" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#00f5ff"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>

    <linearGradient id="slate-chest" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>

    <filter id="subtle-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.14" />
    </filter>
  </defs>

  <!-- Luxury White Squircle Container -->
  <rect x="24" y="24" width="976" height="976" rx="220" fill="#ffffff" stroke="#e2e8f0" stroke-width="6" />

  <g clip-path="url(#squircle-clip)">
    <g transform="translate(512, 512)" filter="url(#subtle-shadow)">

      <!-- Hexagonal Architectural Gateway Frame -->
      <polygon points="
        0,-390
        338,-195
        338,195
        0,390
        -338,195
        -338,-195
      " fill="none" stroke="#0f172a" stroke-width="40" stroke-linejoin="round" />

      <!-- Inner Dashed Telemetry Ring (Cyan) -->
      <polygon points="
        0,-355
        307,-177
        307,177
        0,355
        -307,177
        -307,-177
      " fill="none" stroke="#00f5ff" stroke-width="4" opacity="0.4" stroke-dasharray="16, 12" />

      <!-- Watertight Base Silhouette of the Sentinel Lynx Mascot -->
      <path d="
        M 0,-280
        L 45,-210 L 110,-305 L 145,-320 L 135,-210
        L 190,-130 L 235,-40 L 255,70 L 205,180
        L 145,260 L 60,320 L 0,335
        L -60,320 L -145,260 L -205,180
        L -255,70 L -235,-40 L -190,-130
        L -135,-210 L -145,-320 L -110,-305
        L -45,-210 Z
      " fill="#0b0f19" />

      <!-- Chest Aegis Armor Plates (Bottom) -->
      <polygon points="0,170 85,240 0,335" fill="#1e293b" />
      <polygon points="0,170 -85,240 0,335" fill="#0f172a" />
      <polygon points="85,240 145,260 60,320 0,335" fill="#0f172a" />
      <polygon points="-85,240 -145,260 -60,320 0,335" fill="#1e293b" />

      <!-- Lower Jaw & Muzzle Slate Geometry (Refined, NO buck teeth) -->
      <polygon points="0,105 50,155 0,170" fill="#cbd5e1" />
      <polygon points="0,105 -50,155 0,170" fill="#94a3b8" />
      <polygon points="50,155 85,240 0,170" fill="#475569" />
      <polygon points="-50,155 -85,240 0,170" fill="#334155" />

      <!-- Obsidian Nose Pad -->
      <polygon points="0,75 28,105 -28,105" fill="#090d16" />

      <!-- Muzzle Whisker Flanks (Lateral Titanium/Slate) -->
      <polygon points="28,105 110,125 50,155" fill="#94a3b8" />
      <polygon points="-28,105 -110,125 -50,155" fill="#64748b" />
      <polygon points="110,125 180,140 145,260 85,240 50,155" fill="#1e293b" />
      <polygon points="-110,125 -180,140 -145,260 -85,240 -50,155" fill="#0f172a" />

      <!-- Cheekbone / Lynx Side Ruff (Wide, Aerodynamic Facets) -->
      <polygon points="190,-130 235,-40 140,-15 115,-75" fill="#334155" />
      <polygon points="-190,-130 -235,-40 -140,-15 -115,-75" fill="#1e293b" />
      <polygon points="235,-40 255,70 170,45 140,-15" fill="#1e293b" />
      <polygon points="-235,-40 -255,70 -170,45 -140,-15" fill="#0f172a" />
      <polygon points="255,70 205,180 180,140 170,45" fill="#334155" />
      <polygon points="-255,70 -205,180 -180,140 -170,45" fill="#1e293b" />

      <!-- Mid-Face Bridge & Cheeks -->
      <polygon points="0,5 0,75 28,105 45,35" fill="#475569" />
      <polygon points="0,5 0,75 -28,105 -45,35" fill="#334155" />
      <polygon points="0,5 45,35 75,-30 0,-35" fill="#64748b" />
      <polygon points="0,5 -45,35 -75,-30 0,-35" fill="#475569" />

      <polygon points="45,35 28,105 110,125 130,25" fill="#334155" />
      <polygon points="-45,35 -28,105 -110,125 -130,25" fill="#1e293b" />
      <polygon points="130,25 110,125 170,45" fill="#1e293b" />
      <polygon points="-130,25 -110,125 -170,45" fill="#0f172a" />

      <!-- Suborbital Facet & Malar Contour (Predator Cheek Lines) -->
      <polygon points="75,-30 130,25 140,-15" fill="#1e293b" />
      <polygon points="-75,-30 -130,25 -140,-15" fill="#0f172a" />

      <!-- Electric Cyan Predator Eyes (Almond Shape with Sharp Cant) -->
      <!-- Left Eye (Viewer's Left, x < 0) -->
      <polygon points="-38,-20 -95,-10 -65,10" fill="url(#cyan-eye)" />
      <polygon points="-48,-15 -85,-8 -60,5" fill="#ffffff" opacity="0.8" />
      <polygon points="-58,-20 -64,-20 -60,10" fill="#042f2e" /> <!-- Slit pupil -->

      <!-- Right Eye (Viewer's Right, x > 0) -->
      <polygon points="38,-20 95,-10 65,10" fill="url(#cyan-eye)" />
      <polygon points="48,-15 85,-8 60,5" fill="#ffffff" opacity="0.8" />
      <polygon points="58,-20 64,-20 60,10" fill="#042f2e" /> <!-- Slit pupil -->

      <!-- Brow Ridge & Forehead Plates -->
      <polygon points="0,-35 75,-30 115,-75 0,-105" fill="#334155" />
      <polygon points="0,-35 -75,-30 -115,-75 0,-105" fill="#1e293b" />
      <polygon points="75,-30 140,-15 115,-75" fill="#475569" />
      <polygon points="-75,-30 -140,-15 -115,-75" fill="#334155" />

      <!-- Forehead Crown (Shield / Prefix Lock Hex Facet) -->
      <polygon points="0,-105 55,-165 0,-215" fill="#475569" />
      <polygon points="0,-105 -55,-165 0,-215" fill="#334155" />
      <polygon points="0,-105 115,-75 140,-155 55,-165" fill="#1e293b" />
      <polygon points="0,-105 -115,-75 -140,-155 -55,-165" fill="#0f172a" />
      <polygon points="0,-215 45,-210 0,-280" fill="#64748b" />
      <polygon points="0,-215 -45,-210 0,-280" fill="#475569" />
      <polygon points="45,-210 55,-165 110,-205" fill="#334155" />
      <polygon points="-45,-210 -55,-165 -110,-205" fill="#1e293b" />

      <!-- Lynx Ear Tufts (Iconic Upward-Pointing Feathered Tufts) -->
      <!-- Left Ear (x < 0) -->
      <polygon points="-115,-75 -190,-130 -140,-155" fill="#1e293b" />
      <polygon points="-140,-155 -190,-130 -135,-210" fill="#334155" />
      <polygon points="-140,-155 -135,-210 -110,-205" fill="#475569" />
      <!-- Left Tuft Apex -->
      <polygon points="-135,-210 -145,-320 -110,-305" fill="#00f5ff" opacity="0.9" />
      <polygon points="-135,-210 -110,-305 -110,-205" fill="#0284c7" />
      <polygon points="-110,-205 -110,-305 -45,-210" fill="#0f172a" />

      <!-- Right Ear (x > 0) -->
      <polygon points="115,-75 190,-130 140,-155" fill="#334155" />
      <polygon points="140,-155 190,-130 135,-210" fill="#475569" />
      <polygon points="140,-155 135,-210 110,-205" fill="#64748b" />
      <!-- Right Tuft Apex -->
      <polygon points="135,-210 145,-320 110,-305" fill="#00f5ff" opacity="0.9" />
      <polygon points="135,-210 110,-305 110,-205" fill="#0284c7" />
      <polygon points="110,-205 110,-305 45,-210" fill="#1e293b" />

      <!-- Center Forehead Core Node (Cyan Accent Badge) -->
      <polygon points="0,-140 18,-115 0,-90 -18,-115" fill="url(#cyan-glow)" />

    </g>
  </g>
</svg>`;
}

async function renderLogo() {
  const outputDir = path.join(__dirname, '..', 'docs', 'images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const svg = buildLogoSvg();
  const svgPath = path.join(outputDir, 'logo.svg');
  const pngPath = path.join(outputDir, 'logo.png');

  fs.writeFileSync(svgPath, svg, 'utf-8');

  // Render to 1024x1024 PNG using Resvg
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1024 }
  });
  const pngData = resvg.render().asPng();
  fs.writeFileSync(pngPath, pngData);

  console.log(`[✓] Successfully generated:`);
  console.log(`    - SVG: ${svgPath}`);
  console.log(`    - PNG: ${pngPath} (1024x1024 px, ${pngData.length} bytes)`);
}

renderLogo().catch(err => {
  console.error('Error rendering logo:', err);
  process.exit(1);
});
