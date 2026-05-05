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

    sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
      if (action !== "add") return;

      const resolvedMap = sock.lid?.resolveParticipants 
        ? await sock.lid.resolveParticipants(participants) 
        : new Map();

      for (const p of participants) {
        const lid = p.lid || (typeof p.id === "string" && p.id.endsWith("@lid") ? p.id : null);
        const jidRaw = p.phoneNumber ? `${p.phoneNumber}@s.whatsapp.net` : p.id;
        
        const jidFinal = resolvedMap.get(lid || p.id) || jidRaw;

        try {
          await sock.sendMessage(id, {
            text: WELCOME_TEXT(jidFinal, id),
            mentions: [jidFinal]
          });
        } catch (error) {
        }
      }
    });
  },

  execute: async () => {},
};
