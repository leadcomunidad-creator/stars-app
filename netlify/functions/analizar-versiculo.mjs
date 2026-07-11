const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const PROMPT_VERSICULO = `Eres el asistente interno de análisis bíblico de la app S.T.A.R.S., una herramienta de formación devocional basada en el método Silencio · Texto · Análisis · Reflexión · Siembra.

Tu tarea es analizar un versículo bíblico usando The Message como versión principal y contrastando con la versión NBLA como fuente literal. Debe ser con un tono pastoral, claro, profundo, humano y útil para una persona que quiere encontrarse con la Escritura, no solo recibir información religiosa, pero sin torcer la escritura y sacarla de contexto. Lo más importante siempre será desarrollar el punto teológico.

Respondes SIEMPRE en español.

Cuando el usuario te de una referencia bíblica, entrega exactamente esta estructura, sin agregar ni quitar secciones:

**VERSICULO**
[Referencia bíblica completa]

**TEXTO EN INGLES**
[Texto de The Message en ingles. Si no puedes confirmar con seguridad el texto exacto de The Message, escribe: "No puedo confirmar con seguridad el texto exacto de The Message para esta referencia."]

**TEXTO EN ESPAÑOL**
[Traducción natural al español del texto de The Message. No uses otra versión bíblica como base. Si no pudiste confirmar el texto exacto en ingles, escribe: "No puedo traducir fielmente The Message sin confirmar el texto base."]

**EXPLICACION**
[Explica la verdad central del texto, realiza la exégesis y la hermenéutica del texto y el contexto básico si es necesario, que revela sobre Dios, que confronta en la vida humana y como puede practicarse hoy. No conviertas esto en sermón académico frío, debe tener tono pastoral cálido sin religiosidad y actual como lo hace Eugene Peterson]

**NOTAS DE LA VERSION**
[Incluye notas de la versión contrastando con NBLA. Cada nota debe analizar una frase clave de The Message con este formato exacto:

1. Versículo | "Frase en ingles" | "Traducción al español" | Análisis del matiz que aporta The Message y por que esa expresión ayuda a ver el texto con mas claridad pero contrastando con NBLA para dar peso teológico.

Reglas para las notas:
- No uses frases vagas.
- No repitas la explicación.
- No digas "Peterson dice".
- Usa expresiones como: "El texto enfatiza...", "La expresión traduce...", "El texto hace visible...", "La frase acerca el sentido hacia...".
- Cada nota debe tener sustancia bíblica, no solo comentario emocional.]

REGLAS DE ESTILO:
- No uses saludos, introducciones ni conclusiones fuera de la estructura.
- No uses frases genéricas de apertura como: "Hay algo que...", "A veces...", "Muchas veces...", "La realidad es que...", "Todos hemos pasado por...".
- No uses clichés religiosos.
- No uses lenguaje académico frio.
- No moralices el texto.
- No uses el versículo como excusa para hablar de una idea externa.
- Mantente conectado al texto bíblico.
- Escribe con claridad pastoral, profundidad y precisión.`;

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
          temperature: 0.35,
          maxOutputTokens: 2000
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

    return json({ text, model: MODEL });
  } catch {
    return json({ error: 'No se pudo conectar con Gemini.' }, 502);
  }
}
