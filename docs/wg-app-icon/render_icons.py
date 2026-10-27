# Usage: python3 render_icons.py <folder with icon.svg + favicon.svg>
# Needs: pip install playwright && playwright install chromium
import base64, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

d = Path(sys.argv[1])
icon = (d/"icon.svg").read_text()
fav = (d/"favicon.svg").read_text()

# maskable: content scaled to 80 % inside the safe zone, background stays full-bleed
body = icon.split('fill="#1D1838"/>',1)[1].rsplit('</svg>',1)[0]
mask = ('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">\n'
        '  <rect x="0" y="0" width="180" height="180" fill="#1D1838"/>\n'
        '  <g transform="translate(18 18) scale(0.8)">' + body + '  </g>\n</svg>\n')
(d/"icon-maskable.svg").write_text(mask)

def uri(s): return "data:image/svg+xml;base64," + base64.b64encode(s.encode()).decode()

jobs = [
  (icon, 180, "apple-touch-icon.png"),
  (icon, 192, "icon-192.png"),
  (icon, 512, "icon-512.png"),
  (mask, 512, "icon-maskable-512.png"),
  (fav, 32, "favicon-32.png"),
  (fav, 16, "favicon-16.png"),
]
with sync_playwright() as p:
    b = p.chromium.launch()
    for svg, size, out in jobs:
        pg = b.new_page(viewport={"width": size, "height": size}, device_scale_factor=1)
        pg.set_content(f'<html><body style="margin:0"><img src="{uri(svg)}" width="{size}" height="{size}" style="display:block"></body></html>')
        pg.wait_for_timeout(150)
        pg.screenshot(path=str(d/out), clip={"x":0,"y":0,"width":size,"height":size})
        pg.close()

    def cell(svg, s, r, fg):
        return (f'<div style="display:flex;flex-direction:column;align-items:center;gap:8px">'
                f'<img src="{uri(svg)}" width="{s}" height="{s}" style="display:block;border-radius:{r}px">'
                f'<span style="font:700 12px system-ui;color:{fg}">{s}</span></div>')
    def panel(bg, fg):
        cells = cell(icon,180,40,fg)+cell(icon,60,13,fg)+cell(fav,32,0,fg)+cell(fav,16,0,fg)
        return f'<div style="display:flex;align-items:flex-end;gap:28px;padding:28px;border-radius:20px;background:{bg}">{cells}</div>'
    html = ('<html><body style="margin:0;background:#F4F2FB;font-family:system-ui">'
            '<div style="padding:40px;display:flex;flex-direction:column;gap:20px">'
            '<div style="font:800 32px ui-rounded,system-ui;color:#1D1838">WG-App · App-Icon</div>'
            '<div style="font:500 15px system-ui;color:#6B6685">180 / 60 mit iOS-Maske · 32 / 16 = favicon (vereinfachte Version)</div>'
            '<div style="display:flex;gap:24px">' + panel("#DCD7EA","#4A4566") + panel("#121022","#B9B4D6") + '</div>'
            '</div></body></html>')
    pg = b.new_page(viewport={"width": 1000, "height": 400}, device_scale_factor=2)
    pg.set_content(html); pg.wait_for_timeout(200)
    pg.screenshot(path=str(d/"preview.png"), full_page=True)
    b.close()
print("ok")
