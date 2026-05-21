# S.T.A.R.S. — LHSCOL · PWA

Sistema Total de Absorción y Reflexión de la Escritura  
Versión PWA para Netlify con contenido dinámico desde GitHub.

---

## Estructura del proyecto

```
stars-pwa/
├── index.html              ← App principal (PWA shell)
├── manifest.json           ← Manifest PWA
├── sw.js                   ← Service Worker (offline)
├── netlify.toml            ← Configuración Netlify
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── devocionales/
│   └── devocional2026semana21.json   ← Ejemplo
└── estudios/
    ├── indice.json                   ← Índice de capítulos disponibles
    └── genesis1.json                 ← Ejemplo
```

---

## Despliegue en Netlify

1. Subir esta carpeta a un repositorio GitHub
2. En Netlify → **Add new site → Import an existing project**
3. Conectar el repositorio
4. Build settings: dejar en blanco (sitio estático)
5. **Deploy site**

---

## Agregar devocionales

### Nombre del archivo
```
devocionales/devocional{AÑO}semana{SEMANA}.json
```
Ejemplo: `devocional2026semana22.json`

El número de semana es el número de semana ISO del año.

### Estructura del JSON

```json
{
  "semana": 22,
  "año": 2026,
  "serie": "Nombre de la serie",
  "musica_url": "https://youtu.be/...",
  "dias": {
    "2026-05-25": {
      "titulo": "Título del día",
      "versiculo": "Referencia (MSG)",
      "tag": "Lunes · 25 de mayo",
      "frase": "Frase para Instagram",
      "oracion": "Oración de silencio",
      "texto_msg": {
        "ref": "Referencia completa MSG",
        "cuerpo": "Texto del pasaje"
      },
      "texto_ntv": {
        "ref": "Referencia NBLA",
        "cuerpo": "Texto NBLA"
      },
      "analisis": [
        "Párrafo 1 del análisis",
        "Párrafo 2",
        "Párrafo 3"
      ],
      "reflexion": "Pregunta de reflexión",
      "sembrar": "Práctica del día",
      "paso_profundo": {
        "titulo": "Referencia corta",
        "texto_en": "Texto en inglés MSG",
        "texto_es": "Texto en español MSG",
        "explicacion_breve": "Explicación del texto",
        "notas": [
          {
            "frase_en": "frase en inglés",
            "traduccion": "traducción",
            "analisis": "análisis lingüístico-teológico"
          }
        ]
      }
    }
  }
}
```

---

## Agregar estudios por capítulo

### Nombre del archivo
```
estudios/{libro}{capitulo}.json
```
Ejemplos:
- `genesis1.json` → Génesis 1
- `genesis2.json` → Génesis 2
- `efesios1.json` → Efesios 1
- `lucas15.json` → Lucas 15
- `1corintios1.json` → 1 Corintios 1

**Regla de normalización del nombre:**
- Todo en minúsculas
- Sin tildes ni caracteres especiales
- Sin espacios
- Sin guiones

### Actualizar el índice

Cada vez que agregues un estudio nuevo, actualiza `estudios/indice.json`:

```json
{
  "Génesis_1": { "fecha": "2026-05-20" },
  "Génesis_2": { "fecha": "2026-05-25" },
  "Efesios_1": { "fecha": "2026-05-25" }
}
```

La `fecha` indica cuándo se publicó (sirve para mostrar el badge "NUEVO" los primeros 7 días).

### Estructura del JSON de estudio

```json
{
  "titulo": "Génesis 1 — The Message",
  "libro": "Génesis",
  "capitulo": 1,
  "key": "genesis1",
  "fecha": "2026-05-20",
  "secciones": [
    {
      "id": "1",
      "nav": "1. Texto MSG",
      "html": "<div class=\"estudio-sec-label\">...</div>"
    },
    { "id": "2", "nav": "2. Orientación", "html": "..." },
    { "id": "3", "nav": "3. Estructura", "html": "..." },
    { "id": "4", "nav": "4. Teología", "html": "..." },
    { "id": "5", "nav": "5. Joyas MSG", "html": "..." },
    { "id": "6", "nav": "6. Conexiones", "html": "..." },
    { "id": "7", "nav": "7. Jesús", "html": "..." },
    { "id": "8", "nav": "8. Ángulos", "html": "..." },
    { "id": "9", "nav": "9. Reflexión", "html": "..." },
    { "id": "10", "nav": "10. Frase", "html": "..." }
  ]
}
```

Las 10 secciones corresponden al método S.T.A.R.S. de estudio por capítulo. El HTML de cada sección puede usar las clases CSS de la app: `estudio-sec-label`, `estudio-sec-titulo`, `estudio-sec-body`, `estudio-frase-tap`, etc.

---

## Flujo de publicación semanal

1. Escribe el JSON del devocional de la semana
2. Súbelo a `devocionales/devocional{año}semana{N}.json`
3. (Opcional) Agrega estudios nuevos en `estudios/`
4. Actualiza `estudios/indice.json`
5. Git push → Netlify despliega automáticamente en ~30 segundos

La app detecta automáticamente la semana actual y carga el devocional correspondiente. No hay que tocar el `index.html` nunca.

---

## Instalación como PWA

- **Android:** Chrome mostrará "Agregar a la pantalla de inicio" automáticamente
- **iOS:** Safari → Compartir → Agregar a pantalla de inicio
- **Desktop:** Chrome/Edge muestran el botón de instalación en la barra de direcciones

La app funciona **offline** una vez instalada (muestra el contenido cargado más recientemente).
