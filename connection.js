import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";

export async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: ["Ubuntu", "Chrome", "22.04.4"]
  });

  sock.ev.on("connection.update", (update) => {
    const { qr, connection, lastDisconnect } = update;
    
    if (qr) {
      console.log("\nEscanea el siguiente código QR con tu WhatsApp:\n");
      qrcode.generate(qr, { small: true });
    }
    
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== 401;
      
      console.log(`\nConexión cerrada (Código: ${statusCode}). Reconectando...`);
      
      if (shouldReconnect) {
        connectToWhatsApp();
      } else {
        console.log("Sesión inválida. Borra la carpeta 'auth_session' y reinicia.");
      }
    } else if (connection === "open") {
      console.log("\n✅ Bot conectado exitosamente a WhatsApp.");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
}
