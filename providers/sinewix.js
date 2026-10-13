// sinewix — Nuvio scraper (SONDA sürümü v0.0.2)
// Amaç: ydfvfdizipanel.ru API'sinin doğru rota adlarını bulmak.

var PANEL = 'https://ydfvfdizipanel.ru';
var PROVIDER_ID = 'sinewix';
var UA = 'Mozilla/5.0 (Linux; Android 13; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36';

function withTimeout(p, ms) {
  return new Promise(function (res, rej) {
    var t = setTimeout(function () { rej(new Error('timeout')); }, ms);
    p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
  });
}

function probe(path, tag, out, headers) {
  var url = path.indexOf('http') === 0 ? path : PANEL + path;
  var h = Object.assign({ 'User-Agent': UA, 'Accept': 'application/json, text/plain, */*' }, headers || {});
  return withTimeout(fetch(url, { headers: h }), 8000)
    .then(function (r) {
      return withTimeout(r.text(), 8000).then(function (t) {
        var s = String(t || '').replace(/\s+/g, ' ');
        var ok = r.status === 200 && !/route .* could not be found/i.test(s);
        out.push((ok ? '* ' : '') + tag + ' ' + r.status + ' ' + path.slice(0, 36));
        if (ok) out.push(tag + 'd ' + s.slice(0, 160));
      });
    })
    .catch(function (e) { out.push(tag + ' hata ' + ((e && e.message) || '?') + ' ' + path.slice(0, 36)); });
}

function rows(list) {
  return list.map(function (m) {
    return { name: 'DEBUG ' + m, title: 'DEBUG ' + m, url: 'https://debug.invalid/', quality: 'Auto', provider: PROVIDER_ID };
  });
}

function getStreams(tmdbId, mediaType, season, episode) {
  var out = ['v0.0.2 ' + mediaType + ' ' + tmdbId];
  var isTv = mediaType === 'tv' || mediaType === 'series';
  var kind = isTv ? 'tv' : 'movie';
  var kind2 = isTv ? 'serie' : 'film';
  var paths = [
    '/api/' + kind + '/' + tmdbId,
    '/api/' + kind2 + '/' + tmdbId,
    '/api/content/' + tmdbId,
    '/api/title/' + tmdbId,
    '/api/watch/' + tmdbId,
    '/api/player/' + tmdbId,
    '/api/stream/' + tmdbId,
    '/api/tmdb/' + kind + '/' + tmdbId,
    '/api/detail/' + tmdbId,
    '/api/info/' + tmdbId,
    '/api/' + kind + 's/' + tmdbId,
    '/api/v1/' + kind + '/' + tmdbId
  ];
  var tasks = paths.map(function (p, i) { return probe(p, 'b' + i, out); });
  tasks.push(probe('/', 'r0', out, { 'X-Requested-With': 'XMLHttpRequest' }));
  tasks.push(probe('/sanctum/csrf-cookie', 'r1', out));
  return Promise.all(tasks).then(function () { return rows(out); }, function () { return rows(out); });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
