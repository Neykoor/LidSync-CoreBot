## ✨ LidSync-CoreBot

<p align="center">
  <img src="https://files.catbox.moe/hq1lfe.jpeg" width="100%" />
</p>

<p align="center">
  <b>🧪 Bot de prueba oficial para LidSync v5</b><br>
  <sub>Base simple, escalable y lista para desarrollar</sub>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/lidsync"><img src="https://img.shields.io/npm/v/lidsync.svg?style=flat-square&color=blue" alt="NPM Version" /></a>
  <img src="https://img.shields.io/badge/status-experimental-orange.svg"/>
  <img src="https://img.shields.io/badge/base-simple-blue.svg"/>
  <img src="https://img.shields.io/badge/purpose-testing-green.svg"/>
  <img src="https://img.shields.io/badge/v6-en%20desarrollo-yellow.svg"/>
</p>

---

## ✨ ¿Qué es LidSync-CoreBot?

**LidSync-CoreBot** es un bot de WhatsApp creado principalmente para **probar y demostrar el funcionamiento de la librería oficial [LidSync en npm](https://www.npmjs.com/package/lidsync)**.

Además, funciona como una **base simple y escalable** que puedes usar para desarrollar tu propio bot sin preocuparte por los números ocultos.

---

## 🌟 Potenciado por LidSync v5

Este CoreBot ya viene configurado de fábrica con la última tecnología de **LidSync v5**, incluyendo:

- 🧠 **Auto-Aprendizaje Pasivo:** El bot aprende las identidades automáticamente sin que tengas que programar nada.
- ⚡ **Caché LRU:** Gestión inteligente de memoria RAM para servidores pequeños.
- 💾 **Store de Persistencia:** Los usuarios descubiertos se guardan en `database/store.json` y sobreviven a los reinicios.
- 🧹 **Normalización Automática:** El bot limpia los JIDs complejos (ej: `521xxx:1@s.whatsapp.net` ➔ `521xxx@s.whatsapp.net`).
- 🚀 **Resolución en Lote:** Capacidad de escanear grupos enteros en segundos usando `sock.lid.resolveBatch()`.

> ⚠️ **REGLA DE ORO DEL AUTO-APRENDIZAJE:**
> Por limitaciones del protocolo de WhatsApp, la librería solo puede descubrir y resolver el número real de un usuario oculto (`@lid`) **únicamente cuando ese usuario envía un mensaje, un sticker o un emoji** al chat donde está el bot. Si un usuario entra a un grupo y se queda "fantasma" (nunca interactúa), su número no podrá ser resuelto.

---

## 🎯 Propósito

- 🧪 Probar la resolución de **LID → JID** en tiempo real.
- 🔍 Ver la efectividad de la memoria Caché y el Store.
- ⚙️ Servir como ejemplo práctico de integración en `loader.js` y `handler.js`.
- 🚀 Ser una base sólida para proyectos más grandes.

---

## ⚠️ Importante

Este bot fue creado principalmente para pruebas:

> ❗ **Testing primero, producción después**

- Código simple y fácil de entender.
- Sin sobrecarga de funciones innecesarias.
- Viene con plugins de ejemplo (`debugin.js` y `extraergrupo.js`).
- Preparado para que lo expandas a tu manera.

---

## 🚀 ¿Qué puedes hacer con este bot?

✔ Usarlo como base para tu propio bot.  
✔ Crear comandos personalizados con su `Loader` rápido.  
✔ Integrar sistemas (IA, juegos, RPG, etc.).  
✔ Extraer números de grupos enteros de forma masiva.  
✔ Convertirlo en un bot completo a prueba de números ocultos.  

---

## ⚙️ Tecnologías usadas

- 📦 **Baileys** (`@whiskeysockets/baileys`)
- 🔗 **LidSync** (`npm install lidsync`)
- 🟢 **Node.js** (`>=18.0.0`)

---

## 📦 Instalación

1. Clona este repositorio e instala las dependencias base:
```bash
npm install
```

2. *(Opcional)* Si quieres asegurarte de tener la versión más reciente de LidSync desde npm:
```bash
npm install lidsync@latest
```

---

## ▶️ Ejecución

```bash
npm start
```

---

## 🔗 Relación con LidSync

Este bot utiliza **LidSync** inyectado directamente en el objeto de conexión de Baileys. Gracias al nuevo contexto, en tus plugins nunca tendrás que lidiar con LIDs.

Ejemplo interno en el CoreBot:

```js
// El sender ya viene limpio y resuelto gracias a LidSync v5
export default {
  command: "ping",
  execute: async ({ sender, reply }) => {
    await reply(`¡Hola! Tu número real es: ${sender}`);
  }
};
```

---

## 🧪 Uso recomendado

Este bot es ideal si quieres:

- Aprender cómo funciona la librería LidSync de npm.
- Probar la resolución de usuarios ocultos en tiempo real.
- Tener una base lista para desarrollar con la v5.

---

## 🔮 ¿Qué viene después? — LidSync v6

> 🚧 **LidSync v6 está actualmente en desarrollo.**

La próxima versión mayor de la librería oficial ya está en camino. Se están trabajando mejoras profundas en rendimiento, cobertura de casos edge y nuevas APIs. Mantente atento a npm y al repositorio para novedades.

---

## 👨‍💻 Creador

<p align="center">
  <a href="https://github.com/Neykoor">
    <img src="https://github.com/Neykoor.png" width="100" style="border-radius:50%" />
  </a>
</p>

<p align="center">
  <b>Neykoor</b><br>
  https://github.com/Neykoor
</p>

---

## 🤝 Agradecimientos

<p align="center">
  <a href="https://github.com/WhiskeySockets">
    <img src="https://github.com/WhiskeySockets.png" width="100" style="border-radius:50%" />
  </a>
</p>

<p align="center">
  <b>Baileys (WhiskeySockets)</b><br>
  https://github.com/WhiskeySockets
</p>

---

## 🌸 Nota final

<p align="center">
  ⚡ Base simple, pero con potencial ilimitado
</p>
