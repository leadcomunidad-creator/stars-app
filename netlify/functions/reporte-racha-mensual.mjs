import { createHash, randomInt } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

// Rifas de racha.
// - mensual: racha completa en el mes elegido.
// - semestral: racha completa en los 6 meses seguidos que terminan en el mes elegido.
// - anual: racha completa en los 12 meses seguidos que terminan en el mes elegido.
// Quien ya ganó una rifa de un tipo no vuelve a entrar a ese mismo tipo
// (sí puede entrar a los otros). La persona administradora puede dejar fuera
// a quien quiera antes de avisar o sortear; queda registrado.
const TIPOS = {
  mensual:   { meses: 1,  coleccion: 'sorteos_mensuales',   nombre: 'Rifa mensual' },
  semestral: { meses: 6,  coleccion: 'sorteos_semestrales', nombre: 'Rifa de 6 meses' },
  anual:     { meses: 12, coleccion: 'sorteos_anuales',     nombre: 'Rifa anual' }
};
const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

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

function colombiaNowParts() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const value = type => parts.find(part => part.type === type)?.value;
  return {
    month: `${value('year')}-${value('month')}`,
    minute: `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`
  };
}

function cleanTipo(value) {
  const tipo = String(value || 'mensual');
  if (!TIPOS[tipo]) throw requestError('Tipo de rifa no válido.');
  return tipo;
}

function cleanMonth(value) {
  const month = String(value || '').trim();
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) throw requestError('Elige un mes válido.');
  if (month >= colombiaNowParts().month) throw requestError('El informe solo está disponible para meses ya cerrados.');
  return month;
}

function monthsEnding(month, count) {
  const [year, numericMonth] = month.split('-').map(Number);
  const result = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, numericMonth - 1 - offset, 1));
    result.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

