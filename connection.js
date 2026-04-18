import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, makeCacheableSignalKeyStore } from "@whiskeysockets/baileys";
import pino from "pino";
import readline from "readline";

let isConnecting = false;
let reconnectAttempts = 0;
let currentSock = null;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

let onReconnectCallback = null;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver));

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

    if (!sock.authState.creds.registered) {
      console.clear();
      console.log("═══════════════════════════════════════");
      console.log("   📱 Vinculación por Código (Pairing)");
      console.log("═══════════════════════════════════════\n");
      const numero = await question("Ingresa el número de WhatsApp del bot (con código de país, ej. 521...): ");
      const numeroLimpio = numero.replace(/[^0-9]/g, "");

      setTimeout(async () => {
        try {
          const codigo = await sock.requestPairingCode(numeroLimpio);
          const codigoFormateado = codigo?.match(/.{1,4}/g)?.join("-") || codigo;
          
          console.log("\n🔑 Tu código de vinculación es:");
          console.log(`\n       ${codigoFormateado}\n`);
          console.log("Pasos:");
          console.log("1. Abre WhatsApp en tu celular principal.");
          console.log("2. Ve a Dispositivos Vinculados > Vincular un dispositivo.");
          console.log("3. Toca 'Vincular usando el número de teléfono'.");
          console.log("4. Ingresa el código de arriba.\n");
          console.log("⏳ Esperando vinculación...");
        } catch (error) {
          console.error("❌ Error al solicitar el código:", error.message);
        }
      }, 3000);
    }

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection) {
        const timestamp = new Date().toLocaleTimeString();

        switch (connection) {
          case "connecting":
            if (sock.authState.creds.registered) {
                console.log(`[${timestamp}] 🔄 Conectando...`);
            }
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
