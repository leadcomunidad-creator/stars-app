import { PROMPT_VERSICULO } from '../shared/prompt-versiculo.mjs';
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;


const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function limpiarReferencia(ref) {
  return String(ref || '').replace(/\s+/g, ' ').trim();
}

function normalizarTitulo(titulo) {
  return String(titulo || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function validarRespuesta(text) {
  const requeridas = [
    'VERSICULO',
    'TEXTO EN INGLES',
    'TEXTO EN ESPANOL',
    'NBLA',
    'EXPLICACION',
    'NOTAS DE LA VERSION'
  ];
  const encontradas = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const titulo = normalizarTitulo(match[1]);
    if (requeridas.includes(titulo)) {
      encontradas.push({ titulo, inicio: regex.lastIndex, encabezado: match.index });
    }
  }

  if (encontradas.length !== requeridas.length) {
    return 'La respuesta no contiene exactamente las seis secciones obligatorias.';
  }
  if (encontradas.some((sec, i) => sec.titulo !== requeridas[i])) {
    return 'Las secciones no llegaron en el orden obligatorio.';
  }

  for (let i = 0; i < encontradas.length; i += 1) {
    const fin = encontradas[i + 1]?.encabezado ?? text.length;
    encontradas[i].contenido = text.slice(encontradas[i].inicio, fin).trim();
    if (!encontradas[i].contenido) {
      return `La sección ${encontradas[i].titulo} llegó vacía.`;
    }
  }

  const notas = encontradas.find(sec => sec.titulo === 'NOTAS DE LA VERSION').contenido;
  if (notas === 'No se generan notas hasta corregir la referencia bíblica.') {
    return null;
  }
  const lineas = notas.split('\n').map(linea => linea.trim()).filter(Boolean);
  if (lineas.length < 3 || lineas.length > 5) {
    return 'La respuesta debe contener entre tres y cinco notas exegéticas.';
  }
  const camposNotas = lineas.map(linea => linea.split('|').map(campo => campo.trim()));
  if (camposNotas.some(campos => campos.length !== 5)) {
    return 'Cada nota debe contener exactamente cinco campos separados por cuatro barras verticales.';
  }
  if (camposNotas.some(campos => campos[4].split(/\s+/).filter(Boolean).length < 60)) {
    return 'Cada nota debe incluir un comentario exegético y teológico sustancial de al menos sesenta palabras.';
  }
  return null;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Metodo no permitido.' }, 405);
  }

  if (!GEMINI_API_KEY) {
    return json({ error: 'Falta configurar GEMINI_API_KEY en Netlify.' }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Solicitud invalida.' }, 400);
  }

  const ref = limpiarReferencia(body.ref);
  if (!ref || ref.length > 80) {
    return json({ error: 'Escribe una referencia biblica valida.' }, 400);
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;

  try {
    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: PROMPT_VERSICULO }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: ref }]
          }
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 16000,
          thinkingConfig: {
            thinkingLevel: 'high'
          }
        }
      })
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const message = data?.error?.message || 'Gemini no pudo generar el analisis.';
      return json({ error: message }, geminiRes.status);
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim();

    if (!text) {
      return json({ error: 'Gemini respondio sin texto.' }, 502);
    }

    const errorValidacion = validarRespuesta(text);
    if (errorValidacion) {
      return json({ error: errorValidacion }, 502);
    }

    return json({ text, model: MODEL });
  } catch {
    return json({ error: 'No se pudo conectar con Gemini.' }, 502);
  }
}
