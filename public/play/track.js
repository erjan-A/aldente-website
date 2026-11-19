/*
 * Order Up on aldenteai.com: visit counting with Umami, in the same Umami site as the rest of aldenteai.com
 * (the values are those of src/data/analytics.ts; tests/unit/game.test.ts keeps them equal). No cookies.
 * It loads on the production hosts only, so local copies and previews send nothing.
 *
 * The game reports an event the moment it happens and sends it to Umami only if Umami is already there.
 * Umami's script arrives later than the game starts, so the first events (open, splash, story) would be lost.
 * They wait here and go out when Umami loads. The game hands every event to window.plausible when that
 * exists; this file takes them through that door and leaves alone the ones the game can send itself.
 */
(function () {
  var HOSTS = ['aldenteai.com', 'www.aldenteai.com'];
  if (HOSTS.indexOf(location.hostname) < 0) return;

  var waiting = [];
  // lang.js saw where the visitor came from before it sent them to the Russian page.
  var cameFrom = '';
  try {
    cameFrom = sessionStorage.getItem('orderup:ref') || '';
    sessionStorage.removeItem('orderup:ref');
  } catch (e) { /* storage is off */ }

  function ready() {
    return !!window.umami && typeof window.umami.track === 'function';
  }

  window.plausible = function (name, options) {
    if (ready() || waiting.length >= 200) return;
    var event = String(name).replace(/^orderup_/, '');
    var props = Object.assign({}, options && options.props);
    if (event === 'open' && cameFrom) props.ref = cameFrom;
    waiting.push(['Game ' + event.replace(/_/g, ' '), props]);
  };

  function flush() {
    if (!ready()) return;
    var sent = waiting.splice(0);
    for (var i = 0; i < sent.length; i++) window.umami.track(sent[i][0], sent[i][1]);
  }

  var script = document.createElement('script');
  script.defer = true;
  script.src = 'https://cloud.umami.is/script.js';
  script.setAttribute('data-website-id', 'd299bc9e-64f9-4a33-89c8-70683b9e3de7');
  script.setAttribute('data-host-url', 'https://gateway.umami.is');
  script.setAttribute('data-domains', HOSTS.join(','));
  script.addEventListener('load', flush);
  document.head.appendChild(script);
})();
