export default {
  command: "debugin",
  description: "Resuelve un LID a número de teléfono",
  execute: async ({ sock, msg, chatId, reply }) => {
    
    const sender = msg.key.participant || msg.key.remoteJid || "";
    
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedJid = contextInfo?.mentionedJid || [];
    const quoted = contextInfo?.quotedMessage ? contextInfo.participant : null;
    
    const target = mentionedJid[0] || quoted || sender;

    if (!target) {
      await reply("❌ No se detectó objetivo. Menciona un usuario o responde a un mensaje.");
      return;
    }

    if (!target.includes('@')) {
      await reply(`❌ ID inválido: ${target}`);
      return;
    }

    try {
      const jidReal = await sock.lid.resolve(target);
      
      if (!jidReal) {
        await reply(`❌ No se encontró número real vinculado a:\n\`${target}\``);
        return;
      }

      const numeroLimpio = jidReal.split('@')[0];
      const esLid = target.endsWith('@lid');
      
      const respuesta = esLid
        ? `✅ *LID Resuelto*\n\n` +
          `*Input:* \`${target}\`\n` +
          `*JID:* \`${jidReal}\`\n` +
          `*Número:* wa.me/${numeroLimpio}`
        : `ℹ️ *Ya era JID*\n\n` +
          `*Input:* \`${target}\`\n` +
          `*Número:* wa.me/${numeroLimpio}`;

      await reply(respuesta);
      
    } catch (error) {
      console.error(`[Debugin] Error resolviendo ${target}:`, error);
      await reply(`⚠️ *Error interno*\n\`\`\`${error.message}\`\`\``);
    }
  }
};
