const { chromium } = require('playwright');
const items = JSON.parse(process.argv[2]);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const [name, l1, l2] of items) {
    await p.setContent(`<html><head><style>@font-face{font-family:G;src:url(data:font/woff2;base64,${require("fs").readFileSync("gaegu-700.woff2").toString("base64")})}
    html,body{margin:0;background:transparent}
    .b{position:absolute;left:60px;right:60px;top:250px;padding:26px 30px 30px;background:#fbf6ea;border:7px solid #2d3263;border-radius:34px;transform:rotate(-1.5deg);
    font-family:G;text-align:center;color:#2d3263;font-size:76px;line-height:1.05;letter-spacing:-3px;box-shadow:0 10px 0 rgba(45,50,99,.25)}
    .b span{color:#d8402f}</style></head><body><div class="b">${l1}<br><span>${l2}</span></div></body></html>`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: name + '.png', omitBackground: true });
  }
  await b.close();
})();
