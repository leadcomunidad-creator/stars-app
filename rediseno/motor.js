/* S · T · A · R · S · Rediseño — motor de plantillas
   Dibuja rediseno/plantilla.html (el marcado aprobado del prototipo) con datos reales.
   Entiende lo mismo que el prototipo: {{ ruta }}, <sc-if value>, <sc-for list as> y onClick.
   Al volver a dibujar, actualiza el DOM existente en lugar de reemplazarlo, para no perder
   el desplazamiento, el foco ni lo que la persona está escribiendo. */
(function () {
  'use strict';

  const RUTA = /\{\{\s*([A-Za-z_$][\w$]*(?:\.[\w$]+)*)\s*\}\}/g;
  const SOLO_RUTA = /^\s*\{\{\s*([A-Za-z_$][\w$]*(?:\.[\w$]+)*)\s*\}\}\s*$/;
  const IGNORAR = { 'hint-placeholder-val': 1, 'hint-placeholder-count': 1 };

  function leer(scope, ruta) {
    const partes = ruta.split('.');
    let v = scope[partes[0]];
    for (let i = 1; i < partes.length; i += 1) {
      if (v === null || v === undefined) return undefined;
      v = v[partes[i]];
    }
    return v;
  }

  function texto(valor) {
    if (valor === null || valor === undefined || valor === false) return '';
    return String(valor);
  }

  function interpolar(cadena, scope) {
    return cadena.replace(RUTA, (_, ruta) => texto(leer(scope, ruta)));
  }

  function valorUnico(cadena, scope) {
    const m = SOLO_RUTA.exec(cadena || '');
    return m ? leer(scope, m[1]) : undefined;
  }

  function dibujarHijos(nodo, scope, destino) {
    for (let h = nodo.firstChild; h; h = h.nextSibling) dibujar(h, scope, destino);
  }

  function dibujar(nodo, scope, destino) {
    if (nodo.nodeType === 3) {
      destino.appendChild(document.createTextNode(interpolar(nodo.nodeValue, scope)));
      return;
    }
    if (nodo.nodeType !== 1) return;
    const tag = nodo.localName;
    if (tag === 'sc-if') {
      if (valorUnico(nodo.getAttribute('value'), scope)) dibujarHijos(nodo, scope, destino);
      return;
    }
    if (tag === 'sc-for') {
      const lista = valorUnico(nodo.getAttribute('list'), scope);
      const como = nodo.getAttribute('as') || 'item';
      if (!lista || !lista.length) return;
      for (let i = 0; i < lista.length; i += 1) {
        const sub = Object.create(scope);
        sub[como] = lista[i];
        dibujarHijos(nodo, sub, destino);
      }
      return;
    }
    const ns = nodo.namespaceURI;
    const el = ns && ns !== 'http://www.w3.org/1999/xhtml'
      ? document.createElementNS(ns, nodo.tagName)
      : document.createElement(tag);
    let ref = null;
    for (const a of Array.from(nodo.attributes)) {
      const nombre = a.name;
      if (IGNORAR[nombre]) continue;
      if (nombre === 'ref') { ref = valorUnico(a.value, scope); continue; }
      if (nombre.length > 2 && nombre.slice(0, 2) === 'on') {
        const fn = valorUnico(a.value, scope);
        if (typeof fn === 'function') {
          el.__on = el.__on || {};
          el.__on[nombre.slice(2)] = fn;
        }
        continue;
      }
      el.setAttribute(nombre, interpolar(a.value, scope));
    }
    dibujarHijos(nodo, scope, el);
    if (tag === 'textarea') el.value = el.textContent;
    destino.appendChild(el);
    if (typeof ref === 'function') el.__ref = ref;
  }

  /* ── Actualizar el DOM real a partir del DOM nuevo ── */
  function mismoNodo(a, b) {
    if (a.nodeType !== b.nodeType) return false;
    if (a.nodeType === 1) return a.namespaceURI === b.namespaceURI && a.localName === b.localName;
    return true;
  }

  function sincronizarAtributos(viejo, nuevo) {
    for (const a of Array.from(viejo.attributes)) {
      if (!nuevo.hasAttribute(a.name)) viejo.removeAttribute(a.name);
    }
    for (const a of Array.from(nuevo.attributes)) {
      if (viejo.getAttribute(a.name) !== a.value) viejo.setAttribute(a.name, a.value);
    }
    viejo.__on = nuevo.__on;
    viejo.__ref = nuevo.__ref;
    // Lo que la persona escribe no se pisa: solo se fija el valor si el campo no está en uso.
    if ((viejo.localName === 'input' || viejo.localName === 'textarea') && document.activeElement !== viejo) {
      if (viejo.dataset.vivo !== '1') {
        const v = nuevo.localName === 'textarea' ? nuevo.value : (nuevo.getAttribute('value') || '');
        if (viejo.value !== v) viejo.value = v;
      }
    }
  }

  function morph(viejo, nuevo) {
    if (viejo.nodeType === 3 || viejo.nodeType === 8) {
      if (viejo.nodeValue !== nuevo.nodeValue) viejo.nodeValue = nuevo.nodeValue;
      return;
    }
    sincronizarAtributos(viejo, nuevo);
    // Contenido que arma otra función (p. ej. el análisis por versículo): no se toca.
    if (viejo.nodeType === 1 && viejo.hasAttribute('data-rd-html')) return;
    morphHijos(viejo, nuevo);
  }

  function morphHijos(viejo, nuevo) {
    let a = viejo.firstChild;
    let b = nuevo.firstChild;
    while (b) {
      const sigB = b.nextSibling;
      if (!a) {
        viejo.appendChild(b);
      } else if (mismoNodo(a, b)) {
        morph(a, b);
        a = a.nextSibling;
      } else {
        const sigA = a.nextSibling;
        viejo.replaceChild(b, a);
        a = sigA;
      }
      b = sigB;
    }
    while (a) {
      const sigA = a.nextSibling;
      viejo.removeChild(a);
      a = sigA;
    }
  }

  function llamarRefs(raiz) {
    if (raiz.__ref) raiz.__ref(raiz);
    raiz.querySelectorAll('*').forEach((el) => { if (el.__ref) el.__ref(el); });
  }

  /* ── API ── */
  function crear(plantillaHtml, contenedor) {
    const tpl = document.createElement('template');
    tpl.innerHTML = plantillaHtml.trim();
    const fuente = tpl.content;
    let primera = true;

    contenedor.addEventListener('click', (e) => {
      let el = e.target;
      while (el && el !== contenedor) {
        if (el.__on && typeof el.__on.click === 'function') {
          el.__on.click(e);
          return;
        }
        el = el.parentNode;
      }
    });

    // Lo que la persona escribe manda: desde que escribe, el campo ya no se vuelve a llenar solo.
    contenedor.addEventListener('input', (e) => {
      const t = e.target;
      if (t && (t.localName === 'input' || t.localName === 'textarea')) t.dataset.vivo = '1';
    });

    return function render(valores) {
      const frag = document.createDocumentFragment();
      dibujarHijos(fuente, valores, frag);
      if (primera) {
        contenedor.appendChild(frag);
        primera = false;
      } else {
        const tmp = document.createElement('div');
        tmp.appendChild(frag);
        morphHijos(contenedor, tmp);
      }
      llamarRefs(contenedor);
    };
  }

  window.STARS_MOTOR = { crear: crear };
})();
