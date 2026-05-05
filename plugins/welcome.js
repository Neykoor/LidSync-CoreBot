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

// Intentos de resolución: espera entre cada uno
const REINTENTOS = [2000, 5000, 10000];

async function resolverConReintentos(getSock, lid) {
  for (const espera of REINTENTOS) {
    await new Promise((r) => setTimeout(r, espera));

    const sock = getSock();
    if (!sock?.lid?.resolve) return null;

    try {
      const resuelto = await sock.lid.resolve(lid);
      if (resuelto && esJidResuelto(resuelto)) return resuelto;
    } catch {}
  }
  return null;
}

async function enviarBienvenida(getSock, jid, groupId, lid) {
  const sock = getSock();
  try {
    await sock.sendMessage(groupId, {
      text: WELCOME_TEXT(jid, groupId),
      mentions: [jid],
    });
    console.log(
      `[welcome] Bienvenida enviada → ${jid}${lid ? ` (lid: ${lid})` : ""} en ${groupId}`
    );
  } catch (err) {
    console.error("[welcome] Error al enviar bienvenida:", err.message);
  }
}

async function manejarParticipante(getSock, groupId, rawId) {
  const sock = getSock();

  // Caso 1: JID normal, sin LID
  if (esJidResuelto(rawId)) {
    return enviarBienvenida(getSock, rawId, groupId, null);
  }

  // Caso 2: Es un LID → intentar resolver de inmediato
  if (esLid(rawId)) {
    let resuelto = null;

    try {
      resuelto = await sock?.lid?.resolve(rawId);
    } catch {}

    if (resuelto && esJidResuelto(resuelto)) {
      return enviarBienvenida(getSock, resuelto, groupId, rawId);
    }

    // No resolvió de inmediato → reintentar en background
    console.log(`[welcome] LID sin resolver, reintentando en background: ${rawId}`);

    resolverConReintentos(getSock, rawId).then((jidFinal) => {
      if (jidFinal) {
        enviarBienvenida(getSock, jidFinal, groupId, rawId);
      } else {
        console.warn(
          `[welcome] No se pudo resolver tras reintentos, bienvenida omitida: ${rawId}`
        );
      }
    });

    return;
  }

  // Caso 3: ID desconocido
  console.warn(`[welcome] ID no reconocido, bienvenida omitida: ${rawId}`);
}

export default {
  command: [],
  alias: [],

  onLoad: (getSock) => {
    const sock = getSock();

    sock.ev.on("group-participants.update", async (update) => {
      const { id: groupId, participants, action } = update;

      if (action !== "add") return;
      if (!groupId || !Array.isArray(participants)) return;

      for (const participant of participants) {
        const rawId =
          typeof participant === "string"
            ? participant
            : (participant?.lid || participant?.id);

        if (!rawId) continue;

        manejarParticipante(getSock, groupId, rawId);
      }
    });

    console.log("[welcome] ✅ Listener group-participants.update registrado.");
  },

  execute: async () => {},
};
