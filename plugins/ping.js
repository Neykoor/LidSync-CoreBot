import os from "os";

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

export default {
  command: ["ping", "status", "info"],
  execute: async ({ sock, msg, reply }) => {
    const timestamp = msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now();
    const latencia = Date.now() - timestamp;
    
    let lidStatus = "Operativo 🟢";
    let stats = null;
    
    try {
      if (!sock.lid || typeof sock.lid.getStats !== "function") {
        lidStatus = "Error 🔴 (Librería no inyectada)";
      } else {
        stats = sock.lid.getStats();
      }
    } catch (e) {
      lidStatus = `Error 🔴 (${e.message})`;
    }

    const ramRss = formatBytes(process.memoryUsage().rss);
    const ramTotal = formatBytes(os.totalmem());
    const ramFree = formatBytes(os.freemem());
    const uptime = formatUptime(process.uptime());

    let texto = `*🚀 Eris-MD Status*\n\n`;
    texto += `*Latencia:* ${latencia} ms\n`;
    texto += `*Uptime:* ${uptime}\n`;
    texto += `*RAM Usada:* ${ramRss}\n`;
    texto += `*RAM Server:* ${ramFree} libre de ${ramTotal}\n\n`;
    
    texto += `*⚙️ LidSync Status*\n`;
    texto += `*Estado:* ${lidStatus}\n`;
    
    if (stats) {
      texto += `*Caché Activa:* ${stats.cache.size}/${stats.cache.maxSize}\n`;
      texto += `*Efectividad:* ${stats.cache.hitRate}\n`;
      texto += `*Índice:* ${stats.index.size}/${stats.index.maxSize}\n`;
      texto += `*Sincronizado:* ${stats.sincronizado ? "Sí ✅" : "No ❌"}`;
    }

    await reply(texto);
  }
};
