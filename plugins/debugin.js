export default {
  command: ["debugin", "lid"],
  description: "Resuelve un LID a número de teléfono o muestra estadísticas",
  execute: async ({ sock, msg, args, reply }) => {
    
    if (!sock.lid) {
      return await reply("❌ La librería LidSync no está inyectada en este socket.");
    }

    if (args[0] === "stats") {
      const stats = sock.lid.getStats();
      const statsMsg = `📊 *LidSync v5 Stats*\n\n` +
        `*Tamaño Cache:* ${stats.size}/${stats.maxSize}\n` +
        `*Aciertos (Hits):* ${stats.hits}\n` +
        `*Fallos (Misses):* ${stats.misses}\n` +
        `*Efectividad:* ${stats.hitRate}\n` +
        `*Expirados:* ${stats.expirations}\n` +
        `*RAM Estimada:* ${stats.memoryEstimate}`;
      
      return await reply(statsMsg);
    }

    const rawSender = msg.key.participant || msg.key.remoteJid || "";
    
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedJid = contextInfo?.mentionedJid || [];
    const quoted = contextInfo?.participant || null;
    
    const target = mentionedJid[0] || quoted || (args[0] && args[0].includes('@') ? args[0] : rawSender);

    if (!target) {
      return await reply("❌ No se detectó objetivo. Menciona, responde o escribe un ID.");
    }

    try {
      const jidReal = await sock.lid.resolve(target);
      
      if (!jidReal) {
        return await reply(`❌ No se encontró número real vinculado a:\n\`${target}\``);
      }

      const numeroLimpio = jidReal.split('@')[0];
      const esLid = target.endsWith('@lid');
      
      const respuesta = esLid
        ? `✅ *LID Resuelto*\n\n` +
          `*Input:* \`${target}\`\n` +
          `*JID Limpio:* \`${jidReal}\`\n` +
          `*Número:* wa.me/${numeroLimpio}`
        : `ℹ️ *Información del Contacto*\n\n` +
          `*Input:* \`${target}\`\n` +
          `*JID Limpio:* \`${jidReal}\`\n` +
          `*Número:* wa.me/${numeroLimpio}`;

      await reply(respuesta);
      
    } catch (error) {
      console.error(`[Debugin] Error resolviendo ${target}:`, error.message);
      await reply(`⚠️ *Error interno*\n\`\`\`${error.message}\`\`\``);
    }
  }
};
