/* S · T · A · R · S · Rediseño — arranque
   Se descarga solo en dos casos:
   1. Cuando inicia sesión la cuenta del administrador (index.html, onAuthStateChanged).
   2. Al abrir la app en un aparato donde esa cuenta ya entró antes (marca stars_rd en el
      aparato). Así la bienvenida sale desde el primer instante y, si no hay sesión, se ve
      la landing nueva. Si en ese aparato entra otra cuenta, el rediseño se retira solo.
   En cualquier otro aparato este archivo no existe: no se descarga ni se guarda en caché. */
(function () {
  'use strict';
  if (window.__STARS_REDISENO_MONTADO) return;
  window.__STARS_REDISENO_MONTADO = true;

  const V = '5';
  const BASE = '/rediseno/';
  const apagados = [];

  function cargarScript(nombre) {
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = BASE + nombre + '?v=' + V;
      s.onload = ok;
      s.onerror = () => mal(new Error('No cargó ' + nombre));
      document.head.appendChild(s);
    });
  }
  function cargarCss(href) {
    const l = document.createElement('link');
    l.dataset.rd = '1';
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }
  function esperar(cond, ms) {
    return new Promise((ok) => {
      const t0 = Date.now();
      (function mirar() {
        let listo = false;
        try { listo = cond(); } catch (_) { listo = false; }
        if (listo || Date.now() - t0 > ms) ok(listo);
        else setTimeout(mirar, 120);
      })();
    });
  }

  // Estado de la sesión, según lo que ya decidió index.html (onAuthStateChanged).
  function sesion() {
    const app = document.getElementById('app-root');
    const login = document.getElementById('login-screen');
    if (app && app.style.display === 'block') return window.ADMIN_MODE ? 'juan' : 'otro';
    if (login && login.style.display === 'flex') return 'fuera';
    return '';
  }

  // Copia de lo que este teléfono guarda (stars_…), una sola vez, antes de usar el rediseño.
  function respaldoLocal() {
    try {
      if (localStorage.getItem('stars_rd_respaldo_local')) return;
      const copia = {};
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k && k.indexOf('stars_') === 0 && k.indexOf('stars_rd') !== 0) copia[k] = localStorage.getItem(k);
      }
      localStorage.setItem('stars_rd_respaldo_local', JSON.stringify({ fecha: new Date().toISOString(), datos: copia }));
    } catch (_) { /* sin almacenamiento */ }
  }

  function esconderAppActual() {
    // Los estilos de la app actual usan los mismos nombres (.app, .card, .btn…): se apagan
    // mientras el rediseño está activo. La app actual sigue funcionando, solo que no se ve.
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
      if (el.dataset.rd === '1' || el.disabled) return;
      try { el.disabled = true; if (el.sheet) el.sheet.disabled = true; apagados.push(el); } catch (_) { /* nada */ }
    });
    const css = document.createElement('style');
    css.id = 'rd-ocultar';
    css.dataset.rd = '1';
    css.textContent =
      'html.rd-on #app-root,html.rd-on #login-screen{display:none!important}' +
      'html.rd-on,html.rd-on body{overflow:hidden;background:#12110f}' +
      '#rd-root{position:fixed;inset:0;z-index:50}' +
      '#rd-root > .frame{position:absolute;inset:0;width:100%;height:100%}' +
      'html.rd-on #toast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:10000;max-width:min(88vw,420px);' +
      'background:#f2ede4;color:#12110f;padding:11px 18px;border-radius:999px;font:500 14px/1.35 Outfit,system-ui,sans-serif;' +
      'text-align:center;opacity:0;pointer-events:none;transition:opacity .2s;box-shadow:0 8px 30px rgba(0,0,0,.35)}' +
      'html.rd-on #toast.show{opacity:1}' +
      'html.rd-on{font-size:16px!important}' +
      '#rd-root .content{zoom:var(--rd-zoom,1);overflow-x:hidden}' +
      '#rd-root .vrb-exp .ep.ep2::first-letter{float:none;font:inherit;color:inherit;margin:0}' +
      'html.rd-on #admin-panel{z-index:10001}' +
      'html.rd-on #admin-racha-modal,html.rd-on #admin-informe-racha-modal{z-index:10002}';
    document.head.appendChild(css);
    document.documentElement.classList.add('rd-on');
    // Lo que sí debe verse sobre el rediseño: los avisos y las herramientas de administración.
    ['toast', 'admin-panel', 'admin-spacer', 'admin-racha-modal', 'admin-informe-racha-modal'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) document.body.appendChild(el);
    });
    if (typeof window.toggleAdminBar === 'function') window.toggleAdminBar(false);
  }

  // Devuelve la app actual tal cual (otra cuenta en este aparato, o un error).
  function desmontar() {
    apagados.forEach((el) => { try { el.disabled = false; if (el.sheet) el.sheet.disabled = false; } catch (_) { /* nada */ } });
    document.documentElement.classList.remove('rd-on', 'rd-pre');
    ['rd-root', 'rd-ocultar', 'rd-pre-css'].forEach((id) => { const el = document.getElementById(id); if (el) el.remove(); });
    if (window.STARS_VISTA && window.STARS_VISTA.detener) window.STARS_VISTA.detener();
  }

  async function datosListos() {
    await esperar(() => typeof getDevoHoy === 'function' && getDevoHoy() && window.FB && window.FB.datos, 8000);
  }

  async function iniciar() {
    cargarCss('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Outfit:wght@300;400;500;600;700&family=Literata:opsz,wght@7..72,400;7..72,500&family=Bricolage+Grotesque:opsz,wght@12..96,300..800&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&display=swap');
    cargarCss(BASE + 'rediseno.css?v=' + V);
    const [plantilla] = await Promise.all([
      fetch(BASE + 'plantilla.html?v=' + V, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error('plantilla'); return r.text(); }),
      cargarScript('motor.js').then(() => cargarScript('vista.js'))
    ]);
    // Si la sesión ya se sabe y es de otra cuenta, no se muestra nada.
    if (sesion() === 'otro') { desmontar(); return; }
    esconderAppActual();
    const raiz = document.createElement('div');
    raiz.id = 'rd-root';
    document.body.appendChild(raiz);
    window.STARS_VISTA.montar(raiz, plantilla);   // empieza con la bienvenida

    const primera = await esperar(() => sesion() !== '', 15000) ? sesion() : 'fuera';
    if (primera === 'otro') { desmontar(); return; }
    if (primera === 'juan') {
      respaldoLocal();
      try { localStorage.setItem('stars_rd', '1'); } catch (_) { /* nada */ }
      await datosListos();
      window.STARS_VISTA.sesion('juan');
    } else {
      window.STARS_VISTA.sesion('fuera');
    }

    // Si se inicia sesión desde la landing nueva: la cuenta de Juan entra al rediseño; otra cuenta, a la app de siempre.
    const vigilar = setInterval(async () => {
      const s = sesion();
      if (s === 'otro') { clearInterval(vigilar); desmontar(); return; }
      if (s === 'juan' && window.STARS_VISTA.estado.sesion !== 'juan') {
        clearInterval(vigilar);
        respaldoLocal();
        try { localStorage.setItem('stars_rd', '1'); } catch (_) { /* nada */ }
        await datosListos();
        window.STARS_VISTA.sesion('juan', true);
      }
    }, 400);
  }

  iniciar().catch((e) => {
    console.error('[rediseño] no se pudo iniciar; se queda la app actual', e);
    desmontar();
  });
})();
