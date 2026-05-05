import { connectToWhatsApp, setReconnectCallback } from "./connection.js";
import { loadEvents } from "./loader.js";
import { pluginLid } from "lidsync";
import store from "./lib/store.js";

let currentSock = null;
let isRestarting = false;
let eventsLoaded = false;
let storeBound = false;

export const getSock = () => currentSock;

async function start() {
  try {
    if (isRestarting) return;
    isRestarting = true;

    let sock = await connectToWhatsApp();
    if (!sock) {
      isRestarting = false;
      return;
    }

    sock = pluginLid(sock, { store });
    currentSock = sock;

    if (!storeBound) {
      store.bind(sock.ev);
      storeBound = true;
    }

    if (!eventsLoaded) {
      await loadEvents(getSock);
      eventsLoaded = true;
    }

    setReconnectCallback(async (newSock) => {
      if (currentSock?.lid?.destroy) currentSock.lid.destroy();
      currentSock = pluginLid(newSock, { store });
    });

    isRestarting = false;
  } catch (err) {
    isRestarting = false;
    if (store?.save) await store.save(true).catch(() => {});
  }
}

const gracefulShutdown = async () => {
  try {
    if (currentSock?.lid?.destroy) currentSock.lid.destroy();
    if (store?.destroy) await store.destroy();
    else if (store?.save) await store.save(true);
  } catch (e) {}
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("uncaughtException", () => {});
process.on("unhandledRejection", () => {});

export function getBotStatus() {
  return {
    isRestarting,
    eventsLoaded,
    storeBound,
    hasSocket: !!currentSock,
    isOnline: currentSock?.ws?.readyState === 1
  };
}

start();
