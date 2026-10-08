"""Turn the Astro build (dist/) into a copy the claude.ai artifact viewer can serve.

- Relative links: root-relative URLs become page-relative, and clean page URLs get .html.
- Fonts are embedded in the CSS; the build's _astro/ folder becomes assets/ (names starting with "_" are reserved).
- The home page loses its document shell (the viewer adds one) and gets the artifact title.
- The viewer blocks other sites' frames, so the demo page's calendar area (the element marked
  data-artifact-calendar) becomes a month calendar whose days open Calendly on that date.
- The viewer keeps the scroll position when a link opens another page, so each page starts at the top.

Usage: python3 tools/make-artifact.py dist <out-dir>
"""
import base64, glob, os, re, shutil, sys

CALENDLY = 'https://calendly.com/aldenteai/30min'
CALENDAR_MARKER = 'data-artifact-calendar'

# The viewer frame can keep the previous page's scroll position (a footer link then opens the next page at its
# footer). Start each page at the top unless the link names a section or the visitor went back. After a link
# from this site, also scroll whatever holds the frame back to the frame's top, in case the viewer sizes the
# frame to the page and scrolls itself.
SCROLL_TOP = (
    '<script>(function(){var nav=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];'
    'if(location.hash||(nav&&nav.type==="back_forward"))return;'
    'try{history.scrollRestoration="manual"}catch(e){}'
    'var fromSite=false;try{fromSite=new URL(document.referrer).origin===location.origin}catch(e){}'
    'function top(){window.scrollTo({top:0,left:0,behavior:"instant"});'
    'if(fromSite)document.documentElement.scrollIntoView({block:"start",behavior:"instant"})}'
    'top();document.addEventListener("DOMContentLoaded",top);addEventListener("load",top)})();</script>'
)


def calendar_card(url):
    """Stands in for the embedded scheduler, which the viewer cannot frame (its CSP allows same-origin frames
    only): a month calendar in the dark card's style. Each day from today on opens Calendly on that date in a
    new tab, where the real times show. The month is drawn in the browser, so it is always the current one."""
    return (
        '<div class="art-cal" data-url="' + url + '" style="padding:20px clamp(16px,4vw,32px) 24px;border-top:1px solid #2b2b2b;color:#f1f1f1">'
        '<style>'
        '.art-cal__head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}'
        '.art-cal__title{font-size:17px;font-weight:600}'
        '.art-cal__nav{display:flex;gap:6px}'
        '.art-cal__nav button{width:36px;height:36px;border-radius:50%;border:1px solid #363636;background:none;color:#f1f1f1;font:inherit;cursor:pointer}'
        '.art-cal__nav button:disabled{opacity:.35;cursor:default}'
        '.art-cal__grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;text-align:center}'
        '.art-cal__wd{font-size:12px;font-weight:600;color:#898989;padding-bottom:4px}'
        '.art-cal__day{display:grid;place-items:center;aspect-ratio:1;max-height:52px;border-radius:50%;font-size:15px;font-weight:600;color:#898989}'
        'a.art-cal__day{color:#f1f1f1;background:rgb(224 86 52 / .14);text-decoration:none;transition:background-color .2s}'
        'a.art-cal__day:hover,a.art-cal__day:focus-visible{background:#e05634;color:#0b0b0b}'
        '.art-cal__day.is-today{box-shadow:inset 0 0 0 1.5px #e05634}'
        '.art-cal__foot{margin-top:16px;font-size:13px;line-height:1.5;color:#898989}'
        '</style>'
        '<div class="art-cal__head"><span class="art-cal__title" data-month>Select a day</span>'
        '<span class="art-cal__nav"><button type="button" data-prev aria-label="Previous month">&#8249;</button>'
        '<button type="button" data-next aria-label="Next month">&#8250;</button></span></div>'
        '<div class="art-cal__grid" data-grid role="grid" aria-label="Pick a day"></div>'
        '<p class="art-cal__foot">Pick a day to see its open times on Calendly (opens in a new tab).</p>'
        '<script>(function(){var root=document.currentScript.parentElement,url=root.dataset.url,grid=root.querySelector("[data-grid]"),'
        'title=root.querySelector("[data-month]"),prev=root.querySelector("[data-prev]"),next=root.querySelector("[data-next]"),'
        'now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),shown=new Date(today.getFullYear(),today.getMonth(),1),'
        'wd=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],pad=function(n){return String(n).padStart(2,"0")};'
        'function draw(){grid.textContent="";wd.forEach(function(w){var e=document.createElement("span");e.className="art-cal__wd";e.textContent=w;grid.append(e)});'
        'var y=shown.getFullYear(),m=shown.getMonth(),first=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();'
        'title.textContent=shown.toLocaleDateString("en-US",{month:"long",year:"numeric"});'
        'for(var i=0;i<first;i++)grid.append(document.createElement("span"));'
        'for(var d=1;d<=days;d++){var date=new Date(y,m,d),iso=y+"-"+pad(m+1)+"-"+pad(d),el;'
        'if(date<today){el=document.createElement("span")}else{el=document.createElement("a");'
        'el.href=url+"?month="+y+"-"+pad(m+1)+"&date="+iso;el.target="_blank";el.rel="noopener";'
        'el.setAttribute("aria-label",date.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})+", open times on Calendly")}'
        'el.className="art-cal__day"+(date.getTime()===today.getTime()?" is-today":"");el.textContent=d;grid.append(el)}'
        'prev.disabled=y===today.getFullYear()&&m===today.getMonth()}'
        'prev.onclick=function(){shown=new Date(shown.getFullYear(),shown.getMonth()-1,1);draw()};'
        'next.onclick=function(){shown=new Date(shown.getFullYear(),shown.getMonth()+1,1);draw()};draw()})();</script>'
        '</div>'
    )


