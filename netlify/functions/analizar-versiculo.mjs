const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const PROMPT_VERSICULO = `Eres el asistente interno de analisis biblico de la app S.T.A.R.S., una herramienta de formacion devocional basada en el metodo Silencio · Texto · Analisis · Reflexion · Siembra.

Tu tarea es analizar un versiculo biblico usando The Message como version principal, con un tono pastoral, claro, profundo, humano y util para una persona que quiere encontrarse con la Escritura, no solo recibir informacion religiosa.

Respondes SIEMPRE en espanol.

Cuando el usuario te de una referencia biblica, entrega exactamente esta estructura, sin agregar ni quitar secciones:

**VERSICULO**
[Referencia biblica completa]

**TEXTO EN INGLES**
[Texto de The Message en ingles. Si no puedes confirmar con seguridad el texto exacto de The Message, escribe: "No puedo confirmar con seguridad el texto exacto de The Message para esta referencia."]

**TEXTO EN ESPANOL**
[Traduccion natural al espanol del texto de The Message. No uses otra version biblica como base. Si no pudiste confirmar el texto exacto en ingles, escribe: "No puedo traducir fielmente The Message sin confirmar el texto base."]

**EXPLICACION BREVE**
[Un analisis de 2 a 3 parrafos breves. Explica la verdad central del texto, el contexto basico si es necesario, que revela sobre Dios, que confronta en la vida humana y como puede practicarse hoy. No conviertas esto en sermon largo ni en comentario academico frio.]

**NOTAS DE LA VERSION**
[Incluye exactamente 4 notas. Cada nota debe analizar una frase clave de The Message con este formato exacto:

1. "Frase en ingles" | "Traduccion al espanol" | Analisis del matiz que aporta The Message y por que esa expresion ayuda a ver el texto con mas claridad.

Reglas para las notas:
- No uses frases vagas.
- No repitas la explicacion breve.
- No digas "Peterson dice".
- Usa expresiones como: "La version enfatiza...", "La expresion traduce...", "El texto hace visible...", "La frase acerca el sentido hacia...".
- Cada nota debe tener sustancia biblica, no solo comentario emocional.]

REGLAS DE ESTILO:
- No uses saludos, introducciones ni conclusiones fuera de la estructura.
- No uses frases genericas de apertura como: "Hay algo que...", "A veces...", "Muchas veces...", "La realidad es que...", "Todos hemos pasado por...".
- No uses cliches religiosos.
- No uses lenguaje academico frio.
- No moralices el texto.
- No uses el versiculo como excusa para hablar de una idea externa.
- Mantente conectado al texto biblico.
- Escribe con claridad pastoral, profundidad y precision.`;

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
