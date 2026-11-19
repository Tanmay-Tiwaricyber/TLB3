// Generate a static same-origin sprite, not a client-side dependency or CDN request.
import { readFile, writeFile, copyFile } from 'node:fs/promises';

const library = new URL('./node_modules/lucide-static/', import.meta.url);
const assets = new URL('../assets/', import.meta.url);
const icons = {
  overview: 'layout-dashboard', attendance: 'clock-3', payroll: 'wallet-cards',
  profile: 'user-round', team: 'users-round', reports: 'chart-no-axes-column-increasing',
  settings: 'settings-2', help: 'circle-help', logout: 'log-out', location: 'map-pin',
  chevron: 'chevron-right', plus: 'plus', shield: 'shield-check', check: 'check',
  sun: 'sun', moon: 'moon', arrowUpRight: 'arrow-up-right', arrowLeft: 'arrow-left',
  arrowRight: 'arrow-right', more: 'ellipsis', download: 'download', pencil: 'pencil',
  lock: 'lock-keyhole', x: 'x', fileText: 'file-text', eye: 'eye', eyeOff: 'eye-off',
};
const symbols = await Promise.all(Object.entries(icons).map(async ([key, name]) => {
  const svg = await readFile(new URL(`icons/${name}.svg`, library), 'utf8');
  const body = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)?.[1];
  if (!body) throw new Error(`Invalid Lucide icon: ${name}`);
  return `  <symbol id="${key}" viewBox="0 0 24 24">${body}</symbol>`;
}));
const {version} = JSON.parse(await readFile(new URL('package.json', library), 'utf8'));
await writeFile(new URL('lucide.svg', assets), `<!-- Generated from lucide-static ${version}. See lucide-LICENSE.txt. -->\n<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join('\n')}\n</svg>\n`);
await copyFile(new URL('LICENSE', library), new URL('lucide-LICENSE.txt', assets));
