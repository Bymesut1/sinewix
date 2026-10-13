// sinewix — Nuvio scraper (SONDA sürümü v0.0.1)
// Amaç: ydfvfdizipanel.ru API'sinin hangi adreslere cevap verdiğini ekranda göstermek.

var PANEL = 'https://ydfvfdizipanel.ru';
var PROVIDER_ID = 'sinewix';
var UA = 'Mozilla/5.0 (Linux; Android 13; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36';
var TMDB_KEY = '000316508321ce461cf81e7c6815eec7';

function withTimeout(p, ms) {
  return new Promise(function (res, rej) {
    var t = setTimeout(function () { rej(new Error('timeout')); }, ms);
    p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
  });
}

function probe(path, tag, out) {
  var url = path.indexOf('http') === 0 ? path : PANEL + path;
  return withTimeout(fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json, text/plain, */*' } }), 9000)
    .then(function (r) {
      return withTimeout(r.text(), 9000).then(function (t) {
        var s = String(t || '').replace(/\s+/g, ' ');
        out.push(tag + ' ' + r.status + '/' + s.length + ' ' + path.slice(0, 40));
        out.push(tag + 'b ' + s.slice(0, 100));
        out.push(tag + 'c ' + s.slice(100, 200));
      });
    })
    .catch(function (e) { out.push(tag + ' hata ' + ((e && e.message) || '?') + ' ' + path.slice(0, 40)); });
}

function rows(list) {
  return list.map(function (m) {
    return { name: 'DEBUG ' + m, title: 'DEBUG ' + m, url: 'https://debug.invalid/', quality: 'Auto', provider: PROVIDER_ID };
  });
}

function getStreams(tmdbId, mediaType, season, episode) {
  var out = ['v0.0.1 ' + mediaType + ' ' + tmdbId];
  var tasks = [
    probe('/', 'a0', out),
    probe('/api', 'a1', out),
    probe('/api/search/walking', 'a2', out),
    probe('/api/movies', 'a3', out),
    probe('/api/genres', 'a4', out),
    probe('/api/' + (mediaType === 'movie' ? 'movie' : 'serie') + '/' + tmdbId, 'a5', out)
  ];
  return Promise.all(tasks).then(function () { return rows(out); }, function () { return rows(out); });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
