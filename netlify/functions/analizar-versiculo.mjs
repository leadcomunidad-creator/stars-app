const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
