import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function configurationError(message) {
  const error = new Error(message);
  error.status = 503;
  return error;
}

function adminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw configurationError('La restauración administrativa aún no está configurada en el servidor.');
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw configurationError('La credencial administrativa de Firebase no tiene un formato válido.');
  }
  return initializeApp({ credential: cert(serviceAccount) });
}

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw requestError('Ingresa un correo válido.');
  return email;
}

function cleanDate(value) {
  const date = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw requestError('Ingresa una fecha válida.');
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw requestError('Ingresa una fecha válida.');
  }
  return date;
}

function allStepsComplete(data, date) {
  const steps = data[`pasos_${date}`];
  return [0, 1, 2, 3, 4].every(step => steps?.[step] === '1');
}

async function requireAdmin(req) {
  const authorization = req.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) throw requestError('La solicitud no tiene una sesión autenticada.', 401);

  const app = adminApp();
  let decoded;
  try {
    decoded = await getAuth(app).verifyIdToken(token);
  } catch {
    throw requestError('La sesión no pudo verificarse. Inicia sesión nuevamente.', 401);
  }

  const allowedUid = String(process.env.STARS_RACHA_ADMIN_UID || '').trim();
  if (!allowedUid) throw configurationError('Falta definir la cuenta administradora en el servidor.');
  if (decoded.uid !== allowedUid) throw requestError('Tu cuenta no está autorizada para corregir rachas.', 403);
  return { app, adminUid: decoded.uid, adminEmail: decoded.email || '' };
}

function createCase({ user, data, date }) {
  const invalidated = Boolean(data.racha_invalidos?.[date]);
  const completed = allStepsComplete(data, date);
  const restored = Boolean(data.racha_restaurados?.[date]);
  let message = 'El día aún no estaba completo.';
  if (completed && invalidated) message = 'El día estaba completo, pero marcado como inválido.';
  else if (completed && restored) message = 'El día ya figuraba como restaurado con estrella.';
  else if (completed) message = 'El día ya contaba como completo.';
  return { fecha: date, completado: completed, invalido: invalidated, restaurado: restored, elegible: true, mensaje: message };
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      throw requestError('La solicitud no tiene un formato válido.');
    }
    const action = String(body?.action || '');
    if (!['revisar', 'restaurar'].includes(action)) throw requestError('Acción no permitida.');
    const email = cleanEmail(body?.email);
    const date = cleanDate(body?.fecha);
    const admin = await requireAdmin(req);
    const auth = getAuth(admin.app);
    const target = await auth.getUserByEmail(email).catch(() => null);
    if (!target) throw requestError('No existe una cuenta registrada con ese correo.', 404);

    const db = getFirestore(admin.app);
    const userRef = db.collection('usuarios').doc(target.uid);
    const snapshot = await userRef.get();
    if (!snapshot.exists) throw requestError('La cuenta no tiene datos de S.T.A.R.S. para revisar.', 404);
    const current = snapshot.data() || {};
    const casePreview = createCase({ user: target, data: current, date });

    if (action === 'revisar') {
      return json({
        persona: { email: target.email || email, uid: target.uid },
        caso: casePreview
      });
    }

    if (body?.confirmacion !== 'RESTAURAR') throw requestError('Confirma explícitamente la corrección antes de aplicarla.');
    const reason = String(body?.motivo || '').trim();
    if (reason.length > 500) throw requestError('La nota no puede superar 500 caracteres.');

    const auditRef = db.collection('auditoria_racha').doc();
    const now = Date.now();
    await db.runTransaction(async transaction => {
      const freshSnapshot = await transaction.get(userRef);
      if (!freshSnapshot.exists) throw requestError('La cuenta dejó de estar disponible.', 404);
      const fresh = freshSnapshot.data() || {};
      const invalid = { ...(fresh.racha_invalidos || {}) };
      delete invalid[date];
      const restored = { ...(fresh.racha_restaurados || {}) };
      delete restored[date];
      const steps = { ...(fresh[`pasos_${date}`] || {}) };
      [0, 1, 2, 3, 4].forEach(step => { steps[step] = '1'; });
      const reviews = { ...(fresh.racha_revisiones || {}) };
      reviews[date] = {
        revisadoEn: now,
        motivo: 'restauracion_administrativa_excepcional',
        auditoriaId: auditRef.id
      };
      const overrides = { ...(fresh.racha_excepciones_admin || {}) };
      overrides[date] = { restauradoEn: now, auditoriaId: auditRef.id, administradorUid: admin.adminUid };

      transaction.set(userRef, {
        [`pasos_${date}`]: steps,
        racha_invalidos: invalid,
        racha_restaurados: restored,
        racha_revisiones: reviews,
        racha_excepciones_admin: overrides
      }, { merge: true });
      transaction.set(auditRef, {
        tipo: 'correccion_racha_excepcional',
        fechaAfectada: date,
        nota: reason || null,
        administradoEn: now,
        administrador: { uid: admin.adminUid, email: admin.adminEmail },
        persona: { uid: target.uid, email: target.email || email },
        antes: {
          invalido: Boolean(fresh.racha_invalidos?.[date]),
          restauradoConEstrella: Boolean(fresh.racha_restaurados?.[date]),
          completado: allStepsComplete(fresh, date)
        },
        despues: { invalido: false, restauradoConEstrella: false, completado: true }
      });
    });

    return json({ ok: true, auditoriaId: auditRef.id, fecha: date });
  } catch (error) {
    console.error('restaurar-racha-excepcional', error);
    return json({ error: error?.message || 'No se pudo procesar la corrección.' }, error?.status || 500);
  }
}
