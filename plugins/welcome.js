const WELCOME_TEXT = (jid, groupId) => {
  const numero = jid.split("@")[0];
  const grupo = groupId?.split("@")[0] || "el grupo";
  return (
    `👋 ¡Bienvenido/a al grupo!\n\n` +
    `➕ *Número:* +${numero}\n` +
    `🔗 *Wa.me:* https://wa.me/${numero}\n` +
    `🏠 *Grupo:* ${grupo}\n\n` +
    `Esperamos que disfrutes tu estancia. 🎉`
  );
};

export default {
  command: [],       
  alias: [],

  
  onLoad: (getSock) => {
    const sock = getSock();

    if (!sock?.lid?.onJoin) {
      console.warn("[welcome] LidSync no disponible: onJoin no registrado.");
      return;
    }

    sock.lid.onJoin(async ({ groupId, jid, lid }) => {
      if (!groupId || !jid) return;

      try {
        const currentSock = getSock();
        await currentSock.sendMessage(groupId, {
          text: WELCOME_TEXT(jid, groupId),
        });

        console.log(
          `[welcome] Bienvenida enviada → jid: ${jid}${lid ? ` (lid: ${lid})` : ""} en ${groupId}`
        );
      } catch (err) {
        console.error("[welcome] Error al enviar bienvenida:", err.message);
      }
    });

    console.log("[welcome] ✅ Listener onJoin registrado.");
  },

  execute: async () => {},
};
