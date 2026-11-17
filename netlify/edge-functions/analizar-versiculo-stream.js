// Estudio por Versículo — Edge Function con streaming.
//
// Por qué existe: la función clásica (/.netlify/functions/analizar-versiculo)
// espera la respuesta completa de Gemini y Netlify la corta por tiempo cuando
// el análisis tarda. Aquí la respuesta se envía de inmediato y el texto llega
// por partes, así que la duración del análisis ya no provoca el corte.
//
// Protocolo con la app: el cuerpo es texto plano con el análisis. Si algo falla
// a mitad del camino se envía una línea final que empieza con ERROR_MARK.

import { PROMPT_VERSICULO } from '../shared/prompt-versiculo.mjs';

const ERROR_MARK = '\n[[STARS_ERROR]]';

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  const apiKey = Netlify.env.get('GEMINI_API_KEY');
  const model = Netlify.env.get('GEMINI_MODEL') || 'gemini-3.1-flash-lite';
  if (!apiKey) return json({ error: 'Falta configurar GEMINI_API_KEY en Netlify.' }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const ref = String(body?.ref || '').replace(/\s+/g, ' ').trim();
  if (!ref || ref.length > 80) return json({ error: 'Escribe una referencia bíblica válida.' }, 400);

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (t) => controller.enqueue(encoder.encode(t));
      let wrote = false;
      try {
        const upstream = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: PROMPT_VERSICULO }] },
            contents: [{ role: 'user', parts: [{ text: ref }] }],
            generationConfig: {
              temperature: 0.25,
              // El razonamiento interno también consume este límite: con un
              // tope bajo la respuesta se cortaba antes de terminar las notas.
              maxOutputTokens: 16000,
              thinkingConfig: { thinkingLevel: 'high' }
            }
          })
        });

        if (!upstream.ok || !upstream.body) {
          let msg = 'Gemini no pudo generar el análisis.';
          try { msg = (await upstream.json())?.error?.message || msg; } catch {}
          send(ERROR_MARK + msg);
          return;
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finishReason = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl;
          while ((nl = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            let chunk;
            try { chunk = JSON.parse(payload); } catch { continue; }
            const cand = chunk?.candidates?.[0];
            if (cand?.finishReason) finishReason = cand.finishReason;
            for (const part of cand?.content?.parts || []) {
              if (part.thought) continue; // nunca enviar el razonamiento interno
              if (part.text) { send(part.text); wrote = true; }
            }
          }
        }

        if (!wrote) {
          send(ERROR_MARK + 'Gemini respondió sin texto. Intenta de nuevo.');
        } else if (finishReason === 'MAX_TOKENS') {
          send(ERROR_MARK + 'El análisis quedó incompleto. Intenta de nuevo.');
        }
      } catch {
        send(ERROR_MARK + (wrote ? 'Se interrumpió la conexión con Gemini.' : 'No se pudo conectar con Gemini.'));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
};

export const config = { path: '/api/analizar-versiculo' };
