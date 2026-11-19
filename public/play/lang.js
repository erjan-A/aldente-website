/*
 * Order Up at /play: which language to open. Runs first in the English page, before anything is drawn.
 *
 * A browser that asks for Russian before English goes to /play/ru, with its campaign tags and hash kept.
 * /play?lang=en keeps English and /play?lang=ru asks for Russian; either choice is remembered in this browser
 * ("orderup:lang" in local storage), so a visitor who picked English is not sent away again.
 * A browser that asks for neither language stays here.
 */
(function () {
  var KEY = 'orderup:lang';
  var params = new URLSearchParams(location.search);
  var asked = params.get('lang');
  var want = '';

  if (asked === 'en' || asked === 'ru') {
    want = asked;
    try { localStorage.setItem(KEY, asked); } catch (e) { /* storage is off: the choice holds for this visit */ }
    params.delete('lang');
  } else {
    try { want = localStorage.getItem(KEY) || ''; } catch (e) { /* storage is off */ }
  }

  if (want !== 'en' && want !== 'ru') {
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < list.length && !want; i++) {
      var code = String(list[i]).toLowerCase().split('-')[0];
      if (code === 'ru' || code === 'en') want = code;
    }
  }

  var query = params.toString();
  var rest = (query ? '?' + query : '') + location.hash;
  if (want === 'ru') {
    // The Russian page would only see this page as where the visitor came from: hand it the real one.
    try {
      var site = (document.referrer.match(/^https?:\/\/([^/]+)/) || [])[1] || '';
      if (site && site !== location.host) sessionStorage.setItem('orderup:ref', site);
    } catch (e) { /* storage is off */ }
    location.replace('/play/ru' + rest);
  } else if (asked) {
    history.replaceState(null, '', location.pathname + rest);
  }
})();
