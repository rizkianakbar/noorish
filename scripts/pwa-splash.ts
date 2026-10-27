/**
 * Renders the PWA's iOS launch images (`public/splash/`) and app icons from
 * the same splash markup the app paints first (`src/features/pwa/pwa.constants.ts`),
 * and the raster favicons from `public/favicon.svg`, using the local Chrome
 * over its DevTools protocol.
 *
 * Usage: `bun pwa:splash`. Re-run after changing the splash or the star.
 */
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IOS_SPLASH_SCREENS, SPLASH_CSS, SPLASH_STAR } from '#/features/pwa/pwa.constants.ts';

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9335;
const PUBLIC = join(import.meta.dirname, '../public');

// The viewport tag matters: without it a mobile page lays out 980px wide and
// shrinks to fit, which drew the star at ~40% of the size the app paints it.
const VIEWPORT = '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">';

const splashPage = `<!doctype html>${VIEWPORT}<style>${SPLASH_CSS}#splash{display:grid}</style><div id="splash">${SPLASH_STAR}</div>`;

/**
 * The icon: the star on the splash ground, inset by `inset` of the size,
 * rounded unless it's the maskable one (the launcher masks that itself).
 */
function iconPage(inset: number, radius: string) {
  const star = SPLASH_STAR.replace('width="112" height="112"', 'width="100%" height="100%"').replace(
    'drop-shadow',
    'none',
  );
  return `<!doctype html>${VIEWPORT}<style>${SPLASH_CSS}html,body{margin:0;height:100%;background:transparent}#splash{display:grid;border-radius:${radius};padding:${inset * 100}%}#splash svg{filter:none}</style><div id="splash">${star}</div>`;
}

/**
 * The favicon SVG drawn edge to edge, for the raster sizes. Google shows a
 * site's favicon in results only if it's square and a multiple of 48px (or
 * an SVG), and browsers and crawlers that ignore `<link rel="icon">` ask
 * for `/favicon.ico`.
 */
async function faviconPage() {
  const svg = await readFile(join(PUBLIC, 'favicon.svg'));
  return `<!doctype html>${VIEWPORT}<style>html,body{margin:0;height:100%;background:transparent}img{display:block;width:100%;height:100%}</style><img src="data:image/svg+xml;base64,${svg.toString('base64')}">`;
}

/**
 * An ICO file holding PNG images, one directory entry each (a 0 byte means 256).
 */
function ico(images: { size: number; png: Buffer }[]) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size % 256, entry);
    header.writeUInt8(size % 256, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.png)]);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const profile = await mkdtemp(join(tmpdir(), 'noorish-splash-'));
  const chrome = spawn(
    CHROME,
    ['--headless=new', '--disable-gpu', `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`, 'about:blank'],
    {
      stdio: 'ignore',
    },
  );

  try {
    let targets: { type: string; webSocketDebuggerUrl: string }[] = [];
    for (let i = 0; i < 40 && targets.length === 0; i++) {
      targets = await fetch(`http://127.0.0.1:${PORT}/json`)
        .then((r) => r.json())
        .catch(() => sleep(250).then(() => []));
    }
    const page = targets.find((t) => t.type === 'page');
    if (!page) throw new Error('Chrome did not open a page');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve));
    let id = 0;
    const pending = new Map<number, (value: { result: Record<string, unknown> }) => void>();
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    });
    const send = (method: string, params: object = {}) =>
      new Promise<{ result: Record<string, unknown> }>((resolve) => {
        const n = ++id;
        pending.set(n, resolve);
        ws.send(JSON.stringify({ id: n, method, params }));
      });

    const render = async (html: string, width: number, height: number, scale: number, out?: string) => {
      const jpeg = out?.endsWith('.jpg');
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: true });
      await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
      await send('Page.navigate', { url: `data:text/html;base64,${Buffer.from(html).toString('base64')}` });
      await sleep(300);
      const { result } = await send(
        'Page.captureScreenshot',
        jpeg ? { format: 'jpeg', quality: 90 } : { format: 'png' },
      );
      const png = Buffer.from(result.data as string, 'base64');
      if (out) await writeFile(out, png);
      return png;
    };

    await mkdir(join(PUBLIC, 'splash'), { recursive: true });
    for (const screen of IOS_SPLASH_SCREENS) {
      await render(splashPage, screen.width, screen.height, screen.scale, join(PUBLIC, screen.file.slice(1)));
    }
    await render(iconPage(0.125, '22%'), 192, 192, 1, join(PUBLIC, 'icon-192.png'));
    await render(iconPage(0.125, '22%'), 512, 512, 1, join(PUBLIC, 'icon-512.png'));
    await render(iconPage(0.22, '0'), 512, 512, 1, join(PUBLIC, 'icon-maskable-512.png'));

    const favicon = await faviconPage();
    const favicons = [];
    for (const size of [16, 32, 48]) favicons.push({ size, png: await render(favicon, size, size, 1) });
    await writeFile(join(PUBLIC, 'favicon.ico'), ico(favicons));
    await render(favicon, 96, 96, 1, join(PUBLIC, 'favicon-96.png'));
    console.log(`Wrote ${IOS_SPLASH_SCREENS.length} launch images, 3 icons and the favicons`);
    ws.close();
  } finally {
    chrome.kill();
  }
}

await main();
