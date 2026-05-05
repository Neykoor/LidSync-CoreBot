// plugins/welcome.js

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

const esLid = (id) =>
  typeof id === "string" &&
  (id.endsWith("@lid") || id.endsWith("@hosted.lid"));

const esJidResuelto = (id) =>
  typeof id === "string" && id.endsWith("@s.whatsapp.net");

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
      if (!groupId) return;

      const currentSock = getSock();

      // Determinar el JID real a usar
      let jidFinal = jid;

      // Si el jid es un LID o no está resuelto, intentar resolverlo
      if (!esJidResuelto(jidFinal)) {
        const candidato = lid || jid;

        if (candidato && currentSock?.lid?.resolve) {
          try {
            const resuelto = await currentSock.lid.resolve(candidato);
            if (resuelto && esJidResuelto(resuelto)) {
              jidFinal = resuelto;
            }
          } catch (err) {
            console.warn("[welcome] Error al resolver LID:", err.message);
          }
        }
      }

      // Si aún no está resuelto, no podemos armar el mensaje (número desconocido)
      if (!esJidResuelto(jidFinal)) {
        console.warn(
          `[welcome] No se pudo resolver el número para lid: ${lid || jid} en ${groupId}. Bienvenida omitida.`
        );
        return;
      }

      try {
        await currentSock.sendMessage(groupId, {
          text: WELCOME_TEXT(jidFinal, groupId),
        });

        console.log(
          `[welcome] Bienvenida enviada → jid: ${jidFinal}${lid ? ` (lid: ${lid})` : ""} en ${groupId}`
        );
      } catch (err) {
        console.error("[welcome] Error al enviar bienvenida:", err.message);
      }
    });

    console.log("[welcome] ✅ Listener onJoin registrado.");
  },

  execute: async () => {},
};
