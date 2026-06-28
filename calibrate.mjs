import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'fs';

const SIZE = 300;
const FONT_SIZE = Math.round(SIZE * 0.78);
const CY = Math.round(SIZE * 0.62);
const CX = SIZE / 2;

const LETTERS = ['آ','ا','ب','پ','ت','ث','ج','چ','ح','خ','د','ذ','ر','ز','ژ','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ک','گ','ل','م','ن','و','ه','ی'];

const fontData = readFileSync('/tmp/package/files/vazirmatn-arabic-700-normal.woff');
const fontB64 = fontData.toString('base64');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: SIZE, height: SIZE });

await page.setContent(`<!DOCTYPE html><html><head>
<style>
@font-face {
  font-family: 'Vazirmatn';
  font-weight: 700;
  src: url('data:font/woff;base64,${fontB64}') format('woff');
}
* { margin: 0; padding: 0; }
body { background: white; }
canvas { display: block; }
</style>
</head><body>
<canvas id="c" width="${SIZE}" height="${SIZE}"></canvas>
<div style="font-family:Vazirmatn;font-weight:700;visibility:hidden;position:absolute">ب آ ا پ ت ث ج</div>
</body></html>`);

await page.waitForFunction(() => document.fonts.ready.then(() => true));
await page.waitForTimeout(500);

mkdirSync('/tmp/letter-screenshots', { recursive: true });

const results = await page.evaluate(({ LETTERS, SIZE, FONT_SIZE, CY, CX }) => new Promise(resolve => {
  document.fonts.ready.then(() => {
    const ctx = document.getElementById('c').getContext('2d');
    const out = {};
    for (const letter of LETTERS) {
      ctx.clearRect(0,0,SIZE,SIZE);
      ctx.fillStyle='#fff';
      ctx.fillRect(0,0,SIZE,SIZE);
      ctx.fillStyle='#000';
      ctx.font=`bold ${FONT_SIZE}px Vazirmatn,serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(letter,CX,CY);
      const d=ctx.getImageData(0,0,SIZE,SIZE).data;
      let mnX=SIZE,mxX=0,mnY=SIZE,mxY=0,ok=false;
      for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++) if(d[(y*SIZE+x)*4+3]>30){if(x<mnX)mnX=x;if(x>mxX)mxX=x;if(y<mnY)mnY=y;if(y>mxY)mxY=y;ok=true;}
      if(ok) out[letter]={mnX,mxX,mnY,mxY,w:mxX-mnX,h:mxY-mnY,cx:Math.round((mnX+mxX)/2),cy:Math.round((mnY+mxY)/2)};
    }
    resolve(out);
  });
}), { LETTERS, SIZE, FONT_SIZE, CY, CX });

// Take individual screenshots of each letter
for (const letter of LETTERS) {
  await page.evaluate(({ letter, SIZE, FONT_SIZE, CY, CX }) => {
    const ctx = document.getElementById('c').getContext('2d');
    ctx.clearRect(0,0,SIZE,SIZE);
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,SIZE,SIZE);
    ctx.fillStyle='#000';
    ctx.font=`bold ${FONT_SIZE}px Vazirmatn,serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(letter,CX,CY);
  }, { letter, SIZE, FONT_SIZE, CY, CX });

  const screenshot = await page.screenshot({ clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
  const filename = `/tmp/letter-screenshots/${encodeURIComponent(letter)}.png`;
  import('fs').then(fs => fs.writeFileSync(filename, screenshot));
}

await browser.close();

console.log('// Bounding boxes from actual Chromium rendering of Vazirmatn Bold 234px, 300×300 canvas, textBaseline=middle cy=186');
console.log('// Format: letter x[L-R] y[T-B] WxH center=(cx,cy)');
console.log('');
for(const[l,b] of Object.entries(results))
  console.log(`'${l}': x[${b.mnX}-${b.mxX}] y[${b.mnY}-${b.mxY}] ${b.w}x${b.h} center=(${b.cx},${b.cy})`);
console.log('');
console.log('Screenshots saved to /tmp/letter-screenshots/');