def replace_marked(html, marker, make):
    """Replaces each element whose opening tag carries the attribute `marker`, children included.
    `make(element_html)` returns the replacement. Nested tags of the same name are counted."""
    opening = re.compile(r'<([a-zA-Z][\w-]*)\b(?=[^>]*\s' + re.escape(marker) + r'(?:[\s=/>]))[^>]*>')
    out, pos = [], 0
    while True:
        m = opening.search(html, pos)
        if not m:
            break
        tag, depth, end = m.group(1), 1, None
        for t in re.finditer(r'<(/?)' + re.escape(tag) + r'\b[^>]*>', html[m.end():]):
            depth += -1 if t.group(1) else 1
            if depth == 0:
                end = m.end() + t.end()
                break
        if end is None:
            break
        out.append(html[pos:m.start()])
        out.append(make(html[m.start():end]))
        pos = end
    out.append(html[pos:])
    return ''.join(out)


def swap_calendar(html):
    """The demo page's calendar area becomes the month calendar; its links keep the event URL from the markup."""
    def make(element):
        found = re.search(r'href="(https://calendly\.com/[^"?#]+)', element)
        return calendar_card(found.group(1) if found else CALENDLY)
    return replace_marked(html, CALENDAR_MARKER, make)


def main(DIST, OUT):
    shutil.rmtree(OUT, ignore_errors=True)
    shutil.copytree(DIST, OUT)
    for f in ['og.jpg', 'robots.txt', 'sitemap-0.xml', 'sitemap-index.xml']:
        if os.path.exists(os.path.join(OUT, f)): os.remove(os.path.join(OUT, f))

    for css in glob.glob(os.path.join(OUT, '_astro', '*.css')):
        s = open(css).read()
        s2 = re.sub(r'url\((/_astro/[^)]+\.woff2)\)',
                    lambda m: 'url(data:font/woff2;base64,%s)' % base64.b64encode(open(os.path.join(OUT, m.group(1).lstrip('/')), 'rb').read()).decode(), s)
        if s2 != s: open(css, 'w').write(s2)
    for w in glob.glob(os.path.join(OUT, '_astro', '*.woff2')): os.remove(w)

    FILE = re.compile(r'\.[A-Za-z0-9]+$')
    def rel(url, prefix):
        path, tail = re.match(r'^([^?#]*)(.*)$', url).groups()
        if path.startswith('/_astro/') or FILE.search(path): return prefix + path[1:] + tail
        page = path.strip('/')
        return prefix + (page + '.html' if page else 'index.html') + tail

    def srcset(value, prefix):
        items = []
        for item in value.split(','):
            parts = item.strip().split()
            if parts and parts[0].startswith('/'): parts[0] = rel(parts[0], prefix)
            items.append(' '.join(parts))
        return ', '.join(items)

    for html in glob.glob(os.path.join(OUT, '**', '*.html'), recursive=True):
        prefix = '../' * os.path.relpath(html, OUT).count(os.sep)
        s = open(html).read()
        s = re.sub(r'(\s(?:href|src|action|poster))="(/(?!/)[^"]*)"', lambda m: '%s="%s"' % (m.group(1), rel(m.group(2), prefix)), s)
        s = re.sub(r'(\ssrcset)="([^"]*)"', lambda m: '%s="%s"' % (m.group(1), srcset(m.group(2), prefix)), s)
        s = re.sub(r'url\((/_astro/[^)]+)\)', lambda m: 'url(%s%s)' % (prefix, m.group(1)[1:]), s)
        s = re.sub(r'<link rel="preload"[^>]*as="font"[^>]*>', '', s)
        s = swap_calendar(s)
        s = s.replace('<body>', '<body>' + SCROLL_TOP, 1)
        s = s.replace('_astro/', 'assets/')
        open(html, 'w').write(s)

    for f in glob.glob(os.path.join(OUT, '_astro', '*')):
        if f.endswith(('.css', '.js')):
            t = open(f).read()
            if '_astro/' in t: open(f, 'w').write(t.replace('_astro/', 'assets/'))
    os.rename(os.path.join(OUT, '_astro'), os.path.join(OUT, 'assets'))

    index = os.path.join(OUT, 'index.html')
    s = open(index).read()
    head = re.search(r'<head>(.*?)</head>', s, re.S).group(1)
    body = re.search(r'<body>(.*)</body>', s, re.S).group(1)
    keep = re.findall(r'<link rel="stylesheet"[^>]*>|<style[^>]*>.*?</style>|<script type="module"[^>]*>.*?</script>', head, re.S)
    open(index, 'w').write('<title>Aldente AI Website</title>\n' + '\n'.join(keep) + '\n' + body)

    left = []
    for f in glob.glob(os.path.join(OUT, '**', '*'), recursive=True):
        if f.endswith(('.html', '.css', '.js')):
            t = open(f, errors='ignore').read()
            left += re.findall(r'(?:href|src)="/(?!/)[^"]*"|url\(/[^)]*\)|<iframe', t)
    print('leftovers:', left[:5])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
