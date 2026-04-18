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
          `*Cache Activa:* ${stats?.size || 0}/${stats?.maxSize || 0}`
        );
      } catch (error) {
        return await reply(`❌ *Fallo en LidSync:*\n\`\`\`${error.message}\`\`\``);
      }
    }

    if (args[0] === "stats") {
      const stats = sock.lid.getStats();
      return await reply(
        `📊 *LidSync v5 Stats*\n\n` +
        `*Tamaño Cache:* ${stats.size}/${stats.maxSize}\n` +
        `*Aciertos:* ${stats.hits}\n` +
        `*Fallos:* ${stats.misses}\n` +
        `*Efectividad:* ${stats.hitRate}\n` +
        `*Expirados:* ${stats.expirations}\n` +
        `*RAM Estimada:* ${stats.memoryEstimate}`
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
        `${isLid ? "✅ *LID Resuelto*" : "ℹ️ *Información del Contacto*"}\n\n` +
        `*Input:* \`${target}\`\n` +
        `*JID Limpio:* \`${jidReal}\`\n` +
        `*Número:* wa.me/${numeroLimpio}`
      );
      
    } catch (error) {
      await reply(`⚠️ *Error interno*\n\`\`\`${error.message}\`\`\``);
    }
  }
};
