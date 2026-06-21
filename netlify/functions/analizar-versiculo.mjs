const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyAqS3sMT0tsOm2G5eINckrLGA-1Qj4u6Y8';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'stars-plus';
const AI_DAILY_LIMIT = Number.parseInt(process.env.AI_DAILY_LIMIT || '20', 10);
const AI_MINUTE_LIMIT = Number.parseInt(process.env.AI_MINUTE_LIMIT || '5', 10);
const AI_LIMIT_TIMEZONE = process.env.AI_LIMIT_TIMEZONE || 'America/Bogota';

const PROMPT_VERSICULO = `Eres un asistente especializado en estudio bíblico, con enfoque en la versión The Message de Eugene Peterson. Respondes siempre en español, con tono claro, profundo, sobrio y pastoral, sin frases genéricas.

Cuando el usuario escriba una referencia bíblica, analiza el versículo solicitado y entrega exactamente esta estructura:

**VERSÍCULO**
[Referencia bíblica normalizada]

**TEXTO BASE**
[No muestres el texto en inglés. Presenta únicamente la traducción del texto de The Message en español, en forma de traducción/paráfrasis fiel. Si no tienes certeza del texto exacto de The Message, indica: “No puedo confirmar el texto exacto de The Message” y continúa con el análisis basado en la referencia.]

**SENTIDO CENTRAL**
[Explica en 3 a 5 líneas cuál es la verdad principal del versículo.]

**EXPLICACIÓN BREVE**
[Explica en 1 párrafo cómo este versículo revela el carácter de Dios, confronta la autosuficiencia humana, corrige una mentalidad equivocada o afirma una verdad del Reino. Usa un lenguaje fresco y coloquial sin perder profundidad. Debe ser agradable de leer y fácil de entender para cualquier persona.]

**NOTAS DE LA VERSIÓN**
[Entrega entre 4 y 5 notas sustanciosas, pero no largas. Cada nota debe analizar una frase clave de The Message con profundidad moderada.

Cada nota debe seguir exactamente este formato:
Frase en inglés | Sentido en español | Análisis

En el análisis de cada nota incluye:
1. Qué matiz específico aporta esa expresión moderna.
2. Qué corrige o ilumina frente a una lectura superficial del versículo.
3. Qué verdad espiritual, teológica o formativa queda más clara.

Cada análisis debe tener entre 2 y 3 frases. Evita frases obvias como “la versión enfatiza la importancia de...”. No repitas ideas entre notas. No conviertas las notas en un estudio largo.]

**PARA MEDITAR**
[Una pregunta breve, directa y profunda para reflexión personal.]

Reglas:
- No inventes citas textuales si no tienes certeza.
- No uses relleno religioso.
- No uses “Peterson dice”.
- Usa frases como: “La versión enfatiza…”, “La expresión resalta…”, “El lenguaje contemporáneo ayuda a ver…”.
- No agregues introducción ni conclusión fuera de la estructura.
- Usa un lenguaje fresco y coloquial sin perder profundidad. Debe ser agradable de leer y fácil de entender para cualquier persona.
- En “Notas de la versión”, evita comentarios simples o decorativos. Cada nota debe revelar un matiz real del lenguaje de The Message.
- No expliques solo qué significa la frase; explica qué abre, qué corrige o qué revela.`;

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

async function validarUsuario(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;

  let res;
  try {
    res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;
  const data = await res.json();
  const user = data?.users?.[0] || null;
  return user ? { user, token } : null;
}

function partesFechaZona(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: AI_LIMIT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    day: `${parts.year}${parts.month}${parts.day}`,
    minute: `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}`
  };
}

function firestoreNumber(fields, name) {
  const value = fields?.[name];
  if (!value) return 0;
  return Number(value.integerValue ?? value.doubleValue ?? 0) || 0;
}

async function verificarCupoIA(authData) {
  const uid = authData.user.localId;
  if (!uid) return { ok: false, status: 401, error: 'No se pudo validar el usuario.' };

  const now = new Date();
  const stamp = partesFechaZona(now);
  const dailyField = `iaUso_${stamp.day}`;
  const minuteField = `iaUsoMin_${stamp.minute}`;
  const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/(default)/documents/usuarios/${encodeURIComponent(uid)}`;
  const headers = {
    Authorization: `Bearer ${authData.token}`,
    'Content-Type': 'application/json'
  };

  let fields = {};
  try {
    const readRes = await fetch(docUrl, { headers });
    if (readRes.ok) {
      const data = await readRes.json();
      fields = data.fields || {};
    } else if (readRes.status !== 404) {
      return { ok: false, status: 503, error: 'No se pudo validar tu cupo de análisis.' };
    }
  } catch {
    return { ok: false, status: 503, error: 'No se pudo validar tu cupo de análisis.' };
  }

  const dailyCount = firestoreNumber(fields, dailyField);
  const minuteCount = firestoreNumber(fields, minuteField);

  if (dailyCount >= AI_DAILY_LIMIT) {
    return {
      ok: false,
      status: 429,
      error: `Llegaste al límite diario de ${AI_DAILY_LIMIT} análisis. Intenta mañana.`
    };
  }

  if (minuteCount >= AI_MINUTE_LIMIT) {
    return {
      ok: false,
      status: 429,
      error: 'Estás haciendo solicitudes muy rápido. Espera un minuto e intenta de nuevo.'
    };
  }

  const updateUrl = `${docUrl}?updateMask.fieldPaths=${dailyField}&updateMask.fieldPaths=${minuteField}&updateMask.fieldPaths=iaUsoUltima`;
  const updateBody = {
    fields: {
      [dailyField]: { integerValue: String(dailyCount + 1) },
      [minuteField]: { integerValue: String(minuteCount + 1) },
      iaUsoUltima: { timestampValue: now.toISOString() }
    }
  };

  try {
    const writeRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updateBody)
    });

    if (!writeRes.ok) {
      return { ok: false, status: 503, error: 'No se pudo registrar tu uso de IA.' };
    }
  } catch {
    return { ok: false, status: 503, error: 'No se pudo registrar tu uso de IA.' };
  }

  return {
    ok: true,
    dailyRemaining: Math.max(0, AI_DAILY_LIMIT - dailyCount - 1),
    minuteRemaining: Math.max(0, AI_MINUTE_LIMIT - minuteCount - 1)
  };
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido.' }, 405);
  }

  if (!GEMINI_API_KEY) {
    return json({ error: 'Falta configurar GEMINI_API_KEY en Netlify.' }, 500);
  }

  const authData = await validarUsuario(req);
  if (!authData) {
    return json({ error: 'Inicia sesión para usar el análisis de versículos.' }, 401);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }

  const ref = limpiarReferencia(body.ref);
  if (!ref || ref.length > 80) {
    return json({ error: 'Escribe una referencia bíblica válida.' }, 400);
  }

  const cupo = await verificarCupoIA(authData);
  if (!cupo.ok) {
    return json({ error: cupo.error }, cupo.status);
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
          temperature: 0.35,
          maxOutputTokens: 1200
        }
      })
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const message = data?.error?.message || 'Gemini no pudo generar el análisis.';
      return json({ error: message }, geminiRes.status);
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim();

    if (!text) {
      return json({ error: 'Gemini respondió sin texto.' }, 502);
    }

    return json({
      text,
      model: MODEL,
      usage: {
        dailyRemaining: cupo.dailyRemaining,
        minuteRemaining: cupo.minuteRemaining
      }
    });
  } catch {
    return json({ error: 'No se pudo conectar con Gemini.' }, 502);
  }
}
