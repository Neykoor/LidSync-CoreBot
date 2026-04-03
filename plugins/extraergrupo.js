export default {
  command: "extraer",
  description: "Escanea el grupo y resuelve todos los números ocultos (LIDs)",
  execute: async ({ sock, msg, chatId }) => {
    if (!chatId.endsWith('@g.us')) {
      await sock.sendMessage(chatId, { text: "❌ Este comando solo se puede usar en grupos." }, { quoted: msg });
      return;
    }

    try {
      await sock.sendMessage(chatId, { text: "⏳ *Escaneando participantes del grupo...*" }, { quoted: msg });

      const metadata = await sock.groupMetadata(chatId);
      const participantes = metadata.participants;

      const lidsEncontrados = participantes
        .map(p => p.id)
        .filter(id => id.endsWith('@lid'));

      if (lidsEncontrados.length === 0) {
        await sock.sendMessage(chatId, { text: "✅ No hay números ocultos en este grupo. Todos muestran su JID real." }, { quoted: msg });
        return;
      }

      await sock.sendMessage(chatId, { text: `🔍 Se encontraron *${lidsEncontrados.length}* LIDs. Resolviendo en lote...` }, { quoted: msg });

      const resultados = await sock.lid.resolveBatch(lidsEncontrados, { concurrencia: 5 });

      let resueltos = 0;
      let fallidos = 0;
      let textoSalida = `📊 *Reporte de Extracción*\n\n`;

      for (const [lid, jidReal] of resultados) {
        if (jidReal) {
          resueltos++;
          const numeroLimpio = jidReal.split('@')[0];
          textoSalida += `✅ \`${lid}\` ➔ wa.me/${numeroLimpio}\n`;
        } else {
          fallidos++;
          textoSalida += `❌ \`${lid}\` ➔ No encontrado\n`;
        }
      }

      textoSalida += `\n📈 *Resumen:*\n- Resueltos: ${resueltos}\n- No encontrados: ${fallidos}`;

      await sock.sendMessage(chatId, { text: textoSalida }, { quoted: msg });

    } catch (error) {
      console.error("[Extraer] Error escaneando grupo:", error);
      await sock.sendMessage(chatId, { text: `⚠️ *Error interno escaneando el grupo*\n\`\`\`${error.message}\`\`\`` }, { quoted: msg });
    }
  }
};
