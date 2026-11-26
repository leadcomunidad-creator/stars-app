/* S · T · A · R · S · Rediseño — vista
   Calcula lo que muestra cada pantalla a partir de los datos reales de la app.
   No reescribe ninguna lógica de datos: lee y escribe solo con las funciones que ya
   existen (getDevoHoy, marcarPaso, isDayComplete, calcularRacha, getRachaStars,
   getBancoStars, toggleBancoDiaActivo, activarDiaDevocional, window.FB…). */
(function () {
  'use strict';

  const IMG = 'rediseno/img/';
  const TINTA = IMG + 'estrella-tinta.png';
  const PAPEL = IMG + 'estrella-papel.png';
  const GOLD = IMG + 'logo-dorado.png';

  const STEP_IDS = ['silencio', 'texto', 'analisis', 'reflexion', 'siembra'];
  const S_NAMES = ['Silencio', 'Texto', 'Análisis', 'Reflexión', 'Sembrar'];
  const S_LET = ['S', 'T', 'A', 'R', 'S'];
  const S_MIN = ['5', '3', '3', '2', '2'];
  const CC = ['c-silencio', 'c-texto', 'c-analisis', 'c-reflexion', 'c-siembra'];
  const PP_IDS = ['metodo', 'capitulo', 'versiculo', 'tema', 'tracker'];
  const PROF_ALL = PP_IDS.concat(['estudio', 'trackerFull', 'lector', 'intro', 'estaciones', 'verRes', 'libro']);
  const LIST_IDS = ['hoy', 'estudio', 'metodo', 'capitulo', 'versiculo', 'tema', 'tracker', 'musica'];
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const PLAYLISTS = [
    { n: 'Word', d: 'Para escuchar la Palabra: canciones que acompañan la lectura y el estudio bíblico.', url: 'https://youtube.com/playlist?list=PLhpjqyFgOGlGKC_sDe5f-ZNAD9CN9b8OS' },
    { n: 'Spirit', d: 'Para meditar y orar: música que crea atmósfera de encuentro con Dios.', url: 'https://youtube.com/playlist?list=PLhpjqyFgOGlHoq6h8EH2tiOqU4xCiS5Lk' },
    { n: 'Music', d: 'Para disfrutar: música instrumental y vocal para cualquier momento del día.', url: 'https://youtube.com/playlist?list=PLhpjqyFgOGlF4k8iqgAbdaMMyScikbZWE' },
    { n: 'Work', d: 'Para enfocarse: lo que suena mientras se estudia, predica o trabaja.', url: 'https://youtube.com/playlist?list=PLhpjqyFgOGlE4lckbnviIr9q2ZtOD_rG5' },
    { n: 'Happy', d: 'Para celebrar: canciones alegres, con energía y gratitud.', url: 'https://youtube.com/playlist?list=PLhpjqyFgOGlGK_Ybcy89Ek9BzVA-2SJQN' }
  ];
  const PL_KEY = { Word: 'Para escuchar la Palabra', Spirit: 'Para meditar y orar', Music: 'Para disfrutar', Work: 'Para enfocarse', Happy: 'Para celebrar' };
  const PL_CC = { Word: 'c-texto', Spirit: 'c-silencio', Music: 'c-analisis', Work: 'c-reflexion', Happy: 'c-siembra' };
  const PL_MOM = { Word: 'Al leer la Palabra', Spirit: 'Para tu Silencio', Music: 'Para cualquier momento', Work: 'Al estudiar o trabajar', Happy: 'Para celebrar' };
  const LANDING_DIARIO = [['S', 'Silencio', '5 min', 'Detente un momento, aquieta tu atención y haz una oración breve.'], ['T', 'Texto', '3 min', 'Lee el pasaje en The Message y NBLA.'], ['A', 'Análisis', '3 min', 'Comprende el mensaje central del texto.'], ['R', 'Reflexión', '2 min', 'Responde con sinceridad a una pregunta para tu día.'], ['S', 'Siembra', '2 min', 'Convierte tu reflexión en una práctica concreta.']];
  const LANDING_PROFUNDO = [['S', 'Silencio', '5 min', 'Para el corazón. Oración breve.'], ['T', 'Texto', '15 min', 'MSG + NBLA en paralelo.'], ['A', 'Análisis', '20 min', '10 estaciones de estudio.'], ['R', 'Reflexión', '10 min', 'Dios · Yo · Haré.'], ['S', 'Sembrar', '10 min', 'Archivo de predicación.']];
  const SOPORTE ='https://wa.me/573173708570?text=Hola%2C%20necesito%20ayuda%20con%20S.T.A.R.S.%20Me%20ocurri%C3%B3%20lo%20siguiente%3A';
  const LHSCOL = 'https://lhscolweb.netlify.app/';

  /* ── preferencias del rediseño (solo en este teléfono) ── */
  function pref(k, def) { try { const v = localStorage.getItem(k); return v === null ? def : v; } catch (_) { return def; } }
  function setPref(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* sin almacenamiento */ } }

  const st = {
    screen: 'splash',
    sesion: 'esperando',
    lmode: 'diario',
    exp: pref('stars_rd_exp', ''),
    luz: pref('stars_modo', 'noche') === 'dia' ? 'dia' : 'noche',
    tema: pref('stars_tema', 'lhscol'),
    ver: 'nbla',
    pl: 'Spirit',
    w: window.innerWidth,
    speak: '',
    calY: null, calM: null,
    ob: 1, ol: '', oc: '',
    timer: { key: '', start: 0, done: false },
    lastMode: '',
    pfDesde: '',
    sonando: ''
  };
  if (['lhscol', 'oxigeno', 'mesa', 'sala'].indexOf(st.tema) < 0) st.tema = 'lhscol';

  let render = function () {};
  let pendiente = false;
  function pintar() {
    if (pendiente) return;
    pendiente = true;
    setTimeout(() => { pendiente = false; render(valores()); montarMusica(); devoParaLanding(); }, 0);
  }
  // La landing muestra el Paso Diario de hoy en el teléfono: sin sesión también se carga el devocional.
  let landingDevo = false;
  function devoParaLanding() {
    if (st.screen !== 'landing' || landingDevo || g(() => Boolean(getDevoHoy() && getDevoHoy().titulo), false)) return;
    landingDevo = true;
    g(() => { const i = semanaISOConAnio(new Date()); cargarDevocionalSemana(i.year, i.week).then(() => pintar()); });
  }

  /* ── Música dentro de la app ──
     El reproductor de YouTube se arma en la misma pantalla (Silencio o Música), así la persona
     no sale de la app: el contador de Silencio sigue y la pantalla no se apaga mientras suena. */
  function tocar(n) { st.sonando = st.sonando === n ? '' : n; pintar(); }
  function listaId(n) {
    const l = PLAYLISTS.filter((x) => x.n === n)[0];
    const m = l ? /list=([\w-]+)/.exec(l.url) : null;
    return m ? m[1] : '';
  }
  let candado = null;
  async function pantallaEncendida(si) {
    try {
      if (si && !candado && navigator.wakeLock && document.visibilityState === 'visible') {
        candado = await navigator.wakeLock.request('screen');
        candado.addEventListener('release', () => { candado = null; });
      } else if (!si && candado) { const c = candado; candado = null; await c.release(); }
    } catch (_) { candado = null; }
  }
  function montarMusica() {
    if (['musica', 'silencio'].indexOf(st.screen) < 0 && st.sonando) { st.sonando = ''; pintar(); }
    const cajas = Array.from(document.querySelectorAll('#rd-root .rd-yt'));
    let usada = false;
    cajas.forEach((c) => {
      const n = c.getAttribute('data-rd-yt');
      if (!usada && c.offsetParent && n === st.sonando) {
        usada = true;
        if (c.__lista !== n) {
          c.__lista = n;
          c.innerHTML = '<iframe src="https://www.youtube.com/embed/videoseries?list=' + listaId(n) + '&autoplay=1&playsinline=1&rel=0" title="' + n + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
        }
      } else if (c.__lista) { c.__lista = ''; c.innerHTML = ''; }
    });
    const silencioCorre = st.screen === 'silencio' && st.timer.key === getTodayKey() && st.timer.start && !st.timer.done;
    pantallaEncendida(Boolean(st.sonando) || Boolean(silencioCorre));
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { candado = null; montarMusica(); } });
  function set(o) { return () => { Object.assign(st, o); pintar(); if (o.screen) arriba(); }; }
  function ir(screen, extra) { Object.assign(st, extra || {}, { screen: screen }); pintar(); arriba(); }
  function arriba() {
    setTimeout(() => {
      document.querySelectorAll('#rd-root .content, #rd-root .ws-main, #rd-root .ws-left, #rd-root .frame').forEach((el) => { el.scrollTop = 0; });
    });
  }
  function aviso(t) { if (typeof showToast === 'function') showToast(t); }
  function abrir(url) { window.open(url, '_blank', 'noopener'); }
  function g(fn, def) { try { return fn(); } catch (e) { console.warn('[rediseño]', e); return def; } }

  /* ── datos del día ── */
  function partirTexto(cuerpo) {
    return String(cuerpo || '').split(/\n+/).map((t) => t.trim()).filter(Boolean).map((t) => {
      const m = /^(\d{1,3})\s+(.*)$/.exec(t);
      return m ? { n: m[1], t: m[2] } : { n: '', t: t };
    });
  }
  // Sembrar: la práctica se muestra en pasos numerados (una frase por paso). Las frases
  // entre «» van destacadas; si menciona «Profundizar el texto», ese nombre va en negrilla
  // y al final de la tarjeta sale el botón para abrirlo.
  function segmentosSembrar(txt) {
    const out = [];
    const re = /«([^»]+)»/g;
    let ultimo = 0;
    let m;
    while ((m = re.exec(txt)) !== null) {
      if (m.index > ultimo) out.push({ t: txt.slice(ultimo, m.index), plain: true });
      if (/^\s*profundizar (el )?texto\s*$/i.test(m[1])) out.push({ t: 'Profundizar el texto', b: true, link: true });
      else out.push({ t: m[1], q: true });
      ultimo = re.lastIndex;
    }
    if (ultimo < txt.length) out.push({ t: txt.slice(ultimo), plain: true });
    return out;
  }
  function pasosSembrar(txt) {
    // Se corta en frases sin partir lo que está entre «».
    const frases = [];
    let actual = '';
    let dentro = false;
    const s = String(txt || '').trim();
    for (let i = 0; i < s.length; i += 1) {
      const c = s.charAt(i);
      actual += c;
      if (c === '«') dentro = true;
      else if (c === '»') dentro = false;
      else if (!dentro && /[.!?]/.test(c) && /\s/.test(s.charAt(i + 1) || ' ') && /[A-ZÁÉÍÓÚÑ¿¡«]/.test(s.slice(i + 1).trim().charAt(0) || 'A')) {
        frases.push(actual.trim()); actual = '';
      }
    }
    if (actual.trim()) frases.push(actual.trim());
    // Frases muy cortas se unen a la anterior para no hacer pasos de tres palabras.
    const pasos = [];
    frases.forEach((f) => { if (pasos.length && f.length < 40) pasos[pasos.length - 1] += ' ' + f; else pasos.push(f); });
    return pasos.map((p, i) => ({ n: String(i + 1), segs: segmentosSembrar(p) }));
  }
  // Un versículo NBLA puede venir entero (text) o por partes (clauses).
  function textoVersiculo(v) {
    if (!v) return '';
    if (typeof v.text === 'string') return v.text;
    return (v.clauses || []).map((c, i) => (i ? (c.separatorBefore || '') : '') + (c.text || '')).join('');
  }
  // Párrafo → trozos, con las citas «…» marcadas y, si se pide, la primera frase en negrilla.
  function trozos(p, primeraFuerte) {
    const txt = String(p || '');
    let cabeza = '';
    let resto = txt;
    if (primeraFuerte) {
      const m = /^(.{25,220}?[.!?])(\s+)(?=\S)/.exec(txt);
      if (m && m[1].indexOf('«') < 0) { cabeza = m[1]; resto = txt.slice(m[0].length); }
    }
    const out = cabeza ? [{ t: cabeza + ' ', c: 'fs' }] : [];
    resto.split(/(«[^»]+»)/).filter(Boolean).forEach((x) => out.push({ t: x, c: x.charAt(0) === '«' ? 'cq' : '' }));
    return out;
  }
  // Nota del análisis por versículo: «1. (v. 2) | inglés | español | NBLA | explicación».
  function notaVersion(x) {
    const crudo = String(x || '').trim();
    const partes = crudo.split('|').map((s) => s.trim()).filter(Boolean);
    if (partes.length < 3) return { exp: crudo.replace(/^\d+\.\s*/, ''), ref: '', en: '', nbla: '', es: '' };
    const ref = partes[0].replace(/^\d+\.\s*/, '').replace(/^\(\s*|\s*\)$/g, '');
    const exp = partes[partes.length - 1];
    const medio = partes.slice(1, -1);
    const en = medio[0] || '';
    let es = medio[1] || '';
    let nbla = medio[2] || '';
    const n = (s) => s.toLowerCase().replace(/[«»"“”.,;:]/g, '').trim();
    if (es && nbla && (n(nbla).indexOf(n(es)) >= 0 || n(es).indexOf(n(nbla)) >= 0)) { if (!nbla) nbla = es; es = ''; }
    if (!nbla && es) { nbla = es; es = ''; }
    return { ref: ref, en: en, es: es, nbla: nbla, exp: exp };
  }
  // Explicación breve de Profundizar: «En pocas palabras» destacada y el resto en párrafos cortos.
  // Si el texto trae un primer párrafo aparte (línea en blanco), ese es «En pocas palabras»; si no,
  // se toman las primeras frases hasta unas 25 palabras (máximo tres), para que no quede tan corta.
  function partirBreve(txt) {
    const bruto = String(txt || '').trim();
    const partir = (t) => t.split(/(?<=[.!?»])\s+(?=[«¿¡A-ZÁÉÍÓÚÑ0-9])/).map((s) => s.trim()).filter(Boolean);
    let lead = '';
    let frases = [];
    const parrafos = bruto.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    if (parrafos.length > 1) {
      lead = parrafos[0].replace(/\s+/g, ' ');
      frases = partir(parrafos.slice(1).join(' '));
    } else {
      frases = partir(bruto);
      let n = 0;
      const tomadas = [];
      while (frases.length && tomadas.length < 3 && n < 25) { const f = frases.shift(); tomadas.push(f); n += f.split(/\s+/).length; }
      lead = tomadas.join(' ');
    }
    const rest = [];
    for (let i = 0; i < frases.length; i += 2) rest.push(frases.slice(i, i + 2).join(' '));
    return { lead: lead, rest: rest, hayRest: rest.length > 0 };
  }
  // Modelo 2026 · la invitación final a «Estudio» sale de la última nota y pasa a botones.
  function quitarInvitacionEstudio(exp) {
    const m = /\s*[^.!?\n]*sección «Estudio»[\s\S]*$/.exec(String(exp || ''));
    if (!m) return { exp: exp, sug: '' };
    const e = /estudia\s+((?:\d\s)?[^\d,;.\n]+?\s\d+)/.exec(m[0]);
    return { exp: String(exp).slice(0, m.index).trim(), sug: e ? e[1].trim() : '' };
  }

  function fechaLarga(key) {
    const f = fechaDesdeKey(key);
    return DIAS[f.getDay()] + ' ' + f.getDate() + ' de ' + MESES[f.getMonth()];
  }
  function datosDia() {
    const devo = g(() => getDevoHoy(), null) || {};
    const serie = (window.SERIE_DATA && window.SERIE_DATA.serie_titulo) || '';
    const sembrar = String(devo.sembrar || '');
    const pt = devo.profundizar_texto || {};
    const ref = String(devo.versiculo || '').replace(/\s*\((NBLA|MSG)\)\s*$/i, '');
    return {
      hay: Boolean(devo.titulo),
      temporada: (window.SERIE_DATA && window.SERIE_DATA.temporada) || 'Mayor que mi realidad',
      serie: serie,
      serieSub: (window.SERIE_DATA && window.SERIE_DATA.serie_subtitulo) || '',
      titulo: devo.titulo || 'Sin Paso Diario para este día',
      ref: ref,
      frase: devo.frase || pref('stars_rd_frase', '') || '«Mayor que mi realidad es Su Verdad.»',
      oracion: devo.oracion || '',
      idea: devo.idea_central || '',
      ana: Array.isArray(devo.analisis) ? devo.analisis : (devo.analisis ? [devo.analisis] : []),
      reflex: devo.reflexion || '',
      sembrarPasos: pasosSembrar(sembrar),
      sembrarLink: /«\s*profundizar (el )?texto\s*»/i.test(sembrar),
      cierre: devo.oracion_cierre || '',
      breve: pt.explicacion_breve || '',
      nblaRef: (devo.texto_ntv && devo.texto_ntv.ref) || 'NBLA',
      msgRef: (devo.texto_msg && devo.texto_msg.ref) || 'The Message',
      nblaV: partirTexto(devo.texto_ntv && devo.texto_ntv.cuerpo),
      msgV: partirTexto(devo.texto_msg && devo.texto_msg.cuerpo),
      msgPlano: (devo.texto_msg && devo.texto_msg.cuerpo) || '',
      nblaPlano: (devo.texto_ntv && devo.texto_ntv.cuerpo) || '',
      notasRaw: Array.isArray(pt.notas) ? pt.notas : [],
      destino: g(() => pasoDiarioCapituloDesdeReferencia(pt.estudio_principal || (devo.paso_profundo && devo.paso_profundo.estudio_principal) || devo.versiculo), null)
    };
  }

  /* ── temporizador de Silencio (5 min) ── */
  let tick = null;
  function timerRestante() {
    const t = st.timer;
    if (t.key !== getTodayKey() || !t.start) return 300;
    return Math.max(0, 300 - Math.floor((Date.now() - t.start) / 1000));
  }
  function iniciarTimer() {
    const key = getTodayKey();
    if (st.timer.key === key && st.timer.start) return;
    st.timer = { key: key, start: Date.now(), done: false };
    if (typeof prepararAvisoTimer === 'function') g(() => prepararAvisoTimer());
    clearInterval(tick);
    tick = setInterval(() => {
      if (timerRestante() <= 0) {
        clearInterval(tick);
        st.timer.done = true;
        if (typeof tocarPitidoFinal === 'function') g(() => tocarPitidoFinal());
      }
      pintar();
    }, 1000);
    pintar();
  }

  /* ── Escuchar (voz del teléfono, español latino primero) ── */
  function hablar(clave, textoFn) {
    return () => {
      const ss = window.speechSynthesis;
      if (!ss) { aviso('Tu navegador no puede leer en voz alta'); return; }
      if (st.speak === clave) { ss.cancel(); st.speak = ''; pintar(); return; }
      ss.cancel();
      const u = new SpeechSynthesisUtterance(String(textoFn()).replace(/[«»]/g, ''));
      const vs = ss.getVoices();
      let voz = null;
      for (const p of ['es-419', 'es-mx', 'es-us', 'es-co', 'es-ar', 'es-cl', 'es-pe']) {
        voz = vs.find((x) => (x.lang || '').replace('_', '-').toLowerCase() === p);
        if (voz) break;
      }
      if (!voz) voz = vs.find((x) => (x.lang || '').toLowerCase().indexOf('es') === 0);
      if (voz) u.voice = voz;
      u.lang = voz ? voz.lang : 'es-419';
      u.rate = 0.95;
      u.onend = () => { if (st.speak === clave) { st.speak = ''; pintar(); } };
      ss.speak(u);
      st.speak = clave;
      pintar();
    };
  }

  /* ── pasos ── */
  function abrirPaso(i) {
    return () => {
      if (!g(() => pasoDesbloqueado(i), true)) { aviso('Se abre al terminar ' + S_NAMES[i - 1]); return; }
      ir(STEP_IDS[i]);
    };
  }
  function textoDiario(i) {
    const el = document.getElementById(i === 3 ? 'refA' : 'semA');
    return el ? el.value.trim() : '';
  }
  function guardarTextoDiario(i) {
    const t = textoDiario(i);
    if (t && window.FB) g(() => (i === 3 ? window.FB.setReflexion(getTodayKey(), t) : window.FB.setSembrar(getTodayKey(), t)));
  }
  function completarPaso(i) {
    return () => {
      const key = getTodayKey();
      if (i === 0 && !window.ADMIN_MODE && !st.timer.done && !g(() => isStepDone(0), false)) {
        if (!(st.timer.key === key && st.timer.start)) iniciarTimer();
        aviso('Termina los cinco minutos de silencio');
        return;
      }
      if (i === 3 || i === 4) {
        const t = textoDiario(i);
        if (t && window.FB) g(() => (i === 3 ? window.FB.setReflexion(key, t) : window.FB.setSembrar(key, t)));
      }
      g(() => marcarPaso(i));
      if (i === 0 && window.speechSynthesis) window.speechSynthesis.cancel();
      ir(i < 4 ? STEP_IDS[i + 1] : 'completo');
    };
  }

  /* ── racha y calendario ── */
  function calendario() {
    const hoyKey = getActualTodayKey();
    const hoy = fechaDesdeKey(hoyKey);
    const y = st.calY === null ? hoy.getFullYear() : st.calY;
    const m = st.calM === null ? hoy.getMonth() : st.calM;
    const primero = new Date(y, m, 1, 12);
    const total = new Date(y, m + 1, 0).getDate();
    const offset = (primero.getDay() + 6) % 7;
    const celdas = [];
    for (let i = 0; i < offset; i += 1) celdas.push({ n: '', cls: 'mk' });
    for (let d = 1; d <= total; d += 1) {
      const key = dateToKey(new Date(y, m, d, 12));
      let cls = '';
      if (g(() => esDiaRestaurado(key), false) && g(() => isDayComplete(key), false)) cls = 'rest';
      else if (g(() => diaCuentaParaRacha(key), false)) cls = 'done';
      else if (g(() => puedeAbrirDiaParaRestaurar(key), false)) cls = 'can';
      if (key === hoyKey) cls = (cls ? cls + ' ' : '') + 'today';
      const abrible = key <= hoyKey;
      celdas.push({ n: String(d), cls: cls, pick: abrible ? () => abrirDia(key) : undefined });
    }
    while (celdas.length % 7) celdas.push({ n: '', cls: 'mk' });
    const filas = [];
    for (let i = 0; i < celdas.length; i += 7) {
      const row = celdas.slice(i, i + 7);
      const llena = row.every((c) => /\b(done|rest)\b/.test(c.cls));
      filas.push({ cls: llena ? 'fullweek' : '', days: row });
    }
    const mesCompleto = celdas.filter((c) => c.n).every((c) => /\b(done|rest)\b/.test(c.cls));
    if (mesCompleto) filas.forEach((f) => { f.cls += ' fullmonth'; });
    const nombre = MESES[m].charAt(0).toUpperCase() + MESES[m].slice(1) + ' ' + y;
    return { filas: filas, nombre: nombre, y: y, m: m };
  }
  async function abrirDia(key) {
    const ok = await activarDiaDevocional(key);
    if (ok) ir('hoy');
  }
  function moverMes(delta) {
    return () => {
      const c = calendario();
      const f = new Date(c.y, c.m + delta, 1);
      st.calY = f.getFullYear(); st.calM = f.getMonth();
      pintar();
    };
  }

  /* ── Paso Profundo: libros, capítulos y progreso ── */
  function librosOrdenados() {
    return (typeof BLOQUES !== 'undefined' ? BLOQUES : []);
  }
  function leidos() { return g(() => contarCapitulosLeidos(), 0) || 0; }

  const ESTACIONES = ['Texto del capítulo', 'Contexto', 'Recorrido', 'Ideas clave', 'Joyas del texto', 'Conexiones', 'Jesús en el capítulo', 'Para enseñar', 'Para responder', 'Para llevar'];
  const LEADS = ['Lee el capítulo completo, sin prisa.', 'Dónde y cuándo ocurre lo que vas a leer.', 'El capítulo en sus grandes movimientos.', 'Lo que el texto quiere que entiendas.', 'Palabras que vale la pena mirar de cerca.', 'Cómo este capítulo se une al resto de la Biblia.', 'Dónde aparece Jesús y qué revela de Él.', 'Ideas para compartir lo que aprendiste.', 'Preguntas para tu vida.', 'Una frase para llevar contigo.'];
  const KINDS = { verseBlocks: 'texto', editorialParagraphs: 'prosa', timeline: 'recorrido', ideaAccordion: 'prosa', lexicalCards: 'joyas', connectionAccordion: 'prosa', narrativeWithAnchor: 'prosa', teachingBlocks: 'ensenar', reflectionQuestions: 'responder', closingQuote: 'llevar' };
  const cacheV2 = {};

  function claveCap(libro, cap) { return String(libro).replace(/\s/g, '_') + '_' + cap; }
  function slugV2(libro) { return String(libro).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); }
  function totalCaps(libro) {
    const l = (typeof BLOQUES !== 'undefined' ? BLOQUES : []).flatMap((b) => b.libros).find((x) => x.n === libro);
    return l ? l.c : 0;
  }
  function hayEstudio(libro, cap) {
    return g(() => Boolean(CAPITULOS_DISPONIBLES[claveCap(libro, cap)]), false);
  }
  async function cargarV2(libro, cap) {
    const k = claveCap(libro, cap);
    if (cacheV2[k]) return cacheV2[k];
    const base = '/estudios/v2/' + slugV2(libro) + cap;
    const [e, t] = await Promise.all([
      fetch(base + '_estudio_v2.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/estudios/v2/textos/' + slugV2(libro) + cap + '_textos_biblicos.json').then((r) => (r.ok ? r.json() : null)).catch(() => null)
    ]);
    cacheV2[k] = { estudio: e, textos: t };
    return cacheV2[k];
  }

  const cargando = {};
  function precargar(libro, cap) {
    const k = claveCap(libro, cap);
    if (cargando[k] || cacheV2[k]) return;
    cargando[k] = true;
    cargarV2(libro, cap).then(() => { cargando[k] = false; pintar(); });
  }

  function capsDe(libro, total, modo) {
    const out = [];
    if (modo === 'metodo' && g(() => INTROS_DISPONIBLES.has(libro), false)) out.push({ n: 'Intro', cls: 'intro', pick: () => abrirIntro(libro) });
    for (let i = 1; i <= total; i += 1) {
      const leido = g(() => isCapLeido(libro, i), false);
      const hay = hayEstudio(libro, i);
      out.push({
        n: String(i), cls: leido ? 'leido' : (hay ? 'disp' : ''),
        pick: modo === 'lector' ? () => abrirLector(libro, i) : () => abrirCapitulo(libro, i)
      });
    }
    return out;
  }
  async function abrirCapitulo(libro, cap) {
    if (!hayEstudio(libro, cap)) { aviso(libro + ' ' + cap + ' todavía no tiene estudio. Puedes leerlo.'); abrirLector(libro, cap); return; }
    const key = claveCap(libro, cap);
    const avance = g(() => getEstudioMaxSec(key), 0) || 0;
    g(() => marcarCapituloActual(key));
    ir('estaciones', { capRef: { libro: libro, cap: cap }, station: Math.min(avance, 9) });
    await cargarV2(libro, cap);
    pintar();
  }
  async function abrirLector(libro, cap) {
    ir('lector', { lectRef: { libro: libro, cap: cap }, oc: libro });
    await cargarV2(libro, cap);
    pintar();
  }
  async function abrirIntro(libro) {
    ir('intro', { introLibro: libro, ib: 0 });
    await g(() => cargarIntroLibro(libro));
    pintar();
  }

  function textoPlano(o) {
    if (o === null || o === undefined) return [];
    if (typeof o === 'string') return [o];
    if (Array.isArray(o)) return o.flatMap(textoPlano);
    if (typeof o === 'object') {
      const out = [];
      ['titulo', 'termino', 'nombre'].forEach((k) => { if (typeof o[k] === 'string' && Object.keys(o).length > 1) out.push(o[k] + (o.texto || o.definicion || o.descripcion ? ':' : '')); });
      Object.keys(o).forEach((k) => { if (['titulo', 'termino', 'nombre', 'tipo', 'id', 'icono', 'color'].indexOf(k) < 0) out.push(...textoPlano(o[k])); });
      return out;
    }
    return [];
  }

  function itemsEstacion(sec, textos) {
    const c = (sec && sec.content) || {};
    switch (sec && sec.type) {
      case 'verseBlocks':
        if (st.ver === 'nbla' && textos && Array.isArray(textos.nblaVerses)) return textos.nblaVerses.map((v) => ({ h: 'v. ' + v.number, p: textoVersiculo(v) }));
        return (c.blocks || []).map((b) => ({ h: (String(b.range).indexOf('-') >= 0 ? 'vv. ' : 'v. ') + b.range, p: b.text }));
      case 'editorialParagraphs': return (c.paragraphs || []).map((x) => ({ h: '', p: x.text || x }));
      case 'timeline': return (c.stops || []).map((x) => ({ h: x.range, p: x.title + (x.text ? ' — ' + x.text : ''), cls: 'stop' })).concat((c.closing || []).map((x) => ({ h: '', p: x })));
      case 'ideaAccordion': return (c.items || []).flatMap((x) => (x.paragraphs || []).map((p, i) => ({ h: i === 0 ? (x.title || '') : '', p: p })));
      case 'lexicalCards': return (c.cards || []).map((x) => ({ h: 'v. ' + x.range + ' · «' + x.original + '»', p: (x.translation ? '«' + x.translation + '» ' : '') + (x.explanation || ''), cls: 'lexi' }));
      case 'connectionAccordion': return (c.items || []).flatMap((x) => (x.paragraphs || []).map((p, i) => ({ h: i === 0 ? (x.reference || x.title || '') : '', p: p })));
      case 'narrativeWithAnchor': return (c.paragraphs || []).map((p) => ({ h: '', p: p })).concat(c.anchor ? [{ h: 'Ancla', p: c.anchor }] : []);
      case 'teachingBlocks': return (c.blocks || []).map((x) => ({ h: x.heading || '', p: (x.paragraphs || []).join(' ') }));
      case 'reflectionQuestions': return (c.questions || []).map((x) => ({ h: x.label || '', p: x.text }));
      case 'closingQuote': return [{ h: c.reference || '', p: '«' + (c.quote || '') + '»' }].concat((c.reflection || []).map((p) => ({ h: '', p: p })));
      default: return [];
    }
  }

  function avanzarEstacion(delta) {
    return () => {
      const ref = st.capRef;
      if (!ref) return;
      const key = claveCap(ref.libro, ref.cap);
      const idx = st.station || 0;
      if (delta > 0) {
        g(() => setEstudioMaxSec(key, Math.min(9, idx + 1)));
        if (idx >= 9) {
          if (!g(() => isCapLeido(ref.libro, ref.cap), false)) g(() => marcarCapituloLeido(key));
          g(() => marcarCapituloActual(''));
          aviso('★ ' + ref.libro + ' ' + ref.cap + ' estudiado');
          ir('estudio');
          return;
        }
      }
      st.station = Math.max(0, Math.min(9, idx + delta));
      pintar(); arriba();
    };
  }

  /* ── Estudio por Versículo (IA) ── */
  async function analizar(ref) {
    const campo = document.getElementById('buscaVer') || document.getElementById('buscaVerB');
    const valor = (ref || (campo && campo.value) || '').trim() || datosDia().ref;
    if (!valor || typeof pedirAnalisisVersiculo !== 'function') return;
    ir('verRes', { verRef: valor, verPartes: null, verError: false, verEstado: 'Analizando… puede tardar hasta un minuto.', verCargando: true });
    try {
      const texto = await pedirAnalisisVersiculo(valor, (p) => {
        st.verEstado = p && p.reintento ? 'Reintentando…' : 'Escribiendo el análisis…';
        pintar();
      });
      st.verPartes = partesAnalisis(texto);
      st.verEstado = '';
    } catch (e) {
      st.verPartes = null;
      st.verEstado = ((e && e.message) || 'No se pudo generar el análisis.') + ' Toca «Reintentar».';
      st.verError = true;
    }
    st.verCargando = false;
    pintar();
  }

  // El análisis llega en secciones **VERSICULO**, **TEXTO EN INGLES**, **TEXTO EN ESPAÑOL**,
  // **NBLA**, **EXPLICACION** y **NOTAS DE LA VERSION** (las mismas que valida la app).
  function partesAnalisis(texto) {
    const norm = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
    const re = /\*\*([^*]+)\*\*/g;
    const marcas = [];
    let m;
    while ((m = re.exec(texto)) !== null) marcas.push({ t: norm(m[1]), ini: re.lastIndex, enc: m.index });
    const sec = {};
    marcas.forEach((x, i) => { sec[x.t] = texto.slice(x.ini, marcas[i + 1] ? marcas[i + 1].enc : texto.length).trim(); });
    const limpio = (x) => String(x || '').replace(/\*\*|__/g, '').replace(/^\s*[-*]\s+/gm, '').trim();
    const parrafos = (x) => limpio(x).split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
    return {
      ref: limpio(sec.VERSICULO).split('\n')[0] || '',
      en: parrafos(sec['TEXTO EN INGLES']).join(' '),
      es: parrafos(sec['TEXTO EN ESPANOL']).join(' '),
      nbla: parrafos(sec.NBLA).join(' '),
      exp: parrafos(sec.EXPLICACION),
      notas: parrafos(sec['NOTAS DE LA VERSION'])
    };
  }

  function buscarLibro() {
    const campo = document.getElementById('buscaLibro') || document.getElementById('buscaLibroB');
    const q = g(() => normalizarBusqueda(campo.value || ''), '');
    if (!q) return;
    for (const b of librosOrdenados()) {
      const l = b.libros.find((x) => g(() => normalizarBusqueda(x.n), '') === q || g(() => normalizarBusqueda(x.n), '').indexOf(q) === 0);
      if (l) { st.ob = b.num; st.ol = l.n; pintar(); return; }
    }
    aviso('No encontré ese libro');
  }
  function buscarCap() {
    const campo = document.getElementById('buscaCap') || document.getElementById('buscaCapB');
    const destino = g(() => pasoDiarioCapituloDesdeReferencia((campo && campo.value) || ''), null);
    if (destino) abrirLector(destino.libro, destino.capitulo);
    else aviso('Escribe un libro y un capítulo, por ejemplo: Números 13');
  }

  function moverChips(dir) {
    const el = document.querySelector('#rd-root .est-chips');
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
  }

  function datosProfundo(screen, d) {
    const CCx = CC;
    /* Sigue donde quedaste */
    const actual = g(() => sincronizarCapituloActualDesdeCuenta(), '') || '';
    let sigue;
    const pm = /^(.+)_(\d+)$/.exec(actual);
    if (pm) {
      const libro = pm[1].replace(/_/g, ' ');
      const cap = parseInt(pm[2], 10);
      const av = Math.min(g(() => getEstudioMaxSec(actual), 0) || 0, 9);
      sigue = { t: libro + ' ' + cap, sub: 'Estudio profundo · 10 estaciones', meta: 'Estación ' + (av + 1) + ' de 10 · ' + ESTACIONES[av], btn: 'Continuar con ' + ESTACIONES[av], av: av, ref: { libro: libro, cap: cap }, abrir: () => abrirCapitulo(libro, cap) };
    } else if (d.destino) {
      sigue = { t: d.destino.libro + ' ' + d.destino.capitulo, sub: 'El capítulo de la semana', meta: 'Estación 1 de 10 · ' + ESTACIONES[0], btn: 'Empezar el estudio', av: 0, ref: { libro: d.destino.libro, cap: d.destino.capitulo }, abrir: () => abrirCapitulo(d.destino.libro, d.destino.capitulo) };
    } else {
      sigue = { t: 'Paso Profundo', sub: 'Elige un capítulo para empezar', meta: '', btn: 'Elegir capítulo', av: 0, abrir: () => ir('capitulo', { lastMode: 'capitulo' }) };
    }
    const segs = Array.from({ length: 10 }, (_, i) => (i < sigue.av ? 'done' : (i === sigue.av ? 'now' : '')));

    /* Por Capítulo (orden canónico) */
    const grupos = typeof BIBLIA_CANON_GRUPOS !== 'undefined' ? BIBLIA_CANON_GRUPOS : [];
    const canon = grupos.map((gr, i) => ({
      n: gr.nombre, cc: CCx[i % 5],
      books: gr.libros.map((l) => ({ n: l.n, c: l.caps, open: st.oc === l.n, oc: st.oc === l.n ? 'on' : '', pick: set({ oc: st.oc === l.n ? '' : l.n }), caps: st.oc === l.n ? capsDe(l.n, l.caps, 'lector') : [] }))
    }));
    const libroN = st.oc || (st.lectRef && st.lectRef.libro) || 'Génesis';
    const grupoAb = grupos.find((gr) => gr.libros.some((l) => l.n === libroN));
    const libroC = totalCaps(libroN) || ((grupoAb && grupoAb.libros.find((l) => l.n === libroN)) || {}).caps || 0;

    /* Estudio de 10 estaciones */
    // Sin un estudio abierto (portada en PC o tablet horizontal), el espacio de trabajo muestra «Sigue donde quedaste».
    const ref = st.capRef || sigue.ref || null;
    const datos = ref ? cacheV2[claveCap(ref.libro, ref.cap)] : null;
    if (ref && !datos) precargar(ref.libro, ref.cap);
    const secs = (datos && datos.estudio && datos.estudio.sections) || [];
    const sIdx = Math.min(st.capRef ? (st.station || 0) : sigue.av, 9);
    const sec = secs[sIdx];
    const items = sec ? itemsEstacion(sec, datos.textos) : [{ h: '', p: datos ? 'No se encontró el estudio de este capítulo.' : 'Cargando el estudio…', cls: '' }];
    const avance = ref ? (g(() => getEstudioMaxSec(claveCap(ref.libro, ref.cap)), 0) || 0) : 0;
    const stations = ESTACIONES.map((l, i) => ({ n: String(i + 1).padStart(2, '0'), n2: String(i + 1), l: (secs[i] && secs[i].label) || l, cc: CCx[i % 5], cls: i === sIdx ? 'on' : '', st: i < avance && i !== sIdx ? 'done' : (i === sIdx ? 'on' : ''), pick: () => { if (!st.capRef && ref) { st.capRef = ref; g(() => marcarCapituloActual(claveCap(ref.libro, ref.cap))); } st.station = i; pintar(); arriba(); } }));
    const stObj = {
      kind: (sec && KINDS[sec.type]) || 'prosa', lead: LEADS[sIdx], n: String(sIdx + 1), l: stations[sIdx].l,
      items: items.map((it) => ({ h: it.h, p: it.p, cls: it.cls || '' })),
      itemsB: items.map((it, i) => ({ h: it.h, p: it.p, cls: '', cc: CCx[i % 5] })),
      isTexto: sIdx === 0, noTexto: sIdx !== 0, isResp: sIdx === 8, isLlevar: sIdx === 9
    };
    /* Modelo 2026: el texto bíblico corrido, como en una Biblia impresa (número pequeño dentro
       del párrafo), y el resto agrupado en bloques con su título y las citas «…» destacadas. */
    const porParrafo = st.ver === 'nbla' ? 4 : 1;
    const versos = items.map((it) => ({ n: String(it.h || '').replace(/^vv?\.\s*/, ''), t: it.p }));
    stObj.bib = [];
    for (let i = 0; i < versos.length; i += porParrafo) stObj.bib.push(versos.slice(i, i + porParrafo));
    const kindA = stObj.kind;
    const gruposE = [];
    // En Conexiones, cada párrafo que empieza con una cita bíblica es su propia tarjeta.
    const REF_INICIO = /^((?:[1-3]\s)?[A-ZÁÉÍÓÚ][a-záéíóúñ]+(?:\s(?:de\s)?[A-ZÁÉÍÓÚ]?[a-záéíóúñ]+)?\s\d+(?::\d+(?:\s?[-–]\s?\d+)?)?)\b/;
    items.forEach((it0) => {
      let it = it0;
      if (sIdx === 5 && !it.h) {
        const rm = REF_INICIO.exec(String(it.p || ''));
        if (rm && /\d/.test(rm[1])) it = Object.assign({}, it, { h: rm[1] });
      }
      // En «Para llevar», solo la frase va en el póster; la reflexión sigue fuera.
      const trasFrase = kindA === 'llevar' && gruposE.length === 1 && gruposE[0].ps.length >= 1;
      if (it.h || trasFrase || !gruposE.length || (it.cls || '') !== gruposE[gruposE.length - 1].cls) gruposE.push({ h: it.h || '', ps: [], cls: it.cls || '' });
      gruposE[gruposE.length - 1].ps.push(it.p);
    });
    stObj.grupos = gruposE.map((gr, gi) => {
      const ancla = gr.h === 'Ancla';
      const llevarFrase = kindA === 'llevar' && gi === 0;
      const resp = kindA === 'responder';
      return {
        h: ancla ? 'Para no olvidar' : gr.h,
        num: resp ? String(gi + 1) : '',
        cls: [gr.h ? 'con-h' : 'sin-h', ancla ? 'ancla' : '', llevarFrase ? 'frase' : '', gr.cls].join(' '),
        // Primera frase en negrilla para leer por encima; el primer párrafo lleva letra capital.
        ps: kindA === 'recorrido' && /stop/.test(gr.cls)
          ? gr.ps.flatMap((p) => { const i = String(p).indexOf(' — '); return i > 0 ? [[{ t: p.slice(0, i), c: 'tt' }], trozos(p.slice(i + 3), false)] : [trozos(p, false)]; })
          : gr.ps.map((p, pi) => trozos(p, kindA === 'prosa' && !gr.h && !llevarFrase && !(gi === 0 && pi === 0)))
      };
    });

    /* Leer el capítulo */
    const lr = st.lectRef || (d.destino ? { libro: d.destino.libro, cap: d.destino.capitulo } : null);
    const ldat = lr ? cacheV2[claveCap(lr.libro, lr.cap)] : null;
    if (lr && !ldat) precargar(lr.libro, lr.cap);
    let lv = [];
    if (ldat && ldat.textos) {
      lv = st.ver === 'msg'
        ? (ldat.textos.msgBlocks || []).map((b) => ({ r: b.editorialRange || '', t: (b.msg && b.msg.es) || '' }))
        : (ldat.textos.nblaVerses || []).map((x) => ({ r: String(x.number), t: textoVersiculo(x) }));
    } else if (ldat) {
      lv = [{ r: '', t: 'Este capítulo todavía no tiene el texto cargado en S · T · A · R · S.' }];
    } else if (lr) {
      lv = [{ r: '', t: 'Cargando…' }];
    }
    const vecino = (delta) => {
      if (!lr) return null;
      const tot = totalCaps(lr.libro);
      const c = lr.cap + delta;
      if (c < 1 || (tot && c > tot)) return null;
      return { libro: lr.libro, cap: c };
    };
    const ant = vecino(-1); const sig = vecino(1);
    const lect = {
      t: lr ? lr.libro + ' ' + lr.cap : '', v: lv,
      prevT: ant ? ant.libro + ' ' + ant.cap : 'Inicio', nextT: sig ? sig.libro + ' ' + sig.cap : 'Fin',
      prev: () => { if (ant) abrirLector(ant.libro, ant.cap); }, next: () => { if (sig) abrirLector(sig.libro, sig.cap); },
      estudiar: () => { if (lr) abrirCapitulo(lr.libro, lr.cap); }
    };

    /* Introducción */
    const libroIntro = st.introLibro || st.ol || 'Juan';
    if (screen === 'metodo' && !st.introLibro && st.ol && g(() => INTROS_DISPONIBLES.has(st.ol), false) && !g(() => INTROS_LIBROS[st.ol], null)) {
      g(() => cargarIntroLibro(st.ol)).then(pintar);
    }
    const idat = g(() => INTROS_LIBROS[libroIntro], null);
    const portada = (idat && idat.portada) || {};
    const poster = idat && idat.recursos && idat.recursos.poster;
    const introRaw = (idat && idat.bloques) || [];
    const ib = st.ib === undefined ? 0 : st.ib;
    const introBlocks = introRaw.map((x, i) => ({
      t: x.titulo || '', d: x.descripcion || '', body: textoPlano(Object.assign({}, x, { titulo: undefined, descripcion: undefined })).join('\n\n'),
      open: ib === i, sign: ib === i ? '−' : '+', n: '0' + (i + 1), cc: CCx[i % 5], pick: () => { st.ib = st.ib === i ? -1 : i; pintar(); }
    }));
    const intro = {
      t: portada.titulo || libroIntro, sub: portada.subtitulo || '',
      cita: portada.cita ? portada.cita + (portada.referencia ? ' · ' + portada.referencia : '') : '',
      caps: (totalCaps(libroIntro) || '') + ' capítulos',
      poster: poster ? '/' + String(poster.preview || poster.full || '').replace(/^\//, '') : IMG + 'poster-juan.jpg',
      posterAlt: poster ? (poster.alt || poster.titulo || '') : ''
    };

    return {
      sigue: sigue, stSegs: segs, stLines: segs.map((x, i) => x + ' ' + CCx[i % 5]),
      canon: canon, canonB: canon,
      libroAb: { n: libroN, c: libroC, caps: capsDe(libroN, libroC, 'lector') }, libroGrupo: grupoAb ? grupoAb.nombre : '',
      introLbl: 'Introducción a ' + libroIntro, introBlocks: introBlocks, introB: introBlocks, intro: intro,
      lect: lect,
      cap: { titulo: ref ? ref.libro + ' ' + ref.cap : '' }, stations: stations, stationsB: stations,
      trail: stations.map((x, i) => ({ cls: (i < sIdx ? 'done' : (i === sIdx ? 'now' : '')) + ' ' + CCx[i % 5], pos: 'left: ' + (4 + i * 10.2) + '%' })),
      st: stObj, stBadge: avance >= 10 || g(() => ref && isCapLeido(ref.libro, ref.cap), false) ? 'Completado · 100%' : 'En curso · ' + (avance * 10) + '%',
      stPrev: () => { if (!st.capRef && ref) { st.capRef = ref; st.station = sIdx; } avanzarEstacion(-1)(); }, stNext: () => { if (!st.capRef && ref) { st.capRef = ref; st.station = sIdx; } avanzarEstacion(1)(); }, stNextL: sIdx < 9 ? 'Sigue: ' + stations[sIdx + 1].l : 'Terminar el estudio',
      // Fila deslizable de estaciones: la actual queda a la vista al cambiar de estación.
      // En PC: flechas a los lados y la rueda del mouse mueven la fila.
      chipsMove: { prev: () => moverChips(-1), next: () => moverChips(1) },
      chipsRef: (el) => {
        if (!el.__rueda) {
          el.__rueda = true;
          el.addEventListener('wheel', (ev) => {
            if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX)) return;
            const max = el.scrollWidth - el.clientWidth;
            if (max <= 0 || (ev.deltaY < 0 && el.scrollLeft <= 0) || (ev.deltaY > 0 && el.scrollLeft >= max - 1)) return;
            el.scrollLeft += ev.deltaY;
            ev.preventDefault();
          }, { passive: false });
        }
        const marca = (ref ? ref.libro + ref.cap : '') + '|' + sIdx;
        if (el.__marca === marca) return;
        const primera = !el.__marca;
        el.__marca = marca;
        const on = el.querySelector('.on');
        if (on) el.scrollTo({ left: Math.max(0, on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2), behavior: primera ? 'auto' : 'smooth' });
      },
      compartir: () => { if (ref) g(() => compartirStars('study', claveCap(ref.libro, ref.cap))); },
      openJuan: sigue.abrir,
      analizar: () => analizar(), verHay: Boolean(st.verRef),
      vr: (() => {
        const pa = st.verPartes;
        return {
          ref: (pa && pa.ref) || st.verRef || 'Por Versículo', listo: Boolean(pa),
          estado: st.verEstado || (st.verRef ? '' : 'Escribe un versículo o un rango en el panel y toca «Analizar». La explicación aparece aquí.'),
          nbla: pa ? '«' + pa.nbla.replace(/^«|»$/g, '') + '»' : '', es: pa ? pa.es : '', en: pa ? pa.en : '',
          exp: pa ? pa.exp.map((t, i) => ({ t: t, cb: i === 0 ? 'ep' : 'ep ep2' })) : [],
          notas: pa && pa.notas.length ? pa.notas : null,
          notasA: pa && pa.notas.length ? pa.notas.map(notaVersion) : null,
          otra: st.verError ? () => analizar(st.verRef) : () => ir('versiculo', { lastMode: 'versiculo' }),
          otraL: st.verError ? 'Reintentar' : 'Analizar otro versículo'
        };
      })(),
      ejemplos: [d.ref, 'Filipenses 4:6-7', 'Salmos 23'].filter(Boolean).map((t) => ({ t: t, pick: () => analizar(t) })),
      buscarLibro: buscarLibro, buscarCap: buscarCap
    };
  }

  /* ── valores para la plantilla ── */
  function valores() {
    const screen = st.screen;
    const w = st.w;
    const isA0 = st.exp === 'clasica';
    const isA = isA0 && screen !== 'elegir';
    const dev = w < 600 ? 'movil' : (w < 1100 ? 'tablet' : 'escritorio');
    const luz = st.luz;
    const tema = st.tema;
    const theme = isA ? (luz === 'noche' ? 'a-noche' : 'a-dia') : (luz === 'noche' ? 'b-noche' : 'b-alba');
    const star = theme === 'b-noche' ? PAPEL : TINTA;
    const logoA = tema === 'lhscol' ? GOLD : IMG + 'tema/logo-' + tema + '-' + (luz === 'dia' ? 'dia' : 'noche') + '.png';

    const go = {};
    ['hoy', 'completo', 'profundizar', 'frase', 'racha', 'guardados', 'novedades', 'rifa', 'estudio', 'trackerFull',
      'lector', 'intro', 'estaciones', 'verRes', 'musica', 'config', 'pin', 'diario', 'splash', 'elegir', 'libro'].forEach((k) => { go[k] = set({ screen: k }); });
    PP_IDS.forEach((k) => { go[k] = set({ screen: k, lastMode: k }); });
    STEP_IDS.forEach((k, i) => { go[k] = abrirPaso(i); });
    go.hoy = () => {
      if (st.screen === 'splash') { salirBienvenida(); return; }
      const desdeEntrada = st.screen === 'elegir';
      if (st.exp === '') { setPref('stars_rd_exp', 'moderna'); st.exp = 'moderna'; }
      ir(desdeEntrada ? pantallaInicial() : 'hoy');
    };
    // En la landing, «Mis pasos» y «Entrar» abren el inicio de sesión con Google.
    go.splash = () => {
      if (st.sesion === 'fuera') { if (typeof loginConGoogle === 'function') loginConGoogle(); return; }
      ir('splash');
    };
    go.profundizar = () => ir('profundizar', { pfDesde: STEP_IDS.indexOf(st.screen) >= 0 ? st.screen : (st.screen === 'profundizar' ? st.pfDesde : 'hoy') });
    go.pin = abrirDiario;
    go.diario = abrirDiario;
    go.landing = () => { if (confirm('¿Cerrar sesión en este dispositivo?')) cerrarSesion(); };

    const v = { landing: screen === 'landing', splash: screen === 'splash', elegir: screen === 'elegir' };
    v.inApp = !v.landing && !v.splash && !v.elegir;
    const isList = LIST_IDS.indexOf(screen) >= 0;
    v.showBot = isList;

    const sec = PROF_ALL.indexOf(screen) >= 0 ? 'profundo' : (screen === 'musica' ? 'musica' : 'diario');
    let mainId = screen;
    if (isList) mainId = sec === 'diario' ? 'hoyMain' : (sec === 'musica' ? 'musicaMain' : (screen === 'versiculo' ? 'verRes' : (screen === 'tracker' ? 'trackerFull' : (screen === 'capitulo' ? 'libro' : (screen === 'metodo' ? 'intro' : 'estaciones')))));
    const pairMode = { verRes: 'versiculo', trackerFull: 'tracker', lector: 'capitulo', intro: 'metodo', libro: 'capitulo', estaciones: (st.lastMode === 'metodo' || st.lastMode === 'capitulo') ? st.lastMode : 'estudio' };
    const leftMode = screen === 'estudio' ? 'estudio' : (PP_IDS.indexOf(screen) >= 0 ? screen : (pairMode[screen] || 'estudio'));
    const L = { diario: sec === 'diario', profundo: sec === 'profundo', musica: sec === 'musica' };
    const lmo = {}; PP_IDS.forEach((k) => { lmo[k] = leftMode === k; });
    const m = { step: STEP_IDS.indexOf(mainId) >= 0, musicaMain: mainId === 'musicaMain', hoyMain: mainId === 'hoyMain' };
    ['silencio', 'texto', 'analisis', 'reflexion', 'siembra', 'completo', 'profundizar', 'frase', 'racha', 'guardados', 'novedades', 'rifa',
      'trackerFull', 'lector', 'intro', 'estaciones', 'pin', 'diario', 'config', 'verRes', 'libro'].forEach((k) => { m[k] = mainId === k; });
    const diaIds = ['hoy', 'completo', 'profundizar', 'frase', 'racha', 'guardados', 'novedades', 'rifa', 'pin', 'diario', 'config'].concat(STEP_IDS);
    const nav = { diario: diaIds.indexOf(screen) >= 0 ? 'on' : '', profundo: PROF_ALL.indexOf(screen) >= 0 ? 'on' : '', musica: screen === 'musica' ? 'on' : '' };

    /* día */
    const d = datosDia();
    const key = getTodayKey();
    const hechos = [0, 1, 2, 3, 4].map((i) => g(() => isStepDone(i), false));
    let cur = hechos.indexOf(false);
    if (cur < 0) cur = 5;
    const done = hechos.filter(Boolean).length;
    const racha = g(() => calcularRacha(), 0);
    const estrellas = g(() => getRachaStars(), 0);
    const steps = S_NAMES.map((n, i) => ({
      cc: CC[i], min: S_MIN[i] + ' min', L: S_LET[i], n: n,
      nodeMeta: hechos[i] ? 'Hecho' : (i === cur ? 'Ahora · ' + S_MIN[i] + ' min' : S_MIN[i] + ' min'),
      cls: hechos[i] ? 'done' : (i === cur ? 'now' : (i > cur ? 'locked' : '')),
      go: abrirPaso(i)
    }));
    const nextGo = cur < 5 ? abrirPaso(cur) : go.completo;
    const nextLbl = cur < 5 ? 'Continuar con ' + S_NAMES[cur] : 'Ver el día completo';
    const sIdx = Math.max(0, STEP_IDS.indexOf(mainId));
    const diaN = (fechaDesdeKey(key).getDay() + 6) % 7;

    const semana = g(() => getWeekDates(), []);
    const hoyAct = getActualTodayKey();
    const weekA = semana.map((f, i) => {
      const k = dateToKey(f);
      return { d: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i], n: String(f.getDate()), cls: g(() => isDayComplete(k), false) ? 'done' : (k === hoyAct ? 'today' : '') };
    });

    const notas = d.notasRaw.map((n) => ({ ref: n.referencia || '', en: n.texto_en || '', es: n.texto_es || '', nbla: n.texto_nbla || '', exp: n.explicacion || '' }));
    let sugRef = '';
    const notasA = notas.map((n) => { const q = quitarInvitacionEstudio(n.exp); if (q.sug) sugRef = q.sug; return Object.assign({}, n, { exp: q.exp }); });
    const sugCap = sugRef ? g(() => pasoDiarioCapituloDesdeReferencia(sugRef), null) : null;
    const sugOtro = sugCap && !(d.destino && d.destino.libro === sugCap.libro && d.destino.capitulo === sugCap.capitulo);
    const pfIdx = STEP_IDS.indexOf(st.pfDesde);
    const cal = calendario();
    const banco = Object.values(g(() => getBancoStars(), {}) || {}).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    const saved = banco.map((x, i) => {
      const f = fechaDesdeKey(x.fecha);
      return { n: String(f.getDate()), wd: DIAS[f.getDay()] + ' · ' + MESES[f.getMonth()], ref: String(x.versiculo || '').replace(/\s*\((NBLA|MSG)\)\s*$/i, ''), cc: CC[i % 5], t: x.titulo || '', pick: () => abrirDia(x.fecha) };
    });
    const guardado = g(() => estaEnBancoStars(key), false);

    const hablarTexto = hablar('texto', () => (st.ver === 'msg' ? d.msgPlano : d.nblaPlano));
    const hablarAna = hablar('analisis', () => d.idea + ' ' + d.ana.join(' '));
    const esLeer = mainId === 'texto' || mainId === 'analisis';
    const hablando = st.speak === mainId;

    const restante = timerRestante();
    const timerActivo = st.timer.key === key && st.timer.start && restante > 0;

    /* Paso Profundo */
    const bloquesRaw = librosOrdenados();
    const openB = st.ob;
    const bloques = bloquesRaw.map((b, i) => ({
      num: String(b.num), name: b.name, desc: b.desc, count: b.libros.length + (b.libros.length === 1 ? ' libro' : ' libros'),
      open: openB === b.num, cls: (openB === b.num ? 'open' : '') + (i === bloquesRaw.length - 1 ? ' last' : ''), cc: CC[i % 5],
      pick: set({ ob: openB === b.num ? 0 : b.num }),
      books: b.libros.map((l) => ({ n: l.n, c: l.c, open: st.ol === l.n, oc: st.ol === l.n ? 'on' : '', pick: set({ ol: st.ol === l.n ? '' : l.n, introLibro: '' }), caps: st.ol === l.n ? capsDe(l.n, l.c, 'metodo') : [] }))
    }));
    const totalLeidos = leidos();
    const pct = Math.round(totalLeidos / 1189 * 100);
    const trackBlq = bloquesRaw.map((b, i) => {
      const total = b.libros.reduce((a, l) => a + l.c, 0);
      const hechosB = b.libros.reduce((a, l) => a + g(() => _capsLeidosLibro(l.n, l.c), 0), 0);
      const p = total ? Math.round(hechosB / total * 100) : 0;
      return { num: String(b.num), name: b.name, prog: hechosB + ' de ' + total + ' caps · ' + p + '%', w: 'width: ' + p + '%', cc: CC[i % 5] };
    });

    /* Modelo 2026 · Capítulos estudiados: la Biblia en miniatura (66 libros, cada uno se llena
       según lo estudiado) y el capítulo de la semana con su avance. */
    let mapa = { at: [], nt: [], libros: 0, completos: 0 };
    if (isA && sec === 'profundo' && typeof BIBLIA_CANON_GRUPOS !== 'undefined') {
      const todos = [];
      BIBLIA_CANON_GRUPOS.forEach((gr) => gr.libros.forEach((l) => todos.push(l)));
      const barras = todos.map((l) => {
        const h = g(() => _capsLeidosLibro(l.n, l.caps), 0) || 0;
        const p = l.caps ? h / l.caps : 0;
        return { cls: h ? (p >= 1 ? 'full' : 'some') : '', fill: 'height: ' + (h ? Math.max(14, Math.round(p * 100)) : 0) + '%', n: l.n, h: h };
      });
      mapa = { at: barras.slice(0, 39), nt: barras.slice(39), libros: barras.filter((b) => b.h).length, completos: barras.filter((b) => b.cls === 'full').length };
    }
    let capSemMeta = 'Estudio profundo · 10 estaciones';
    if (d.destino) {
      const kS = claveCap(d.destino.libro, d.destino.capitulo);
      const avS = g(() => getEstudioMaxSec(kS), 0) || 0;
      if (g(() => isCapLeido(d.destino.libro, d.destino.capitulo), false)) capSemMeta = 'Ya lo estudiaste · vuelve cuando quieras';
      else if (avS > 0) capSemMeta = 'Vas en la estación ' + Math.min(avS + 1, 10) + ' de 10';
      else capSemMeta = 'El estudio que acompaña tu Paso Diario';
    }
    /* Modelo 2026 · Frase para hoy: cambia de estilo cada día con el color del tema. */
    const fv = estiloFrase(tema, key);

    /* Música */
    const plAll = PLAYLISTS.map((l, i) => ({
      sz: l.n === 'Spirit' ? 'tall' : '', no: '0' + (i + 1), mom: PL_MOM[l.n], n: l.n, d: l.d, k: PL_KEY[l.n], cc: PL_CC[l.n],
      cls: st.pl === l.n ? 'on' : '', spirit: l.n === 'Spirit',
      pick: () => { if (st.pl === l.n) tocar(l.n); else { st.pl = l.n; if (st.sonando) st.sonando = l.n; pintar(); } },
      open: () => abrir(l.url),
      sonando: st.sonando === l.n, quieto: st.sonando !== l.n,
      play: () => tocar(l.n), playTxt: st.sonando === l.n ? 'Pausar' : 'Escuchar', estado: st.sonando === l.n ? 'Sonando' : 'Lista'
    }));
    const silOn = st.sonando === 'Spirit' && mainId === 'silencio';
    const plSel = plAll.filter((l) => l.n === st.pl)[0] || plAll[1];

    const nombre = g(() => (document.getElementById('user-name').textContent || '').trim().split(/\s+/)[0], '') || 'Juan';
    const hora = new Date().getHours();

    const pp = datosProfundo(screen, d);

    return Object.assign({
      /* marco */
      frameCls: 'frame ' + (isA ? 'a ' : 'b ') + dev, theme: theme, tema: isA ? tema : '',
      v: v, L: L, lmo: lmo, m: m, go: go, nav: nav,
      ppEntry: leftMode === 'estudio', ppMode: leftMode !== 'estudio',
      wsCls: isList ? 'show-left' : 'show-main',
      wsTitle: mainId === 'hoyMain' ? 'Hoy' : (mainId === 'musicaMain' ? 'Música' : (m.step ? S_NAMES[sIdx] : '')),
      star: star, starDone: isA ? logoA : star, starSplash: isA ? logoA : PAPEL, logoA: logoA, railStar: star,
      inicial: nombre.charAt(0).toUpperCase(), nombre: nombre,
      saludo: (hora < 12 ? 'Buenos días, ' : (hora < 19 ? 'Buenas tardes, ' : 'Buenas noches, ')) + nombre + '.',

      /* día */
      d: d, fechaLarga: fechaLarga(key), racha: racha, rachaDias: racha === 1 ? 'día' : 'días',
      estrellas: estrellas, estrellasTxt: estrellas + (estrellas === 1 ? ' disponible para restaurar' : ' disponibles para restaurar'),
      steps: steps, stepsDone: steps.map((x) => ({ L: x.L, n: x.n })),
      segs: [0, 1, 2, 3, 4].map((i) => ({ cls: hechos[i] ? 'done' : (i === cur ? 'now' : '') })),
      stories: [0, 1, 2, 3, 4].map((i) => (i <= Math.min(sIdx, 4) ? 'on' : '')),
      markCls: 'mark d' + done, pathCls: 'p' + Math.min(cur, 5),
      nextGo: nextGo, nextLbl: nextLbl, nextTxt: cur < 5 ? nextLbl + ' · ' + S_MIN[cur] + ' min' : nextLbl,
      progTxt: (done * 20) + '% completo · ' + done + ' de 5 pasos',
      weekA: weekA,
      abrirBlog: () => { if (typeof abrirBlog === 'function') abrirBlog(); },
      capSemana: d.destino ? d.destino.libro + ' ' + d.destino.capitulo : 'el capítulo',
      openFil: () => { if (d.destino) abrirCapitulo(d.destino.libro, d.destino.capitulo); else aviso('No se pudo identificar el capítulo de hoy'); },
      stepCls: 's' + (sIdx + 1), stepL: S_LET[sIdx], stepNum: String(sIdx + 1), stepName: S_NAMES[sIdx],
      stepSub: ['Preparar el corazón', 'Lectura del pasaje', 'Profundidad del texto', 'Pregunta personal', 'Práctica del día'][sIdx],
      stepMin: ['5 min · Oración breve', '3 min · Lectura bíblica', '3 min · Desarrollo del texto', '2 min · Pregunta personal', '2 min · Práctica concreta'][sIdx],
      stepBtn: ['He completado el silencio', 'Leí el pasaje', 'He leído el análisis', 'Listo', 'Completar el día'][sIdx],
      stepNext: completarPaso(sIdx),
      stepAnt: { hay: sIdx > 0, n: S_NAMES[Math.max(0, sIdx - 1)], go: () => { if (sIdx === 3 || sIdx === 4) guardarTextoDiario(sIdx); ir(STEP_IDS[Math.max(0, sIdx - 1)]); } },
      stepMeta: ['Sigue: Texto', 'Sigue: Análisis', 'Sigue: Reflexión', 'Sigue: Sembrar', 'Último paso del día'][sIdx],
      hayLeer: esLeer, leerPaso: mainId === 'analisis' ? hablarAna : hablarTexto,
      leerPasoOn: hablando ? 'on' : '', leerPasoSt: 'st-' + mainId, leerPasoIco: hablando ? '❚❚' : '▶',
      leerPasoLbl: hablando ? 'Detener la lectura' : (mainId === 'analisis' ? 'Escuchar el análisis' : 'Escuchar el pasaje'),
      ver: { msg: st.ver === 'msg' ? 'on' : '', nbla: st.ver === 'nbla' ? 'on' : '' },
      setVer: { msg: set({ ver: 'msg' }), nbla: set({ ver: 'nbla' }) },
      parCls: st.ver === 'msg' ? 'show-msg' : 'show-nbla',
      verName: st.ver === 'msg' ? 'MSG · The Message' : 'NBLA · Versión de referencia',
      timer: iniciarTimer, timerCls: timerActivo ? 'run' : '',
      timerTxt: Math.floor(restante / 60) + ':' + String(restante % 60).padStart(2, '0'),
      timerSub: (hechos[0] || st.timer.done) ? 'Silencio completo' : (timerActivo ? 'Respira y ora' : 'Toca para iniciar'),
      notas: notas, nota5: notas.length ? notas[notas.length - 1].exp : '',
      fraseC: CC[diaN % 5], profC: CC[(diaN + 2) % 5],
      fraseIG: isA ? () => descargarFraseA('9:16', fv, d, logoA) : () => descargarFrase('9:16'),
      frasePNG: isA ? () => descargarFraseA('1:1', fv, d, logoA) : () => descargarFrase('1:1'),
      fraseVideo: () => (isA ? videoFraseA(fv, d, logoA) : videoFraseA(estiloFrase2027(diaN % 5), d, PAPEL)),
      fraseVidOn: st.video ? 'on' : '', fraseVidSub: st.video ? 'Preparando… ' + st.video.txt : 'En movimiento', fraseVideoTxt: st.video ? 'Preparando el video… ' + st.video.txt : 'Descargar video', fraseVideoCls: st.video ? 'btn ghost block vid on' : 'btn ghost block vid', fraseVideoDca: st.video ? 'dca-btn vid on' : 'dca-btn vid',
      fraseSt: fv.css, fraseCls: 'story fv-' + fv.id, fraseQ: '«' + limpiarFrase(d.frase) + '»', fraseNota: fv.nota,
      semPasos: d.sembrarPasos, semLink: d.sembrarLink, semVarios: d.sembrarPasos.length > 1 ? 'varios' : 'uno',
      brv: partirBreve(d.breve),
      notasA: notasA,
      musSil: { on: silOn, cls: silOn ? 'on' : '', ico: silOn ? '❚❚' : '▶', toggle: () => tocar('Spirit') },
      pfSug: { hay: Boolean(sugOtro), t: sugCap ? sugCap.libro + ' ' + sugCap.capitulo : '', go: () => { if (sugCap) abrirCapitulo(sugCap.libro, sugCap.capitulo); } },
      pfVolver: { t: pfIdx >= 0 ? 'Volver a ' + S_NAMES[pfIdx] : 'Volver al Paso Diario', d: pfIdx >= 0 ? 'A ' + S_NAMES[pfIdx] : 'Al Paso Diario', go: pfIdx >= 0 ? () => ir(STEP_IDS[pfIdx]) : go.hoy },
      mapa: mapa, mapaTxt: mapa.libros + (mapa.libros === 1 ? ' libro empezado' : ' libros empezados') + (mapa.completos ? ' · ' + mapa.completos + (mapa.completos === 1 ? ' completo' : ' completos') : ''),
      capSemMeta: capSemMeta,
      guardarDia: () => { g(() => toggleBancoDiaActivo()); pintar(); },
      guardarTxt: guardado ? 'Día guardado' : 'Guardar este día', guardOn: guardado ? 'on' : '', guardIco: guardado ? '✓' : '',
      dow: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], cal: cal.filas, calMes: cal.nombre, calPrev: moverMes(-1), calNext: moverMes(1),
      saved: saved, guardTitulo: 'Todos tus días', guardN: saved.length + (saved.length === 1 ? ' día' : ' días'),
      guardNota: saved.length ? '' : 'Aún no tienes días guardados. Guarda uno desde Día completo.',

      /* Paso Profundo */
      bloques: bloques, bloquesB: bloques, trackBlq: trackBlq, trackB: trackBlq,
      leidos: totalLeidos.toLocaleString('es-CO'), pendientes: (1189 - totalLeidos).toLocaleString('es-CO'), pct: pct + '%', pctW: 'width: ' + Math.max(pct, 1) + '%',

      /* Música */
      plTracks: plAll, plSel: plSel, plF: plAll[1],

      /* Ajustes */
      cfgTitle: isA ? 'Configuración' : 'Ajustes',
      expOn: { clasica: isA0 ? 'on' : '', moderna: isA0 ? '' : 'on' },
      setExp: { clasica: () => cambiarExp('clasica'), moderna: () => cambiarExp('moderna') },
      optAc: isA0 ? 'on' : '', optBc: isA0 ? '' : 'on', elGo: 'Continuar con ' + (isA0 ? 'El Buen Camino' : 'Una Vida a Todo Color'),
      temaOn: { lhscol: tema === 'lhscol' ? 'on' : '', oxigeno: tema === 'oxigeno' ? 'on' : '', mesa: tema === 'mesa' ? 'on' : '', sala: tema === 'sala' ? 'on' : '' },
      setTema: { lhscol: () => cambiarTema('lhscol'), oxigeno: () => cambiarTema('oxigeno'), mesa: () => cambiarTema('mesa'), sala: () => cambiarTema('sala') },
      toggleLuz: () => { st.luz = st.luz === 'noche' ? 'dia' : 'noche'; setPref('stars_modo', st.luz); pintar(); },
      diaOn: luz === 'dia' ? 'on' : '', luzN: luz === 'dia' ? '' : 'on',
      luzTxt: luz === 'dia' ? 'Activado · toca para volver a noche' : 'Desactivado · toca para cambiar',
      soporte: () => abrir(SOPORTE), lhscol: () => abrir(LHSCOL),
      adminBar: () => { if (typeof toggleAdminBar === 'function') toggleAdminBar(true); },
      esAdmin: Boolean(window.ADMIN_MODE),
      lmode: { diario: st.lmode === 'profundo' ? '' : 'on', profundo: st.lmode === 'profundo' ? 'on' : '' },
      setLmode: { diario: set({ lmode: 'diario' }), profundo: set({ lmode: 'profundo' }) },
      lsteps: (st.lmode === 'profundo' ? LANDING_PROFUNDO : LANDING_DIARIO).map((x, i) => ({ L: x[0], n: x[1], min: x[2], d: x[3], cc: CC[i] })),
      verMetodo: () => { const el = Array.from(document.querySelectorAll('#rd-root .ld-seg')).filter((x) => x.offsetParent)[0]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
      splMeta: fechaLarga(key),
      ldTag: isA0 ? 'Disfruta el Buen Camino.' : 'Una Vida a Todo Color.',
      ldStar: isA0 ? logoA : star,
      splQ: isA0 ? '«Disfruta el Buen Camino.»' : '«Una Vida a Todo Color.»',
      pinDots: [0, 1, 2, 3].map((i) => (i < pin.buf.length ? 'on' : '')),
      pinMsg: pin.modo === 'crear' ? 'Crea un PIN de 4 dígitos para tu diario.' : (pin.modo === 'confirmar' ? 'Escríbelo otra vez para confirmarlo.' : 'Solo tú puedes verlo. Ingresa tu PIN.'),
      keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) => ({ k: k, cls: k === '' ? 'blank' : '', pick: () => tecla(k) })),
      keysB: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'Borrar'].map((k) => ({ k: k, cls: k.length > 1 ? 'fx' : (k === '' ? 'blank' : ''), pick: () => tecla(k) })),
      pinOlvido: olvidePin,
      cerrarDiario: () => { pin.abierto = false; abrirDiario(); },
      entries: entradasDiario(),
      drTabs: [['todo', 'Todo'], ['diario', 'Paso Diario'], ['profundo', 'Paso Profundo']].map((t) => ({ l: t[1], cls: pin.tab === t[0] ? 'on' : '', pick: () => { pin.tab = t[0]; pintar(); } })),
      refTexto: g(() => window.FB.getReflexion(key), ''), semTexto: g(() => window.FB.getSembrar(key), ''),
      fontBtns: [0, 1, 2, 3, 4].map((i) => ({ cls: i === fuenteIdx() ? 'on' : '', l: ['Muy pequeña', 'Pequeña', 'Normal', 'Grande', 'Muy grande'][i], pick: () => cambiarFuente(i) })),
      fontMenos: () => cambiarFuente(fuenteIdx() - 1), fontMas: () => cambiarFuente(fuenteIdx() + 1),
      nov: novedades(() => { if (d.destino) abrirCapitulo(d.destino.libro, d.destino.capitulo); }),
      rifa: rifa()
    }, pp);
  }

  /* ── Diario con PIN ──
     El diario muestra lo que la persona escribe en Reflexión y Sembrar (campos reflexion_… y
     sembrar_… de su cuenta, los mismos que ya existían). El PIN se guarda cifrado (SHA-256)
     en su cuenta; si lo olvida, entra con su cuenta, crea otro y no pierde nada. */
  const pin = { buf: '', modo: '', primero: '', abierto: false, tab: 'todo', q: '' };
  async function hashPin(p) {
    const datos = new TextEncoder().encode((window.FB ? window.FB.uid() : '') + ':' + p);
    const h = await crypto.subtle.digest('SHA-256', datos);
    return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  function pinGuardado() { return g(() => (window.FB.datos().diario_pin || {}).h, '') || ''; }
  function abrirDiario() {
    if (pin.abierto) { ir('diario'); return; }
    pin.buf = ''; pin.primero = '';
    pin.modo = pinGuardado() ? 'entrar' : 'crear';
    ir('pin');
  }
  async function tecla(k) {
    if (k === '⌫' || k === 'Borrar') { pin.buf = pin.buf.slice(0, -1); pintar(); return; }
    if (!/^\d$/.test(k) || pin.buf.length >= 4) return;
    pin.buf += k;
    pintar();
    if (pin.buf.length < 4) return;
    const valor = pin.buf;
    await new Promise((r) => setTimeout(r, 180));
    pin.buf = '';
    if (pin.modo === 'crear') { pin.primero = valor; pin.modo = 'confirmar'; pintar(); return; }
    if (pin.modo === 'confirmar') {
      if (valor !== pin.primero) { aviso('Los PIN no coinciden. Créalo de nuevo.'); pin.modo = 'crear'; pin.primero = ''; pintar(); return; }
      const h = await hashPin(valor);
      g(() => window.FB.setRachaMap('diario_pin', { h: h, creado: Date.now() }));
      pin.abierto = true; aviso('PIN creado'); ir('diario'); return;
    }
    const h = await hashPin(valor);
    if (h === pinGuardado()) { pin.abierto = true; ir('diario'); }
    else { aviso('PIN incorrecto'); pintar(); }
  }
  function olvidePin() {
    if (!confirm('Vas a crear un PIN nuevo. Lo que escribiste en tu diario no se pierde. ¿Continuar?')) return;
    pin.modo = 'crear'; pin.buf = ''; pin.primero = '';
    pintar();
  }
  function entradasDiario() {
    const datos = g(() => window.FB.datos(), {}) || {};
    const out = [];
    Object.keys(datos).forEach((k) => {
      const m = /^(reflexion|sembrar)_(\d{4}-\d{2}-\d{2})$/.exec(k);
      if (!m || !String(datos[k] || '').trim()) return;
      const f = fechaDesdeKey(m[2]);
      const devo = g(() => DEVOCIONALES[m[2]], null);
      out.push({
        key: m[2], tipo: m[1], dt: String(f.getDate()), mo: MESES[f.getMonth()].slice(0, 3),
        f: 'Paso Diario · ' + (m[1] === 'reflexion' ? 'Reflexión' : 'Mi paso de hoy') + (devo && devo.titulo ? ' · ' + devo.titulo : ''),
        t: String(datos[k]), cc: m[1] === 'reflexion' ? 'c-reflexion' : 'c-siembra'
      });
    });
    out.sort((a, b) => (a.key === b.key ? (a.tipo < b.tipo ? -1 : 1) : (a.key < b.key ? 1 : -1)));
    const q = g(() => normalizarBusqueda(pin.q), pin.q.toLowerCase());
    return out.filter((e) => (pin.tab !== 'profundo') && (!q || g(() => normalizarBusqueda(e.t + ' ' + e.f), '').indexOf(q) >= 0));
  }

  /* ── Novedades: el mismo texto semanal que ya tiene la app (#novedades-modal) ── */
  function novedades(destinoCap) {
    const modal = document.getElementById('novedades-modal');
    const txt = (sel, el) => ((el || modal) && (el || modal).querySelector(sel) ? (el || modal).querySelector(sel).textContent.replace(/\s+/g, ' ').trim() : '');
    const items = modal ? Array.from(modal.querySelectorAll('.novedades-item')).map((it, i) => {
      const t = txt('.novedades-item-title', it);
      const p = txt('.novedades-item-copy', it);
      let pick = () => {};
      if (/problemas con la app|soporte/i.test(t)) pick = () => abrir(SOPORTE);
      else if (/^Profundiza en/i.test(t)) pick = destinoCap;
      return { t: t, p: p, n: String(i + 1).padStart(2, '0'), cc: CC[(i + 3) % 5], sz: i === 0 ? 'tall' : (i === 2 ? 'wide' : ''), na: 'n' + Math.min(i + 1, 4), pick: pick };
    }) : [];
    return { t: txt('.novedades-title'), intro: txt('.novedades-intro'), items: items };
  }

  /* ── Aviso de rifa (lo escribe el servidor en la cuenta) ── */
  function rifa() {
    const a = g(() => avisoRifaPendiente(), null);
    if (!a) return { k: 'Rifa de racha', t: '¡Felicitaciones!', p: 'No tienes avisos de rifa pendientes.', ok: () => ir('hoy'), img: () => {}, luego: () => ir('hoy') };
    const partes = g(() => fechaRifaPartes(a.fecha), { dia: '', hora: '' });
    return {
      k: a.tipoNombre || 'Rifa de racha',
      t: a.nombre ? '¡Felicitaciones, ' + a.nombre + '!' : '¡Felicitaciones!',
      p: 'Completaste tu racha de ' + a.periodo + ' y estás participando en la ' + String(a.tipoNombre || 'rifa').toLowerCase() + '. La rifa será el ' + String(partes.dia).toLowerCase() + ' a las ' + partes.hora + ' ' + g(() => lugarRifaConEn(String(a.lugar || '')), '') + '. ¡Te esperamos!',
      ok: () => { g(() => window.FB.setAvisoRifaVisto(a.id)); ir('hoy'); },
      luego: () => {
        try {
          const pos = JSON.parse(sessionStorage.getItem(RIFA_AVISO_SESSION_KEY) || '{}') || {};
          pos[a.id] = true;
          sessionStorage.setItem(RIFA_AVISO_SESSION_KEY, JSON.stringify(pos));
        } catch (_) { /* nada */ }
        ir('hoy');
      },
      img: async () => {
        try {
          _rifaAvisoActual = a;
          _rifaAvisoImagenUrl = await generarImagenAvisoRifa(a);
          descargarImagenAvisoRifa();
        } catch (e) { aviso('No se pudo preparar la imagen'); }
      }
    };
  }
  // Después de la bienvenida: primero el aviso de rifa; si no hay, las Novedades nuevas.
  function pantallaInicial() {
    if (g(() => avisoRifaPendiente(), null)) return 'rifa';
    const vistas = g(() => novedadesRachaYaVistas(), true);
    if (!vistas && sessionStorage.getItem('stars_rd_nov') !== '1') {
      try { sessionStorage.setItem('stars_rd_nov', '1'); } catch (_) { /* nada */ }
      g(() => window.FB.setNovedadesRachaVista());
      return 'novedades';
    }
    return 'hoy';
  }

  /* ── Tamaño de letra: el mismo ajuste de la app (stars_font, 5 tamaños) ── */
  function fuenteIdx() { const v = parseInt(pref('stars_font', '2'), 10); return isNaN(v) ? 2 : Math.max(0, Math.min(4, v)); }
  function aplicarZoom() {
    const escala = g(() => FONT_SIZES[fuenteIdx()].scale, 1) || 1;
    document.documentElement.style.setProperty('--rd-zoom', String(escala));
  }
  function cambiarFuente(i) {
    const idx = Math.max(0, Math.min(4, i));
    if (typeof _aplicarFontSize === 'function') g(() => _aplicarFontSize(idx)); else setPref('stars_font', String(idx));
    aplicarZoom();
    pintar();
  }

  function cambiarExp(e) { st.exp = e; setPref('stars_rd_exp', e); pintar(); }
  function cambiarTema(t) { st.tema = t; setPref('stars_tema', t); pintar(); }

  /* ── Frase para hoy · modelo 2026 ──
     Tres estilos que se turnan día a día, con el color del tema elegido
     (LHSCOL dorado, Oxígeno turquesa, La Mesa coral, La Sala verde). */
  const TEMA_COLOR = {
    lhscol: { c: '#c9a84c', osc: '#7a5e18' }, oxigeno: { c: '#00d8e0', osc: '#00686d' },
    mesa: { c: '#ff6b6b', osc: '#a3302c' }, sala: { c: '#a8ff3e', osc: '#3f6e0c' }
  };
  function estiloFrase(tema, key) {
    const col = TEMA_COLOR[tema] || TEMA_COLOR.lhscol;
    const f = fechaDesdeKey(key);
    const n = Math.floor(Date.UTC(f.getFullYear(), f.getMonth(), f.getDate()) / 86400000);
    const estilos = [
      { id: 'noche', nota: 'Hoy: fondo oscuro con letras de color', bg: '#0d0b08', ink: '#f3ede2', acc: col.c, mut: '#a0957f', logo: col.c },
      { id: 'color', nota: 'Hoy: fondo de color', bg: col.c, ink: '#12100b', acc: '#12100b', mut: 'rgba(18,16,11,.66)', logo: '#12100b' },
      { id: 'papel', nota: 'Hoy: fondo claro', bg: '#f4eee1', ink: '#1c160d', acc: col.osc, mut: '#6b5d47', logo: '#1c160d' }
    ];
    const e = estilos[((n % 3) + 3) % 3];
    e.css = '--fbg:' + e.bg + ';--fink:' + e.ink + ';--facc:' + e.acc + ';--fmut:' + e.mut;
    return e;
  }
  // Modelo 2027 · el video usa el color del día de la tarjeta de la frase (colores de los pasos).
  function estiloFrase2027(i) {
    const c = ['#97a4e6', '#6cc0c4', '#e6b24c', '#ff7f57', '#a3cc72'][i] || '#ff7f57';
    const e = { id: 'color', bg: c, ink: '#12110f', acc: '#12110f', mut: 'rgba(18,17,15,.66)', logo: '#12110f' };
    e.css = '';
    return e;
  }
  function limpiarFrase(t) { return String(t || '').replace(/^[\s"'«“”]+|[\s"'»“”]+$/g, '').trim(); }
  function cargarImagen(src) {
    return new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
  }
  // Prepara todo lo que se dibuja (letras, logo teñido, líneas de la frase) una sola vez.
  async function prepararFrase(formato, e, d, logoSrc) {
    const frase = limpiarFrase(d.frase);
    if (!frase) return null;
    const W = 1080;
    const H = formato === '9:16' ? 1920 : 1080;
    try {
      await Promise.all([
        document.fonts.load('italic 400 80px "Cormorant Garamond"'),
        document.fonts.load('300 30px "Outfit"'), document.fonts.load('400 30px "Outfit"')
      ]);
    } catch (_) { /* se usa la letra de respaldo */ }
    const C = 150;
    const top = formato === '9:16' ? 190 : 100;
    const img = await cargarImagen(logoSrc);
    let estrella = null;
    if (img) {
      const s = Math.round(C * 30 / 48);
      estrella = document.createElement('canvas');
      estrella.width = s; estrella.height = s;
      const tc = estrella.getContext('2d');
      tc.drawImage(img, 0, 0, s, s);
      tc.globalCompositeOperation = 'source-in';
      tc.fillStyle = e.logo; tc.fillRect(0, 0, s, s);
    }
    // Frase: el tamaño se ajusta para que quepa
    const medir = document.createElement('canvas').getContext('2d');
    const maxW = W - 200;
    const zonaAlto = formato === '9:16' ? 900 : 500;
    let size = formato === '9:16' ? 108 : 84;
    let lineas = [];
    const partir = (fs) => {
      medir.font = 'italic 400 ' + fs + 'px "Cormorant Garamond", Georgia, serif';
      const palabras = ('«' + frase + '»').split(/\s+/);
      const out = [];
      let linea = '';
      palabras.forEach((p) => {
        const prueba = linea ? linea + ' ' + p : p;
        if (medir.measureText(prueba).width > maxW && linea) { out.push(linea); linea = p; } else linea = prueba;
      });
      if (linea) out.push(linea);
      return out;
    };
    for (;;) {
      lineas = partir(size);
      if (lineas.length * size * 1.22 <= zonaAlto || size <= 44) break;
      size -= 4;
    }
    return { W: W, H: H, e: e, d: d, formato: formato, C: C, top: top, estrella: estrella, lineas: lineas, size: size };
  }

  const suave = (x) => { const v = Math.max(0, Math.min(1, x)); return v * v * (3 - 2 * v); };

  // Dibuja la frase. t = segundos del video; sin t, la imagen final (todo visible y quieto).
  function dibujarFrase(cx, P, t) {
    const { W, H, e, C, top, estrella, lineas, size } = P;
    const fijo = t === undefined;
    const tt = fijo ? 99 : t;
    // Fondo y resplandor
    cx.globalAlpha = 1;
    cx.filter = 'none';
    cx.fillStyle = e.bg; cx.fillRect(0, 0, W, H);
    if (e.id === 'noche') {
      const k = fijo ? 1 : 0.55 + 0.45 * suave(tt / 3) + 0.08 * Math.sin(tt * 0.9);
      const gr = cx.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.42, W * 0.9 * k);
      gr.addColorStop(0, e.acc + '33'); gr.addColorStop(1, e.acc + '00');
      cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
    }
    // En el video, un resplandor que respira despacio detrás del logo (en los tres estilos)
    if (!fijo) {
      const resp = suave(tt / 2) * (0.75 + 0.25 * Math.sin(tt * 1.1));
      const cy = top - 15 + C / 2;
      const rg = cx.createRadialGradient(W / 2, cy, 10, W / 2, cy, 260 + 60 * resp);
      const base = e.id === 'color' ? '#ffffff' : e.acc;
      const alfa = Math.round((e.id === 'color' ? 70 : 60) * resp).toString(16).padStart(2, '0');
      rg.addColorStop(0, base + alfa); rg.addColorStop(1, base + '00');
      cx.fillStyle = rg; cx.fillRect(0, 0, W, H * 0.45);
    }
    // Logo: entra girando, aparecen los cinco círculos uno a uno y luego gira despacio
    const lx = W / 2;
    const ly = top - 15 + C / 2;
    const entra = fijo ? 1 : suave((tt - 0.2) / 1.4);
    const giro = fijo ? 0 : (1 - entra) * -Math.PI * 1.2 + tt * (Math.PI * 2 / 24);
    cx.save();
    cx.translate(lx, ly);
    cx.rotate(giro);
    cx.globalAlpha = entra;
    if (estrella) {
      const s = estrella.width * (0.7 + 0.3 * entra);
      cx.drawImage(estrella, -s / 2, -s / 2, s, s);
    }
    const r = C * 3 / 48;
    const pos = [[C / 2, r], [C - r, C * 0.3 + r], [C * 0.84 - r, C * 0.96 - r], [C * 0.16 + r, C * 0.96 - r], [r, C * 0.3 + r]];
    cx.fillStyle = e.acc;
    pos.forEach((p, i) => {
      const a = fijo ? 1 : suave((tt - 0.9 - i * 0.3) / 0.5);
      if (a <= 0) return;
      cx.globalAlpha = a;
      cx.beginPath(); cx.arc(p[0] - C / 2, p[1] - C / 2, r * (0.4 + 0.6 * a), 0, Math.PI * 2); cx.fill();
    });
    cx.restore();
    // Nombre
    cx.textAlign = 'center';
    cx.textBaseline = 'alphabetic';
    cx.globalAlpha = fijo ? 1 : suave((tt - 2.4) / 0.8);
    cx.fillStyle = e.acc;
    cx.font = '300 30px Outfit, sans-serif';
    cx.fillText('S  ·  T  ·  A  ·  R  ·  S', W / 2, top + 175);
    // Frase: en la imagen, completa; en el video, palabra por palabra, nítida desde un desenfoque
    const lh = size * 1.22;
    const centro = P.formato === '9:16' ? H * 0.5 : H * 0.54;
    let y = centro - (lineas.length * lh) / 2 + size * 0.8;
    cx.font = 'italic 400 ' + size + 'px "Cormorant Garamond", Georgia, serif';
    cx.fillStyle = e.ink;
    let k = 0;
    const T0 = 3.2;
    const PASO = 0.16;
    lineas.forEach((l) => {
      if (fijo) { cx.globalAlpha = 1; cx.fillText(l, W / 2, y); y += lh; return; }
      const palabras = l.split(' ');
      const esp = cx.measureText(' ').width;
      let x = W / 2 - cx.measureText(l).width / 2;
      cx.textAlign = 'left';
      palabras.forEach((w) => {
        const a = suave((tt - T0 - k * PASO) / 0.9);
        const ancho = cx.measureText(w).width;
        if (a > 0) {
          cx.globalAlpha = a;
          cx.filter = a < 1 ? 'blur(' + ((1 - a) * 8).toFixed(1) + 'px)' : 'none';
          cx.fillText(w, x, y + (1 - a) * 14);
          cx.filter = 'none';
        }
        x += ancho + esp;
        k += 1;
      });
      cx.textAlign = 'center';
      y += lh;
    });
    P.finFrase = T0 + k * PASO + 0.6;
    // Filete y referencia
    const af = fijo ? 1 : suave((tt - (P.finFrase || 6)) / 1);
    cx.globalAlpha = af;
    cx.fillStyle = e.acc;
    const ancho = 80 * af;
    cx.fillRect(W / 2 - ancho / 2, y + 10, ancho, 3);
    cx.fillStyle = e.mut;
    cx.font = '400 32px Outfit, sans-serif';
    cx.fillText((P.d.ref ? P.d.ref + '  ·  ' : '') + '@lhscol', W / 2, H - (P.formato === '9:16' ? 190 : 105));
    // En el video, una línea fina abajo que se llena en los 15 segundos (como en la bienvenida)
    if (!fijo) {
      const bx = 140;
      const bw = W - bx * 2;
      const by = H - 110;
      cx.globalAlpha = 1;
      cx.fillStyle = e.id === 'color' ? 'rgba(18,16,11,.18)' : (e.id === 'papel' ? 'rgba(28,22,13,.14)' : 'rgba(243,237,226,.14)');
      cx.fillRect(bx, by, bw, 3);
      cx.fillStyle = e.acc;
      cx.fillRect(bx, by, bw * Math.min(1, tt / VIDEO_SEG), 3);
    }
    cx.globalAlpha = 1;
  }

  // Guarda un archivo en el teléfono (en iPhone, con el menú de compartir).
  async function guardarArchivo(blob, nombre, msg) {
    const archivo = typeof File === 'function' ? new File([blob], nombre, { type: blob.type }) : null;
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent);
    if (ios && archivo && navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try { await navigator.share({ files: [archivo] }); return; } catch (_) { /* sigue a la descarga */ }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = nombre; a.href = url;
    document.body.appendChild(a); a.click(); a.remove();
    aviso(msg);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function descargarFraseA(formato, e, d, logoSrc) {
    const P = await prepararFrase(formato, e, d, logoSrc);
    if (!P) { aviso('Hoy no hay frase'); return; }
    const cv = document.createElement('canvas');
    cv.width = P.W; cv.height = P.H;
    dibujarFrase(cv.getContext('2d'), P);
    const nombre = 'frase-stars-' + getTodayKey() + '-' + (formato === '9:16' ? 'historia' : 'imagen') + '.png';
    cv.toBlob((blob) => {
      if (!blob) { aviso('No se pudo preparar la imagen'); return; }
      guardarArchivo(blob, nombre, 'Imagen guardada en Descargas');
    }, 'image/png');
  }

  /* Video de 15 segundos (historia 9:16): el logo entra girando, aparecen los cinco círculos,
     luego la frase y la referencia. Se graba en el mismo teléfono; nada sale a internet. */
  const VIDEO_SEG = 15;
  // Respaldo (teléfonos sin WebCodecs): grabación en vivo. Su MP4 puede no gustarle a Instagram.
  async function videoFraseGrabado(e, d, logoSrc) {
    if (st.video) return;
    const tipos = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const tipo = typeof MediaRecorder !== 'undefined' ? tipos.find((x) => { try { return MediaRecorder.isTypeSupported(x); } catch (_) { return false; } }) : null;
    const cvProbe = document.createElement('canvas');
    if (!tipo || typeof cvProbe.captureStream !== 'function') { aviso('Este teléfono no puede crear el video. Descarga la imagen.'); return; }
    const P = await prepararFrase('9:16', e, d, logoSrc);
    if (!P) { aviso('Hoy no hay frase'); return; }
    const cv = document.createElement('canvas');
    cv.width = P.W; cv.height = P.H;
    const cx = cv.getContext('2d');
    dibujarFrase(cx, P, 0);
    const flujo = cv.captureStream(30);
    let rec;
    try { rec = new MediaRecorder(flujo, { mimeType: tipo, videoBitsPerSecond: 8000000 }); } catch (_) { aviso('Este teléfono no puede crear el video. Descarga la imagen.'); return; }
    const trozosVideo = [];
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) trozosVideo.push(ev.data); };
    const fin = new Promise((ok) => { rec.onstop = ok; });
    st.video = { txt: VIDEO_SEG + ' s · no salgas de la app' };
    pintar();
    rec.start(500);
    const t0 = performance.now();
    let ultimo = -1;
    await new Promise((ok) => {
      (function cuadro() {
        const t = (performance.now() - t0) / 1000;
        dibujarFrase(cx, P, Math.min(t, VIDEO_SEG));
        const quedan = Math.max(0, Math.ceil(VIDEO_SEG - t));
        if (quedan !== ultimo) { ultimo = quedan; st.video = { txt: quedan + ' s · no salgas de la app' }; pintar(); }
        if (t >= VIDEO_SEG) ok(); else requestAnimationFrame(cuadro);
      })();
    });
    rec.stop();
    await fin;
    flujo.getTracks().forEach((x) => x.stop());
    st.video = null;
    pintar();
    const blob = new Blob(trozosVideo, { type: tipo.split(';')[0] });
    if (!blob.size) { aviso('No se pudo crear el video'); return; }
    const ext = tipo.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
    await guardarArchivo(blob, 'frase-stars-' + getTodayKey() + '-video.' + ext, 'Video guardado en Descargas');
  }

  /* Video armado cuadro por cuadro (WebCodecs + mp4-muxer): MP4 estándar H.264, 30 cuadros
     por segundo parejos, índice al inicio y pista de audio en silencio, como lo espera Instagram.
     Si el teléfono no lo permite, se usa la grabación en vivo. */
  function cargarMuxer() {
    if (window.Mp4Muxer) return Promise.resolve(true);
    return new Promise((ok) => {
      const s = document.createElement('script');
      s.src = '/rediseno/mp4-muxer.js?v=1';
      s.onload = () => ok(Boolean(window.Mp4Muxer));
      s.onerror = () => ok(false);
      document.head.appendChild(s);
    });
  }
  async function configVideo(W, H) {
    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return null;
    for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.42002a']) {
      const cfg = { codec: codec, width: W, height: H, bitrate: 6000000, framerate: 30, avc: { format: 'avc' } };
      try { const r = await VideoEncoder.isConfigSupported(cfg); if (r && r.supported) return cfg; } catch (_) { /* siguiente */ }
    }
    return null;
  }
  async function configAudio() {
    if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') return null;
    const cfg = { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 1, bitrate: 64000 };
    try { const r = await AudioEncoder.isConfigSupported(cfg); return r && r.supported ? cfg : null; } catch (_) { return null; }
  }
  async function videoFraseA(e, d, logoSrc) {
    if (st.video) return;
    st.video = { txt: '0 %' };
    pintar();
    const listo = await cargarMuxer();
    const vcfg = listo ? await configVideo(1080, 1920) : null;
    if (!vcfg) { st.video = null; pintar(); await videoFraseGrabado(e, d, logoSrc); return; }
    const acfg = await configAudio();
    const P = await prepararFrase('9:16', e, d, logoSrc);
    if (!P) { st.video = null; pintar(); aviso('Hoy no hay frase'); return; }
    const FPS = 30;
    const total = VIDEO_SEG * FPS;
    try {
      const destino = new Mp4Muxer.ArrayBufferTarget();
      const opciones = { target: destino, video: { codec: 'avc', width: P.W, height: P.H, frameRate: FPS }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' };
      if (acfg) opciones.audio = { codec: 'aac', numberOfChannels: 1, sampleRate: 48000 };
      const muxer = new Mp4Muxer.Muxer(opciones);
      let fallo = null;
      const venc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (err) => { fallo = err; } });
      venc.configure(vcfg);
      let aenc = null;
      if (acfg) {
        aenc = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: () => { /* sin audio */ } });
        aenc.configure(acfg);
        // 15 s de silencio, en bloques de 1024 muestras
        const N = 1024;
        const silencio = new Float32Array(N);
        for (let i = 0; i * N < VIDEO_SEG * 48000; i += 1) {
          const ad = new AudioData({ format: 'f32', sampleRate: 48000, numberOfFrames: N, numberOfChannels: 1, timestamp: Math.round(i * N * 1e6 / 48000), data: silencio });
          aenc.encode(ad);
          ad.close();
        }
      }
      const cv = document.createElement('canvas');
      cv.width = P.W; cv.height = P.H;
      const cx = cv.getContext('2d');
      let ultimo = -1;
      for (let i = 0; i < total; i += 1) {
        if (fallo) throw fallo;
        dibujarFrase(cx, P, i / FPS);
        const frame = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
        venc.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
        frame.close();
        while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 5));
        const pct = Math.floor((i + 1) / total * 100);
        if (pct !== ultimo && pct % 5 === 0) { ultimo = pct; st.video = { txt: pct + ' %' }; pintar(); await new Promise((r) => setTimeout(r, 0)); }
      }
      await venc.flush();
      if (aenc) { try { await aenc.flush(); } catch (_) { /* sin audio */ } }
      if (fallo) throw fallo;
      muxer.finalize();
      venc.close();
      if (aenc) { try { aenc.close(); } catch (_) { /* nada */ } }
      st.video = null;
      pintar();
      const blob = new Blob([destino.buffer], { type: 'video/mp4' });
      await guardarArchivo(blob, 'frase-stars-' + getTodayKey() + '-video.mp4', 'Video guardado en Descargas');
    } catch (err) {
      console.warn('[rediseño] video cuadro por cuadro', err);
      st.video = null;
      pintar();
      await videoFraseGrabado(e, d, logoSrc);
    }
  }

  async function descargarFrase(formato) {
    if (typeof pasoDiarioDescargarFrase !== 'function' || typeof _pd2FraseEstado === 'undefined') { aviso('No se pudo preparar la imagen'); return; }
    _pd2FraseEstado.mobile.formato = formato;
    await g(() => pasoDiarioDescargarFrase('mobile'));
  }

  /* ── montaje ── */
  function montar(raiz, plantilla) {
    render = window.STARS_MOTOR.crear(plantilla, raiz);
    aplicarZoom();
    // Cuando la cuenta cambia en otro dispositivo, la app vieja llama estas funciones: volver a pintar.
    ['updateRachaUI', 'initSteps', 'actualizarDevoContextoUI', 'renderBancoStars', 'updateTracker'].forEach((nombre) => {
      const orig = window[nombre];
      if (typeof orig !== 'function') return;
      window[nombre] = function () { const r = orig.apply(this, arguments); pintar(); return r; };
    });
    window.addEventListener('resize', () => { st.w = window.innerWidth; pintar(); });
    raiz.addEventListener('input', (e) => {
      if (e.target.id === 'drBusca' || e.target.id === 'drBuscaB') { pin.q = e.target.value; pintar(); }
    });
    raiz.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const id = e.target.id;
      if (id === 'buscaVer' || id === 'buscaVerB') analizar();
      else if (id === 'buscaCap' || id === 'buscaCapB') buscarCap();
      else if (id === 'buscaLibro' || id === 'buscaLibroB') buscarLibro();
    });
    // Enlaces compartidos (?study=Juan_15 o ?read=Juan_15) se abren en el diseño nuevo.
    const params = new URLSearchParams(location.search);
    const enlace = params.get('study') || params.get('read');
    const em = enlace && /^(.+)_(\d+)$/.exec(enlace);
    if (em) {
      const libro = em[1].replace(/_/g, ' ');
      setTimeout(() => { if (params.get('study')) abrirCapitulo(libro, parseInt(em[2], 10)); else abrirLector(libro, parseInt(em[2], 10)); }, 9200);
    }
    render(valores());
    // Bienvenida: 9 segundos o hasta que toque la pantalla. La primera vez, elegir modelo.
    setTimeout(() => { if (st.screen === 'splash') salirBienvenida(); }, 9000);
  }

  /* ── Bienvenida → landing (sin sesión) o la app (cuenta de Juan) ── */
  let esperaSalida = null;
  function salirBienvenida() {
    if (st.sesion === 'esperando') {
      // Todavía no se sabe si hay sesión: se espera, sin salir de la bienvenida.
      if (!esperaSalida) esperaSalida = setInterval(() => { if (st.sesion !== 'esperando') { clearInterval(esperaSalida); esperaSalida = null; salirBienvenida(); } }, 200);
      return;
    }
    if (st.sesion === 'fuera') { ir('landing'); return; }
    // Guardar la frase del día para la próxima bienvenida, por si el devocional tarda en cargar.
    const f = g(() => getDevoHoy().frase, '');
    if (f) setPref('stars_rd_frase', f);
    ir(st.exp ? pantallaInicial() : 'elegir');
  }
  function sesion(s, desdeLanding) {
    st.sesion = s;
    if (desdeLanding && st.screen !== 'splash') ir(st.exp ? pantallaInicial() : 'elegir');
    else pintar();
  }
  function detener() { clearInterval(tick); clearInterval(esperaSalida); render = function () {}; }

  window.STARS_VISTA = { montar: montar, pintar: pintar, estado: st, ir: ir, sesion: sesion, detener: detener };
})();
