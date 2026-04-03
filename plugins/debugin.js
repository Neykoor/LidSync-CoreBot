export default {
  command: "debugin",
  description: "Resuelve un LID a número de teléfono",
  execute: async ({ sock, msg, chatId }) => {
    
    const sender = msg.key.participant || msg.key.remoteJid || "";
    
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedJid = contextInfo?.mentionedJid || [];
    const quoted = contextInfo?.quotedMessage ? contextInfo.participant : null;
    
    const target = mentionedJid[0] || quoted || sender;

    if (!target) {
      await sock.sendMessage(
        chatId,
        { text: "❌ No se detectó objetivo. Menciona un usuario o responde a un mensaje." },
        { quoted: msg }
      );
      return;
    }

  
    if (!target.includes('@')) {
      await sock.sendMessage(
        chatId,
        { text: `❌ ID inválido: ${target}` },
        { quoted: msg }
      );
      return;
    }

    try {
      const jidReal = await sock.lid.resolve(target);
      
      if (!jidReal) {
        await sock.sendMessage(
          chatId,
          { text: `❌ No se encontró número real vinculado a:\n\`${target}\`` },
          { quoted: msg }
        );
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

      await sock.sendMessage(
        chatId,
        { text: respuesta },
        { quoted: msg }
      );
      
    } catch (error) {
      console.error(`[Debugin] Error resolviendo ${target}:`, error);
      await sock.sendMessage(
        chatId,
        { text: `⚠️ *Error interno*\n\`\`\`${error.message}\`\`\`` },
        { quoted: msg }
      );
    }
  }
};
