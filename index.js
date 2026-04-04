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

    currentSock = sock;

    store.bind(sock.ev);

    sock = pluginLid(sock, { store });
    currentSock = sock;

    if (!eventsLoaded) {
      await loadEvents(getSock);
      eventsLoaded = true;
      console.log("[Bot] Eventos cargados (getter activo)");
    }

    setReconnectCallback(async (newSock) => {
      console.log("[Bot] 🔄 Reconexión detectada...");

      currentSock = newSock;

      store.bind(newSock.ev);

      const updatedSock = pluginLid(newSock, { store });
      currentSock = updatedSock;

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
