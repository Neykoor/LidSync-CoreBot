import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, makeCacheableSignalKeyStore } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";

let isConnecting = false;
let reconnectAttempts = 0;
let currentSock = null;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

let onReconnectCallback = null;

export function setReconnectCallback(callback) {
  onReconnectCallback = callback;
}

export async function connectToWhatsApp() {
  if (isConnecting) {
    console.log("⚠️ Conexión en curso, esperando...");
    return currentSock;
  }

  isConnecting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth_session");
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`🔄 Baileys v${version.join('.')} ${isLatest ? '(latest)' : ''}`);

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
      },
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: ["Ubuntu", "Chrome", "22.04.4"],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      emitOwnEvents: true,
      markOnlineOnConnect: true,
      syncFullHistory: false,
      shouldIgnoreJid: (jid) => jid?.includes("broadcast")
    });

    currentSock = sock;

    sock.ev.on("connection.update", async (update) => {
      const { qr, connection, lastDisconnect } = update;

      if (qr) {
        console.clear();
        console.log("═══════════════════════════════════════");
        console.log("   📱 lidsync-corebot");
        console.log("═══════════════════════════════════════");
        console.log("\n🔐 Escanea el QR con WhatsApp:\n");
        qrcode.generate(qr, { small: true });
        console.log("\n⏳ Esperando...");
        console.log("═══════════════════════════════════════");
        return;
      }

      if (connection) {
        const timestamp = new Date().toLocaleTimeString();

        switch (connection) {
          case "connecting":
            console.log(`[${timestamp}] 🔄 Conectando...`);
            break;

          case "open":
            reconnectAttempts = 0;
            isConnecting = false;
            console.clear();
            console.log("═══════════════════════════════════════");
            console.log("   ✅ lidsync-corebot ONLINE");
            console.log("═══════════════════════════════════════");
            console.log(`🤖 ${sock.user?.name || 'Bot'}`);
            console.log(`📱 ${sock.user?.id?.split(':')[0] || 'N/A'}`);
            console.log(`⏰ ${new Date().toLocaleString()}`);
            console.log("═══════════════════════════════════════");

            try {
              await sock.sendPresenceUpdate("available");
            } catch (e) {
            }
            break;

          case "close":
            isConnecting = false;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const reason = lastDisconnect?.error?.message || "Unknown";

            console.log(`[${timestamp}] ❌ Cerrado (Code: ${statusCode || 'N/A'})`);

            const shouldReconnect = handleDisconnect(statusCode, reason);

            if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttempts++;
              console.log(`🔄 Reconectando ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);

              setTimeout(async () => {
                const newSock = await connectToWhatsApp();
                if (newSock && onReconnectCallback) {
                  onReconnectCallback(newSock);
                }
              }, RECONNECT_DELAY);
            } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
              console.log("❌ Máximos intentos alcanzados");
              process.exit(1);
            }
            break;
        }
      }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("error", (err) => {
      if (err.message?.includes("Stream Errored")) {
        console.error("⚠️ Stream error:", err.message);
      }
    });

    return sock;

  } catch (error) {
    isConnecting = false;
    console.error("💥 Error crítico:", error.message);

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      setTimeout(async () => {
        const newSock = await connectToWhatsApp();
        if (newSock && onReconnectCallback) {
          onReconnectCallback(newSock);
        }
      }, RECONNECT_DELAY);
    }
    return null;
  }
}

function handleDisconnect(statusCode, reason) {
  if (statusCode === DisconnectReason.loggedOut) {
    console.log("🔴 Sesión inválida. Borra 'auth_session' y reinicia.");
    return false;
  }

  const temporaryErrors = ["ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "timed out"];
  if (temporaryErrors.some(e => reason?.includes(e))) {
    return true;
  }

  return statusCode !== DisconnectReason.loggedOut;
}

export function getCurrentSock() {
  return currentSock;
}

export function getConnectionStatus() {
  return {
    isConnecting,
    reconnectAttempts,
    isOnline: currentSock?.ws?.readyState === 1
  };
}
