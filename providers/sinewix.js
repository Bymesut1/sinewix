// ============================================================
//  ydfvfdizipanel — Nuvio scraper (ydfvfdizipanel.ru)        v1.0.0
// ============================================================

var AYAR = {
  HOSTLAR: ['https://www.ydfvfdizipanel.ru', 'https://ydfvfdizipanel.ru'],
  SITE: 'https://www.ydfvfdizipanel.ru',
  EKLENTI_ADI: 'sinewix',
  DEBUG_MODU: false,
  MAX_ALTERNATIF: 4,
  DOGRULA: true,
  ISTEK_SURESI: 7000,
  GENEL_SURE: 25000
};

var TMDB_KEY = '000316508321ce461cf81e7c6815eec7';
var PROVIDER_ID = 'ydfvfdizipanel';
var UA = 'Mozilla/5.0 (Linux; Android 13; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36';

var dbg = [];
var GOOD = null;
function note(m) { dbg.push(String(m).slice(0, 110)); }

function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () { reject(new Error('timeout')); }, ms);
    promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
  });
}

function hostShort(u) { return String(u || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, 'w.').slice(0, 24); }

function rawGet(url, headers, label, tmo) {
  tmo = tmo || AYAR.ISTEK_SURESI;
  return withTimeout(fetch(url, { headers: headers }), tmo).then(function (res) {
    return withTimeout(res.text(), tmo).then(
      function (t) { return { status: res.status, ok: res.ok, text: t || '', url: res.url || url }; },
      function () { return { status: res.status, ok: false, text: '', url: res.url || url }; }
    );
  }).catch(function (e) {
    return { status: 0, ok: false, text: '', err: (e && e.message) || 'hata', url: url };
  }).then(function (r) {
    if (label) note(label + ' ' + (r.status || r.err || '?') + '/' + r.text.length);
    return r;
  });
}

function getJson(url) {
  return withTimeout(fetch(url), 10000).then(function (res) { return res.json(); });
}

function denied(r) {
  if (!r || !r.ok) return true;
  var t = r.text || '';
  return t.length < 700 && /access denied|forbidden|attention required|just a moment|you have been blocked/i.test(t);
}

function siteHeaders(v, host, extra) {
  var h = {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.7',
    'Referer': host + '/'
  };
  if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
  return h;
}

function firstOk(tasks, accept) {
  return new Promise(function (resolve) {
    var left = tasks.length, done = false, last = { status: 0, ok: false, text: '' };
    if (!left) { resolve(last); return; }
    tasks.forEach(function (t) {
      var p; try { p = t(); } catch (e) { p = Promise.resolve(last); }
      p.then(function (r) { return r; }, function () { return last; }).then(function (r) {
        last = r || last;
        left--;
        if (done) return;
        if (accept(r)) { done = true; resolve(r); }
        else if (left === 0) { done = true; resolve(last); }
      });
    });
  });
}

function siteGet(path, extra, label) {
  var hosts = [], seenH = {};
  [AYAR.SITE].concat(AYAR.HOSTLAR).forEach(function (h) { if (h && !seenH[h]) { seenH[h] = 1; hosts.push(h); } });
  function attempt(host, v) {
    return function () {
      return rawGet(host + path, siteHeaders(v, host, extra), '').then(function (r) { r.host = host; r.v = v; return r; });
    };
  }
  function good(r) { return !denied(r); }
  var first = GOOD ? [attempt(GOOD.host, GOOD.v)] : [], rest = [];
  hosts.forEach(function (h) { [0, 1].forEach(function (v) { if (!(GOOD && GOOD.host === h && GOOD.v === v)) rest.push(attempt(h, v)); }); });
  return firstOk(first, good).then(function (r) {
    if (first.length && good(r)) return r;
    return firstOk(rest, good);
  }).then(function (r) {
    if (label) note(label + ' ' + hostShort(r.host || '') + ' ' + (r.status || r.err || '?') + '/' + (r.text || '').length);
    if (good(r) && r.host) { GOOD = { host: r.host, v: r.v }; AYAR.SITE = r.host; }
    return r;
  });
}

