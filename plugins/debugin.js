export default {
  command: ["debugin", "lid"],
  execute: async ({ sock, msg, args, reply }) => {
    if (!sock.lid || typeof sock.lid.resolve !== "function") {
      return await reply("❌ La librería LidSync no está inyectada o es inválida.");
    }

    if (args[0] === "check") {
      try {
        const stats = sock.lid.getStats();
        const targetTest = msg.key.participant || msg.key.remoteJid;
        const resTest = await sock.lid.resolve(targetTest);
        
        return await reply(
          `✅ *LidSync Status*\n\n` +
          `*Módulo:* Operativo 🟢\n` +
          `*Prueba Resolve:* ${resTest ? "Éxito ✅" : "Fallido ❌"}\n` +
          `*Cache Activa:* ${stats?.cache?.size || 0}/${stats?.cache?.maxSize || 0}\n` +
          `*Índice:* ${stats?.index?.size || 0}/${stats?.index?.maxSize || 0}`
        );
      } catch (error) {
        return await reply(`❌ *Fallo en LidSync:*\n\`\`\`${error.message}\`\`\``);
      }
    }

    if (args[0] === "stats") {
      const stats = sock.lid.getStats();
      return await reply(
        `📊 *LidSync v6 Stats*\n\n` +
        `*-- CACHÉ LRU --*\n` +
        `*Tamaño:* ${stats.cache.size}/${stats.cache.maxSize}\n` +
        `*Aciertos:* ${stats.cache.hits}\n` +
        `*Fallos:* ${stats.cache.misses}\n` +
        `*Efectividad:* ${stats.cache.hitRate}\n` +
        `*Expirados:* ${stats.cache.expirations}\n` +
        `*RAM Cache:* ${stats.cache.memoryEstimate}\n\n` +
        `*-- ÍNDICE --*\n` +
        `*Tamaño:* ${stats.index.size}/${stats.index.maxSize}\n` +
        `*Sincronizado:* ${stats.sincronizado ? "Sí ✅" : "No ❌"}`
      );
    }

    const rawSender = msg.key.participant || msg.key.remoteJid || "";
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const target = contextInfo?.mentionedJid?.[0] || 
                   contextInfo?.participant || 
                   (args[0] && args[0].includes('@') ? args[0] : rawSender);

    if (!target) {
      return await reply("❌ No se detectó objetivo. Menciona, responde o escribe un ID.");
    }

    try {
      const jidReal = await sock.lid.resolve(target);
      
      if (!jidReal) {
        return await reply(`❌ No se encontró número real vinculado a:\n\`${target}\``);
      }

      const numeroLimpio = jidReal.split('@')[0];
      const isLid = typeof sock.lid.isResolvable === "function" ? sock.lid.isResolvable(target) : target.endsWith('@lid');
      
      await reply(
        `${isLid ? "✅ *LID Resuelto*" : "ℹ️ *JID Normal*"}\n\n` +
        `*LID:* ${target}\n` +
        `*JID:* ${jidReal}\n` +
        `*Número:* +${numeroLimpio}\n` +
        `*Wa.me:* https://wa.me/${numeroLimpio}`
      );

    } catch (error) {
      await reply(`❌ *Error al resolver:*\n\`\`\`${error.message}\`\`\``);
    }
  }
};
