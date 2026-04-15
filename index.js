import { connectToWhatsApp, setReconnectCallback, getCurrentSock } from "./connection.js";
import { loadEvents } from "./loader.js";
import { pluginLid } from "lidsync";
import store from "./lib/store.js";

let currentSock = null;
let isRestarting = false;
let eventsLoaded = false;

const getSock = () => currentSock;

async function start() {
  try {
    if (isRestarting) {
      console.log("[Bot] Reinicio en progreso...");
      return;
    }

    isRestarting = true;

    let sock = await connectToWhatsApp();

    if (!sock) {
      console.error("[Bot] No se pudo obtener socket");
      isRestarting = false;
      return;
    }

    sock = pluginLid(sock, { store });
    currentSock = sock;

    store.bind(sock.ev);

    if (!eventsLoaded) {
      await loadEvents(getSock);
      eventsLoaded = true;
      console.log("[Bot] Eventos cargados (getter activo)");
    }

    setReconnectCallback(async (newSock) => {
      console.log("[Bot] 🔄 Reconexión detectada...");

      const updatedSock = pluginLid(newSock, { store });
      currentSock = updatedSock;

      store.bind(updatedSock.ev);

      console.log("[Bot] ✅ Reconexión completada, mismo listener, socket nuevo");
    });

    isRestarting = false;
    console.log("[Bot] ✅ Iniciado y listo");

  } catch (err) {
    console.error("[Bot] Error fatal:", err);
    isRestarting = false;

    if (store && !store._shutdownBound && typeof store.save === 'function') {
      await store.save(true).catch(() => {}); 
    }

    console.log("[Bot] Esperando reconexión automática...");
  }
}

if (store && typeof store.on === 'function') {
  store.on('close', async () => {
    console.log("[Bot] Store cerrado...");
  });
}

const gracefulShutdown = async () => {
  console.log("\n[Bot] Apagando de forma segura...");
  try {
    if (store && typeof store.close === 'function') {
      await store.close();
    } else if (store && typeof store.save === 'function') {
      await store.save(true);
    }
  } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

process.on('uncaughtException', (err) => {
  console.error('[Bot] ⚠️ Error no capturado:', err.message);
});

export { getSock };

export function getBotSocket() {
  return currentSock;
}

export function getBotStatus() {
  return {
    isRestarting,
    eventsLoaded,
    hasSocket: !!currentSock,
    isOnline: currentSock?.ws?.readyState === 1
  };
}

start();
