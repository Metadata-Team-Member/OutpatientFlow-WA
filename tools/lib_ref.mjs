// Shared loaders for the reference data (establishments, health districts) used by the generator and the data builder.
import fs from 'node:fs';
import path from 'node:path';

export function tierOf(e) {
  // Model tiers are NOT official. Official establishment type (Establishment List 2026 App. A) is kept separately in e.type.
  if (e.code === '0652') return 'OTHR';                      // Silver Chain Hospital at Home: no beds, not a site
  if (e.kind === 'nursing_post') return (e.type === 'NP' || e.type === 'OH') ? 'POST' : 'OTHR'; // NP / OH = nursing post, health centre; DS, RC, untyped = other
  if (e.code === '0107') return 'PAED';   // Perth Children's Hospital
  if (e.code === '0104') return 'WOMN';   // King Edward Memorial Hospital
  if (e.category === 'Teaching') return 'TERT';
  if (e.area === 'Metro') return 'METR';
  if (e.category === 'Regional' || e.category === 'Acute Hospital' || e.beds >= 36) return 'REGL'; // model tier: SLIP category, or 36+ beds in a rural area
  return 'DIST';
}

export function loadEstablishments(root, dims) {
  const j = JSON.parse(fs.readFileSync(path.join(root, 'data/reference/establishments.json'), 'utf8'));
  const hspIndex = Object.keys(j.hspNames);
  const regionIdx = Object.fromEntries(dims.regionOrder.map((r, i) => [r, i]));
  const order = { TERT: 0, PAED: 1, WOMN: 2, METR: 3, REGL: 4, DIST: 5, POST: 6, OTHR: 7 };
  const est = j.establishments.map((e) => ({ ...e, tier: tierOf(e), mbeds: e.beds || (e.category === 'Regional' ? 60 : 0), hspI: hspIndex.indexOf(e.hsp), regionI: regionIdx[e.region] }))
    .sort((a, b) => hspIndex.indexOf(a.hsp) - hspIndex.indexOf(b.hsp) || order[a.tier] - order[b.tier] || b.beds - a.beds || a.code.localeCompare(b.code));
  return { est, hspIndex, hspNames: j.hspNames, raw: j };
}

function ringCentroid(r) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < r.length - 1; i++) { const [x0, y0] = r[i], [x1, y1] = r[i + 1]; const f = x0 * y1 - x1 * y0; a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f; }
  a /= 2; return { a: Math.abs(a), x: cx / (6 * a), y: cy / (6 * a) };
}
export function loadGeo(root, dims) {
  const g = JSON.parse(fs.readFileSync(path.join(root, 'data/reference/wa_regions.geojson'), 'utf8'));
  const regionIdx = Object.fromEntries(dims.regionOrder.map((r, i) => [r, i]));
  const districts = g.features.filter((f) => f.properties.level === 'district').map((f) => {
    const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    let best = null; polys.forEach((p) => { const c = ringCentroid(p[0]); if (!best || c.a > best.a) best = c; });
    return { name: f.properties.name, region: f.properties.region, code: f.properties.health_code, lon: best.x, lat: best.y };
  }).sort((a, b) => regionIdx[a.region] - regionIdx[b.region] || a.name.localeCompare(b.name));
  districts.forEach((d, i) => { d.idx = i; });
  return { districts, regionIdx, geo: g };
}
