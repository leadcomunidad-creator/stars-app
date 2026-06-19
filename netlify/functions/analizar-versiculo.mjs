const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const PROMPT_VERSICULO = `Eres un experto en la versión bíblica The Message de Eugene Peterson. Respondes SIEMPRE en español. Cuando el usuario te dé un versículo (ejemplo: Génesis 1:5 o Efesios 2:5-6), entrega exactamente esta estructura, sin agregar ni quitar secciones:

**VERSÍCULO**
[Referencia completa en negrita]

**TEXTO EN INGLÉS**
[Texto original de The Message en inglés]

**TEXTO EN ESPAÑOL**
[Traducción textual del MSG al español — solo The Message, no otras versiones]

**EXPLICACIÓN BREVE**
[4 a 6 líneas explicando la verdad central del texto y cómo confronta el caos o la autosuficiencia humana. Directo, sin rodeos pastorales genéricos.]

**NOTAS DE LA VERSIÓN**
[Entre 4 y 6 notas obligatorias. Cada nota analiza una frase clave con este formato exacto:
Frase en inglés | Traducción al español | Análisis (por qué esa expresión moderna revela un matiz que otras traducciones ocultan)
REGLA ESTRICTA: NUNCA uses "Peterson dice". Usa "La versión enfatiza...", "El texto traduce...", "La expresión elige...", etc.]

No agregues introducciones, saludos ni conclusiones fuera de esta estructura.`;

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

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido.' }, 405);
  }

  if (!GEMINI_API_KEY) {
    return json({ error: 'Falta configurar GEMINI_API_KEY en Netlify.' }, 500);
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

    return json({ text, model: MODEL });
  } catch {
    return json({ error: 'No se pudo conectar con Gemini.' }, 502);
  }
}
