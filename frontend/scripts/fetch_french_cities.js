import fs from 'fs';
import https from 'https';
import path from 'path';

const url = 'https://raw.githubusercontent.com/etalab/geojson-communes-france/master/communes-20240101.geojson';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const geo = JSON.parse(data);
      const cities = geo.features.map(f => ({ nom: f.properties.nom, code: f.properties.code }));
      const outPath = path.resolve(__dirname, '..', 'src', 'data', 'french_cities.json');
      fs.writeFileSync(outPath, JSON.stringify(cities, null, 2), 'utf8');
      console.log(`Written ${cities.length} French communes to ${outPath}`);
    } catch (e) {
      console.error('Failed to parse or write cities:', e);
    }
  });
}).on('error', (err) => {
  console.error('Error fetching GeoJSON:', err);
});