function daysForMonth(month) {
  const [year, numericMonth] = month.split('-').map(Number);
  const total = new Date(Date.UTC(year, numericMonth, 0)).getUTCDate();
  return Array.from({ length: total }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
}

function monthLabel(month) {
  const [year, numericMonth] = month.split('-').map(Number);
  return { mes: MESES_ES[numericMonth - 1], anio: year };
}

function periodLabel(months) {
  const first = monthLabel(months[0]);
  const last = monthLabel(months[months.length - 1]);
  if (months.length === 1) return `${last.mes} de ${last.anio}`;
  if (first.anio === last.anio) return `${first.mes} a ${last.mes} de ${last.anio}`;
  return `${first.mes} de ${first.anio} a ${last.mes} de ${last.anio}`;
}

function allStepsComplete(data, date) {
  const steps = data[`pasos_${date}`];
  return [0, 1, 2, 3, 4].every(step => steps?.[step] === '1');
}

function completePeriod(data, dates) {
  return dates.every(date => allStepsComplete(data, date) && (!data.racha_invalidos?.[date] || data.racha_restaurados?.[date]));
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

// uid → periodo (id del documento) en que ya ganó una rifa de este tipo.
async function previousWinners(db, tipo, currentId) {
  const snapshot = await db.collection(TIPOS[tipo].coleccion).get();
  const winners = new Map();
  snapshot.docs.forEach(doc => {
    if (doc.id === currentId) return;
    (doc.data()?.ganadores || []).forEach(winner => {
      if (winner?.uid && !winners.has(winner.uid)) winners.set(winner.uid, doc.id);
    });
  });
  return winners;
}

async function buildReport(app, tipo, month, adminUid) {
  const db = getFirestore(app);
  const months = monthsEnding(month, TIPOS[tipo].meses);
  const dates = months.flatMap(daysForMonth);
  const snapshot = await db.collection('usuarios').get();
  const qualifying = snapshot.docs
    .map(doc => ({ uid: doc.id, data: doc.data() || {} }))
    .filter(person => completePeriod(person.data, dates));
  const authUsers = await usersByUid(getAuth(app), qualifying.map(person => person.uid));
  const winners = await previousWinners(db, tipo, month);
  const [draw, notice] = await Promise.all([
    db.collection(TIPOS[tipo].coleccion).doc(month).get(),
    db.collection('avisos_rifa').doc(`${tipo}_${month}`).get()
  ]);
  const noticeData = notice.exists ? notice.data() : null;
  const noticeKey = `${tipo}_${month}`;
  const participants = qualifying.map(person => {
    const authUser = authUsers.get(person.uid);
    return {
      uid: person.uid,
      nombre: authUser?.displayName || String(person.data.nombre || person.data.name || '').trim() || '',
      email: authUser?.email || String(person.data.email || '').trim() || '',
      diasAdministrados: administrativeDates(person.data, dates),
      ganoAntes: winners.get(person.uid) || null,
      esAdmin: person.uid === adminUid,
      // Estado del aviso vigente: enviado a esta cuenta y si tocó «¡Allí estaré!».
      avisoEnviado: Boolean(noticeData && person.data.avisos_rifa?.[noticeKey]?.id === noticeData.id),
      avisoConfirmado: Boolean(noticeData && person.data.avisos_rifa_vistos?.[noticeData.id])
    };
  }).sort((a, b) => (a.email || a.uid).localeCompare(b.email || b.uid, 'es'));
  return {
    tipo,
    tipoNombre: TIPOS[tipo].nombre,
    mes: month,
    meses: months,
    periodo: periodLabel(months),
    diasMes: dates.length,
    cuentasConDatos: snapshot.size,
    completaronMes: participants.length,
    participantes: participants,
    sorteo: draw.exists ? draw.data() : null,
    aviso: noticeData
  };
}

function cleanExcluded(value, report) {
  if (value === undefined || value === null) return new Set();
  if (!Array.isArray(value) || value.length > 2000) throw requestError('La lista de personas excluidas no es válida.');
  const known = new Set(report.participantes.map(person => person.uid));
  const excluded = new Set();
  value.forEach(uid => {
    const id = String(uid || '');
    if (!known.has(id)) throw requestError('La lista de excluidos contiene una cuenta que no es elegible.');
    excluded.add(id);
  });
  return excluded;
}

function drawPool(report, excluded) {
  return report.participantes.filter(person => !person.ganoAntes && !excluded.has(person.uid));
}

function personSummary(person) {
  return { uid: person.uid, nombre: person.nombre || null, email: person.email || null };
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
  return pool.slice(0, count).map(personSummary);
}

function cleanEvent(value) {
  const fecha = String(value?.fecha || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fecha)) throw requestError('Indica la fecha y la hora de la rifa.');
  if (fecha <= colombiaNowParts().minute) throw requestError('La fecha de la rifa debe ser posterior a este momento.');
  const lugar = String(value?.lugar || '').replace(/\s+/g, ' ').trim();
  if (lugar.length < 3 || lugar.length > 120) throw requestError('Indica el lugar de la rifa (entre 3 y 120 caracteres).');
  return { fecha: `${fecha}:00-05:00`, lugar };
}

function firstName(person) {
  const name = String(person.nombre || '').trim().split(/\s+/)[0] || '';
  return name.slice(0, 40);
}

async function sendNotice(db, admin, report, pool, excluded, event) {
  const key = `${report.tipo}_${report.mes}`;
  const noticeRef = db.collection('avisos_rifa').doc(key);
  const previous = (await noticeRef.get()).data();
  const id = `${key}_${Date.now()}`;
  const poolIds = new Set(pool.map(person => person.uid));
  const removed = (previous?.participantes || []).filter(uid => !poolIds.has(uid));

  const writes = [];
  pool.forEach(person => writes.push({
    ref: db.collection('usuarios').doc(person.uid),
    data: { avisos_rifa: { [key]: {
      id,
      tipo: report.tipo,
      tipoNombre: report.tipoNombre,
      periodo: report.periodo,
      nombre: firstName(person),
      fecha: event.fecha,
      lugar: event.lugar
    } } }
  }));
  removed.forEach(uid => writes.push({
    ref: db.collection('usuarios').doc(uid),
    data: { avisos_rifa: { [key]: FieldValue.delete() } }
  }));
  for (let index = 0; index < writes.length; index += 400) {
    const batch = db.batch();
    writes.slice(index, index + 400).forEach(write => batch.set(write.ref, write.data, { merge: true }));
    await batch.commit();
  }

  const notice = {
    id,
    tipo: report.tipo,
    mes: report.mes,
    periodo: report.periodo,
    fecha: event.fecha,
    lugar: event.lugar,
    enviadoEn: Date.now(),
    enviadoPor: { uid: admin.adminUid, email: admin.adminEmail },
    participantes: pool.map(person => person.uid),
    excluidos: [...excluded],
    retirados: removed
  };
  await noticeRef.set(notice);
  await db.collection('auditoria_sorteos').doc().set({ ...notice, tipo: 'aviso_rifa_racha', tipoRifa: notice.tipo });
  return notice;
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
    if (!['reporte', 'sortear', 'avisar'].includes(action)) throw requestError('Acción no permitida.');
    const tipo = cleanTipo(body?.tipo);
    const month = cleanMonth(body?.mes);
    const admin = await requireAdmin(req);
    const report = await buildReport(admin.app, tipo, month, admin.adminUid);

    if (action === 'reporte') return json({ reporte: report });

    const excluded = cleanExcluded(body?.excluidos, report);
    const pool = drawPool(report, excluded);
    const db = getFirestore(admin.app);

    if (action === 'avisar') {
      if (report.sorteo) throw requestError('Esta rifa ya se sorteó; no se pueden enviar más avisos.');
      if (!pool.length) throw requestError('No queda ninguna persona para avisar.');
      const event = cleanEvent(body?.evento);
      const notice = await sendNotice(db, admin, report, pool, excluded, event);
      return json({ avisados: pool.length, reporte: { ...report, aviso: notice } });
    }

    if (body?.confirmacion !== 'SORTEAR') throw requestError('Confirma explícitamente el sorteo antes de cerrarlo.');
    if (!pool.length) throw requestError('No hay personas elegibles para sortear.');
    const count = Number.parseInt(body?.cantidad, 10);
    if (!Number.isInteger(count) || count < 1 || count > 20 || count > pool.length) {
      throw requestError('La cantidad de ganadores no es válida.');
    }

    const drawRef = db.collection(TIPOS[tipo].coleccion).doc(month);
    const auditRef = db.collection('auditoria_sorteos').doc();
    const draw = {
      tipo,
      mes: month,
      meses: report.meses,
      periodo: report.periodo,
      diasMes: report.diasMes,
      cerradoEn: Date.now(),
      cerradoPor: { uid: admin.adminUid, email: admin.adminEmail },
      elegibles: report.participantes.length,
      participantes: pool.length,
      participantesHash: participantHash(pool),
      excluidos: report.participantes.filter(person => excluded.has(person.uid)).map(personSummary),
      ganadoresPreviosFuera: report.participantes.filter(person => person.ganoAntes).map(person => ({ ...personSummary(person), ganoEn: person.ganoAntes })),
      metodo: 'seleccion_aleatoria_segura_sin_repeticion',
      ganadores: chooseWinners(pool, count)
    };
    const result = await db.runTransaction(async transaction => {
      const existing = await transaction.get(drawRef);
      if (existing.exists) return { creado: false, sorteo: existing.data() };
      transaction.set(drawRef, draw);
      transaction.set(auditRef, { ...draw, tipo: `sorteo_${tipo}_racha`, tipoRifa: tipo });
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
