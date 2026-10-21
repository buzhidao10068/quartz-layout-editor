import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const root = fileURLToPath(new URL('../', import.meta.url));
export function loadCore() {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const match = html.match(/<script id="core">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Missing pure core script');
  const context = vm.createContext({});
  vm.runInContext(`${match[1]}\nglobalThis.api = QuartzEditor;`, context, { timeout: 1000 });
  return context.api;
}

export const plain = value => JSON.parse(JSON.stringify(value));
