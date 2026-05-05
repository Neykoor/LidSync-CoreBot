const WELCOME_TEXT_JID = (jid, groupId) => {
  const numero = jid.split("@")[0];
  const grupo = groupId?.split("@")[0] || "el grupo";
  return `👋 ¡Bienvenido/a al grupo!\n\n➕ *Número:* +${numero}\n🔗 *Wa.me:* https://wa.me/${numero}\n🏠 *Grupo:* ${grupo}\n\nEsperamos que disfrutes tu estancia. 🎉`;
};

const WELCOME_TEXT_LID = (groupId) => {
  const grupo = groupId?.split("@")[0] || "el grupo";
  return `👋 ¡Bienvenido/a al grupo!\n\n🛡️ *Número:* [Oculto por privacidad]\n🏠 *Grupo:* ${grupo}\n\nEsperamos que disfrutes tu estancia. 🎉`;
};

const esJidResuelto = (id) => typeof id === "string" && id.endsWith("@s.whatsapp.net");

export default {
  command: [],
  alias: [],
  
  onLoad: (getSock) => {
    const sock = getSock();
    
    if (sock?.lid?.onJoin) {
      sock.lid.onJoin(async ({ groupId, lid, jid }) => {
        if (!groupId) return;
        
        const isResolved = esJidResuelto(jid);
        const target = isResolved ? jid : lid;
        const text = isResolved ? WELCOME_TEXT_JID(jid, groupId) : WELCOME_TEXT_LID(groupId);
        
        try {
          await sock.sendMessage(groupId, { 
            text, 
            mentions: target ? [target] : [] 
          });
        } catch (e) {}
      });
    }
  },

  execute: async () => {}
};
