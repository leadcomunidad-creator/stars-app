import { createHash, randomInt } from 'node:crypto';
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

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function configurationError(message) {
  return requestError(message, 503);
}

function adminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw configurationError('El informe administrativo aún no está configurado en el servidor.');
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw configurationError('La credencial administrativa de Firebase no tiene un formato válido.');
  }
  return initializeApp({ credential: cert(serviceAccount) });
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
  if (decoded.uid !== allowedUid) throw requestError('Tu cuenta no está autorizada para consultar rachas.', 403);
  return { app, adminUid: decoded.uid, adminEmail: decoded.email || '' };
}

function colombiaCurrentMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date());
  const value = type => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}`;
}

function cleanMonth(value) {
  const month = String(value || '').trim();
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) throw requestError('Elige un mes válido.');
  if (month >= colombiaCurrentMonth()) throw requestError('El informe solo está disponible para meses ya cerrados.');
  return month;
}

function daysForMonth(month) {
  const [year, numericMonth] = month.split('-').map(Number);
  const total = new Date(Date.UTC(year, numericMonth, 0)).getUTCDate();
  return Array.from({ length: total }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
}

function allStepsComplete(data, date) {
  const steps = data[`pasos_${date}`];
  return [0, 1, 2, 3, 4].every(step => steps?.[step] === '1');
}

function completeMonth(data, dates) {
  return dates.every(date => allStepsComplete(data, date) && !data.racha_invalidos?.[date]);
}

function administrativeDates(data, dates) {
  const overrides = data.racha_excepciones_admin || {};
  return dates.filter(date => Boolean(overrides[date]));
}

async function usersByUid(auth, uids) {
  const result = new Map();
  for (let index = 0; index < uids.length; index += 100) {
    const chunk = uids.slice(index, index + 100).map(uid => ({ uid }));
    const response = await auth.getUsers(chunk);
    response.users.forEach(user => result.set(user.uid, user));
  }
  return result;
}

async function buildReport(app, month) {
  const db = getFirestore(app);
  const dates = daysForMonth(month);
  const snapshot = await db.collection('usuarios').get();
  const qualifying = snapshot.docs
    .map(doc => ({ uid: doc.id, data: doc.data() || {} }))
    .filter(person => completeMonth(person.data, dates));
  const authUsers = await usersByUid(getAuth(app), qualifying.map(person => person.uid));
  const participants = qualifying.map(person => {
    const authUser = authUsers.get(person.uid);
    return {
      uid: person.uid,
      nombre: authUser?.displayName || String(person.data.nombre || person.data.name || '').trim() || '',
      email: authUser?.email || String(person.data.email || '').trim() || '',
      diasAdministrados: administrativeDates(person.data, dates)
    };
  }).sort((a, b) => (a.email || a.uid).localeCompare(b.email || b.uid, 'es'));
  const draw = await db.collection('sorteos_mensuales').doc(month).get();
  return {
    mes: month,
    diasMes: dates.length,
    cuentasConDatos: snapshot.size,
    completaronMes: participants.length,
    participantes: participants,
    sorteo: draw.exists ? draw.data() : null
  };
}

function participantHash(participants) {
  const identifiers = participants.map(person => person.uid).sort().join('|');
  return createHash('sha256').update(identifiers).digest('hex');
}

function chooseWinners(participants, count) {
  const pool = [...participants];
  for (let index = 0; index < count; index += 1) {
    const selected = randomInt(index, pool.length);
    [pool[index], pool[selected]] = [pool[selected], pool[index]];
  }
  return pool.slice(0, count).map(person => ({
    uid: person.uid,
    nombre: person.nombre || null,
    email: person.email || null
  }));
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
    if (!['reporte', 'sortear'].includes(action)) throw requestError('Acción no permitida.');
    const month = cleanMonth(body?.mes);
    const admin = await requireAdmin(req);
    const report = await buildReport(admin.app, month);

    if (action === 'reporte') return json({ reporte: report });
    if (body?.confirmacion !== 'SORTEAR') throw requestError('Confirma explícitamente el sorteo antes de cerrarlo.');
    if (!report.participantes.length) throw requestError('No hay personas elegibles para sortear este mes.');
    const count = Number.parseInt(body?.cantidad, 10);
    if (!Number.isInteger(count) || count < 1 || count > 20 || count > report.participantes.length) {
      throw requestError('La cantidad de ganadores no es válida.');
    }

    const db = getFirestore(admin.app);
    const drawRef = db.collection('sorteos_mensuales').doc(month);
    const auditRef = db.collection('auditoria_sorteos').doc();
    const draw = {
      mes: month,
      diasMes: report.diasMes,
      cerradoEn: Date.now(),
      cerradoPor: { uid: admin.adminUid, email: admin.adminEmail },
      participantes: report.participantes.length,
      participantesHash: participantHash(report.participantes),
      metodo: 'seleccion_aleatoria_segura_sin_repeticion',
      ganadores: chooseWinners(report.participantes, count)
    };
    const result = await db.runTransaction(async transaction => {
      const existing = await transaction.get(drawRef);
      if (existing.exists) return { creado: false, sorteo: existing.data() };
      transaction.set(drawRef, draw);
      transaction.set(auditRef, { tipo: 'sorteo_mensual_racha', ...draw });
      return { creado: true, sorteo: draw };
    });

    return json({
      creado: result.creado,
      reporte: { ...report, sorteo: result.sorteo }
    });
  } catch (error) {
    console.error('reporte-racha-mensual', error);
    return json({ error: error?.message || 'No se pudo procesar el informe.' }, error?.status || 500);
  }
}