function pathOf(u) { return String(u || '').replace(/^https?:\/\/[^\/]+/i, '') || '/'; }
function decodeHtml(s) {
  return String(s || '').replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

var TR_MAP = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
function asciiLower(s) {
  return String(s || '').replace(/İ/g, 'i').replace(/I/g, 'i').toLowerCase()
    .replace(/[çğıöşüâîû]/g, function (c) { return TR_MAP[c]; });
}
function norm(s) { return asciiLower(s).replace(/[^a-z0-9]/g, ''); }
function uniq(list) {
  var out = [];
  list.forEach(function (x) { if (x && out.indexOf(x) === -1) out.push(x); });
  return out;
}
function abs(u, base) {
  u = decodeHtml(String(u || '')).replace(/\\\//g, '/');
  if (/^https?:\/\//i.test(u)) return u;
  if (u.indexOf('//') === 0) return 'https:' + u;
  var b = base || AYAR.SITE;
  return b.replace(/\/+$/, '') + (u.charAt(0) === '/' ? '' : '/') + u;
}

function parseResults(src) {
  var out = [], seen = {};
  String(src || '').split(/<a\s/i).slice(1).forEach(function (c) {
    var href = (c.match(/href="([^"]+)"/i) || [])[1];
    if (!href || /^#|javascript:/i.test(href)) return;
    var title = (c.match(/class="[^"]*(?:title|film-title|name)[^"]*"[^>]*>\s*(?:<[^>]+>\s*)*([^<]+)/i) || [])[1] ||
                (c.match(/\btitle="([^"]+)"/i) || [])[1] || (c.match(/\balt="([^"]+)"/i) || [])[1] ||
                String(c.replace(/^[^>]*>/, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    var year = (c.match(/class="[^"]*year[^"]*"[^>]*>\s*(\d{4})/i) || c.match(/>\s*((?:19|20)\d{2})\s*</) || [])[1];
    title = decodeHtml(title).trim();
    var url = abs(href);
    if (!title || seen[url]) return;
    seen[url] = 1;
    out.push({ url: url, title: title, year: parseInt(year, 10) || 0 });
  });
  return out;
}

function searchSite(q) {
  return siteGet('/index.php?s=' + encodeURIComponent(q), { 'Accept': 'text/html,application/xhtml+xml' }, 'S').then(function (r) {
    return parseResults(r.text);
  });
}

function pickBest(list, wants, year, isTv) {
  var best = null, bs = -1;
  list.forEach(function (it) {
    var n = norm(it.title), s = 0;
    wants.forEach(function (w) {
      var wn = norm(w);
      if (wn && n.indexOf(wn) > -1) s = Math.max(s, 80);
    });
    if (s > bs) { bs = s; best = it; }
  });
  return bs >= 50 ? best : null;
}

function pageIframe(html) {
  var m = String(html || '').match(/<iframe[^>]*?\s(?:data-src|src)="(https?:[^"]+|\/\/[^"]+)"/i);
  return m ? abs(m[1]) : '';
}

function extractMedia(blob) {
  var t = String(blob || '').replace(/\\\//g, '/').replace(/\\u0026/g, '&');
  var urls = [], m, re = /https?:\/\/[^"'\s<>\\)]+/g;
  while ((m = re.exec(t)) !== null) {
    var u = m[0];
    if (/\.(vtt|srt|jpe?g|png|webp|gif|css|js|ico|svg)(\?|\/?$)/i.test(u)) continue;
    if (/\.m3u8|\.mp4/i.test(u)) urls.push(u);
  }
  return urls;
}

function resolveEmbed(embedUrl, pageUrl) {
  return rawGet(embedUrl, { 'User-Agent': UA, 'Referer': pageUrl }, 'EMB').then(function (r) {
    var urls = extractMedia(r.text);
    return { urls: urls, subs: [], base: embedUrl };
  });
}

function verifyUrl(u) {
  if (!AYAR.DOGRULA) return Promise.resolve({ ok: true, headers: { 'User-Agent': UA }, kind: 'hls' });
  return rawGet(u, { 'User-Agent': UA }, 'VER', 5000).then(function (r) {
    return { ok: r.status === 200 || r.status === 206, headers: { 'User-Agent': UA }, kind: 'hls' };
  });
}

function getStreamsInner(tmdbId, mediaType, season, episode, holder) {
  var isTv = (mediaType === 'tv' || mediaType === 'series');
  var base = 'https://api.themoviedb.org/3/' + (isTv ? 'tv' : 'movie') + '/' + tmdbId + '?api_key=' + TMDB_KEY;
  return Promise.all([
    getJson(base + '&language=tr-TR'),
    getJson(base + '&language=en-US').catch(function () { return {}; })
  ]).then(function (both) {
    var tr = both[0] || {}, en = both[1] || {};
    var titles = uniq([tr.title || tr.name, en.title || en.name]);
    var year = parseInt((tr.release_date || tr.first_air_date || '').slice(0, 4), 10) || 0;
    if (!titles.length) return [];
    
    return searchSite(titles[0]).then(function (results) {
      var best = pickBest(results, titles, year, isTv);
      if (!best && results.length) best = results[0];
      if (!best) return [];

      return siteGet(pathOf(best.url), null, 'PAGE').then(function (r) {
        var ifr = pageIframe(r.text);
        if (!ifr) return [];

        return resolveEmbed(ifr, best.url).then(function (res) {
          return Promise.all(res.urls.map(function (u) {
            return verifyUrl(u).then(function (v) { return { u: u, v: v }; });
          }));
        }).then(function (verified) {
          var good = verified.filter(function (x) { return x.v.ok; });
          if (!good.length && verified.length) good = [verified[0]];
          
          good.forEach(function (x, idx) {
            holder.streams.push({
              name: AYAR.EKLENTI_ADI + ' - Kaynak ' + (idx + 1),
              title: titles[0] + ' (Panel)',
              url: x.u,
              quality: '1080p',
              headers: x.v.headers,
              provider: PROVIDER_ID
            });
          });
          return holder.streams;
        });
      });
    });
  }).catch(function () { return []; });
}

function getStreams(tmdbId, mediaType, season, episode) {
  return new Promise(function (resolve) {
    var holder = { streams: [] };
    getStreamsInner(tmdbId, mediaType, season, episode, holder).then(function (r) {
      resolve(r.length ? r : []);
    }, function () {
      resolve([]);
    });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
}
