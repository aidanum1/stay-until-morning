// npm run locales — see tools/locales-lib.ts
import { buildLocales } from './locales-lib';

try {
  buildLocales();
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
