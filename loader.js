import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { jidNormalizedUser } from "@whiskeysockets/baileys";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EXECUTE_TIMEOUT_MS = 15000;
const SEND_TIMEOUT_MS = 10000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`[Timeout] ${label} superó ${ms}ms`)), ms)
    )
  ]);
}

async function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = await fs.readdir(dirPath);
  for (const file of files) {
    if (file.startsWith("_")) continue;
    const fullPath = path.join(dirPath, file);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      await getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith(".js")) {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

export async function loadEvents(getSock) {
  const pluginsDir = path.join(__dirname, "plugins");
  const commandMap = new Map();

  try {
    await fs.access(pluginsDir);
    const files = await getAllFiles(pluginsDir);

    for (const file of files) {
      try {
        const fileUrl = `${pathToFileURL(file).href}?t=${Date.now()}`;
        const module = await import(fileUrl);
        const plugin = module.default || module;

        const hasCommand = plugin.command && (
          Array.isArray(plugin.command)
            ? plugin.command.length > 0
            : typeof plugin.command === "string" && plugin.command.trim()
        );
        const hasOnLoad = typeof plugin.onLoad === "function";

        if (!hasCommand && !hasOnLoad) continue;
        if (typeof plugin.execute !== "function") continue;

        // Invocar onLoad para plugins de eventos (welcome, etc.)
        if (hasOnLoad) {
          try {
            plugin.onLoad(getSock);
          } catch (err) {
            console.error(`[Loader] onLoad ${path.basename(file)}:`, err.message);
          }
        }

        if (!hasCommand) continue; // plugin solo de eventos, sin comandos de texto

        const nombres = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
        const aliases = Array.isArray(plugin.alias)
          ? plugin.alias
          : Array.isArray(plugin.aliases)
          ? plugin.aliases
          : [];
        const triggers = [...nombres, ...aliases];

        for (const trigger of triggers) {
          if (!trigger?.trim()) continue;
          const key = trigger.toLowerCase().trim();
          if (commandMap.has(key) && nombres.includes(trigger)) continue;
          commandMap.set(key, plugin);
        }
      } catch (err) {
        console.error(`[Loader] Error ${path.basename(file)}:`, err.message);
      }
    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("[Loader] Error plugins:", err.message);
    }
  }

  console.log(`[Loader] ${commandMap.size} llaves cargadas (comandos+alias)`);

  const sock0 = getSock();

  sock0.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe || msg.key.remoteJid === "status@broadcast") return;

    const text = extractText(msg.message);
    if (!text?.startsWith(".")) return;

    const chatId = msg.key.remoteJid;
    const args = text.slice(1).trim().split(/\s+/).filter(Boolean);
    const command = args.shift()?.toLowerCase();

    if (!command) return;

    const plugin = commandMap.get(command);
    if (!plugin) return;

    const sock = getSock();

    const rawParticipant = msg.key.participant || chatId;
    const rawAlt = msg.key.participantAlt || msg.key.remoteJidAlt;

    let sender = jidNormalizedUser(rawParticipant);
    let lid = null;

    if (sock.lid?.resolve) {
      const isParticipantLid =
        rawParticipant?.endsWith("@lid") || rawParticipant?.endsWith("@hosted.lid");
      const isAltLid =
        rawAlt?.endsWith("@lid") || rawAlt?.endsWith("@hosted.lid");

      if (isParticipantLid) {
        lid = sender;
        const resolved = await sock.lid.resolve(sender).catch(() => null);
        if (resolved) sender = resolved;
      } else if (isAltLid) {
        lid = jidNormalizedUser(rawAlt);
        const resolved = await sock.lid.resolve(lid).catch(() => null);
        if (resolved) sender = resolved;
      }
    }

    const ctx = {
      sock,
      getSock,
      msg,
      chatId,
      sender,
      lid,
      text: text.slice(1).trim(),
      args,
      reply: (content) => sendReply(sock, chatId, content, msg)
    };

    try {
      await withTimeout(plugin.execute(ctx), EXECUTE_TIMEOUT_MS, command);
    } catch (err) {
      console.error(`[Loader] ${command}:`, err.message);
      await ctx.reply(`❌ ${err.message}`).catch(() => {});
    }
  });
}

function extractText(message) {
  if (!message) return "";

  const types = [
    "conversation",
    "extendedTextMessage.text",
    "imageMessage.caption",
    "videoMessage.caption",
    "documentMessage.caption"
  ];

  for (const p of types) {
    const parts = p.split(".");
    let value = message;
    for (const part of parts) value = value?.[part];
    if (typeof value === "string") return value;
  }

  return "";
}

async function sendReply(sock, chatId, content, quotedMsg) {
  const options = quotedMsg?.key ? { quoted: quotedMsg } : {};
  const payload = typeof content === "string" ? { text: content } : content;

  return withTimeout(
    sock.sendMessage(chatId, payload, options),
    SEND_TIMEOUT_MS,
    "sendReply"
  );
}
