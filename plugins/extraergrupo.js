export default {
  command: ["extraer", "scanlids"],
  description: "Escanea el grupo y resuelve todos los números ocultos (LIDs) en lote",
  execute: async ({ sock, msg, chatId, reply }) => {
    
    if (!chatId.endsWith('@g.us')) {
      return await reply("❌ Este comando solo se puede usar dentro de grupos.");
    }

    if (!sock.lid) {
      return await reply("❌ La librería LidSync no está inyectada en este socket.");
    }

    try {
      await reply("⏳ *Escaneando participantes del grupo...*");

      const metadata = await sock.groupMetadata(chatId);
      const participantes = metadata.participants;

      const lidsEncontrados = participantes
        .map(p => p.id)
        .filter(id => id.endsWith('@lid'));

      if (lidsEncontrados.length === 0) {
        return await reply("✅ No hay números ocultos en este grupo. Todos muestran su JID real.");
      }

      await reply(`🔍 Se encontraron *${lidsEncontrados.length}* LIDs. Resolviendo en lote, esto puede tomar unos segundos...`);

      const resultados = await sock.lid.resolveBatch(lidsEncontrados, { concurrencia: 5 });

      let resueltos = 0;
      let fallidos = 0;
      let textoSalida = `📊 *Reporte de Extracción*\n\n`;

      for (const [lid, jidReal] of resultados) {
        if (jidReal) {
          resueltos++;
          textoSalida += `✅ \`${lid}\` ➔ \`${jidReal}\`\n`;
        } else {
          fallidos++;
          textoSalida += `❌ \`${lid}\` ➔ No encontrado\n`;
        }
      }

      textoSalida += `\n📈 *Resumen:*\n- Total detectados: ${lidsEncontrados.length}\n- Resueltos: ${resueltos}\n- Fallidos: ${fallidos}`;

      await reply(textoSalida);

    } catch (error) {
      console.error("[Extraer] Error escaneando grupo:", error.message);
      await reply(`⚠️ *Error interno escaneando el grupo*\n\`\`\`${error.message}\`\`\``);
    }
  }
};
