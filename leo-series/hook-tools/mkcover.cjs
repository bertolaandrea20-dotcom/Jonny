const { chromium } = require('playwright'); const fs = require('fs');
const items = JSON.parse(process.argv[2]);
const font = fs.readFileSync('gaegu-700.woff2').toString('base64');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const [out, bg, l1, l2, big, by] of items) {
    const img = fs.readFileSync(bg).toString('base64');
    await p.setContent(`<html><head><style>@font-face{font-family:G;src:url(data:font/woff2;base64,${font})}
    html,body{margin:0;width:1080px;height:1920px;background:url(data:image/jpeg;base64,${img}) center/cover}
    .b{position:absolute;left:60px;right:60px;top:250px;padding:26px 30px 30px;background:#fbf6ea;border:7px solid #2d3263;border-radius:34px;transform:rotate(-1.5deg);
    font-family:G;text-align:center;color:#2d3263;font-size:76px;line-height:1.05;letter-spacing:-3px;box-shadow:0 10px 0 rgba(45,50,99,.25)}
    .b span{color:#d8402f}
    .t{position:absolute;left:0;right:0;top:${by}px;text-align:center;font-family:G;font-size:190px;letter-spacing:-4px;color:#d8402f;transform:rotate(2deg);
    -webkit-text-stroke:5px #2d3263;paint-order:stroke fill;text-shadow:0 8px 0 #fbf6ea,0 -6px 0 #fbf6ea,8px 0 0 #fbf6ea,-8px 0 0 #fbf6ea}
    </style></head><body><div class="b">${l1}<br><span>${l2}</span></div><div class="t">${big}</div></body></html>`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: out, type: 'jpeg', quality: 92 });
  }
  await b.close();
})();
