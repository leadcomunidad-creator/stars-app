# Restauración excepcional de racha

La herramienta administrativa disponible en la barra `⚙ ADMIN` puede restaurar
cualquier día de cualquier cuenta identificada por correo. No exige que existan
pasos previos ni que el día esté marcado como inválido. Al confirmar, registra
los cinco pasos como completados por administración, retira una marca inválida o
una restauración con estrella que existieran y deja evidencia explícita de la
excepción.

## Seguridad obligatoria antes de publicar

La función `/.netlify/functions/restaurar-racha-excepcional` debe configurarse
en **Netlify**, nunca dentro de `index.html`, con estas variables de entorno:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: el JSON completo de una cuenta de servicio
  de Firebase con acceso al proyecto `stars-plus`.
- `STARS_RACHA_ADMIN_UID`: el UID de Firebase Auth de la cuenta administradora
  autorizada. No usar un correo como sustituto del UID.

La cuenta de servicio es una credencial privada: no se sube a Git, no se pega
en un chat y no se incorpora a archivos del repositorio.

## Flujo de uso

1. Iniciar sesión con la cuenta cuyo UID coincide con `STARS_RACHA_ADMIN_UID`.
2. Abrir la barra de administrador y elegir **Restaurar racha**.
3. Indicar el correo de la persona, la fecha y el motivo.
4. Revisar que el caso sea elegible.
5. Confirmar la corrección.

La función verifica el token de Firebase en el servidor, consulta la cuenta por
correo y ejecuta una transacción sobre la fecha indicada. También registra el
evento en la colección `auditoria_racha`, con administrador, persona, fecha,
nota opcional y estado antes/después.

## Límites intencionales

- No permite alterar la racha de una persona desde el navegador sin una
  credencial de servidor.
- No modifica contenido, estudios ni devocionales.
- Cada restauración queda distinguida en `racha_excepciones_admin` y en la
  auditoría; no queda disfrazada como actividad ordinaria de la persona.
