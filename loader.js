import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { jidNormalizedUser } from "@whiskeysockets/baileys";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

        if (!plugin.command || typeof plugin.execute !== "function") {
          console.warn(`[Loader] Plugin inválido: ${path.basename(file)}`);
          continue;
        }

        const nombres = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
        const aliases = Array.isArray(plugin.alias) ? plugin.alias : (Array.isArray(plugin.aliases) ? plugin.aliases : []);
        const triggers = [...nombres, ...aliases];

        for (const trigger of triggers) {
          if (!trigger?.trim()) continue;
          const key = trigger.toLowerCase().trim();

          if (commandMap.has(key) && nombres.includes(trigger)) {
            console.warn(`[Loader] Duplicado: ${key}`);
            continue;
          }

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

  const initialSock = getSock();

  initialSock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') return;

    const text = extractText(msg.message);
    if (!text?.startsWith(".")) return;

    const chatId = msg.key.remoteJid;
    const args = text.slice(1).trim().split(/\s+/).filter(Boolean);
    const command = args.shift()?.toLowerCase();

    if (!command) return;

    const plugin = commandMap.get(command);
    if (!plugin) return;

    const sock = getSock();

    let sender = msg.key.participant || chatId;
    sender = jidNormalizedUser(sender);

    if (sock.lid?.resolve && sender.endsWith('@lid')) {
        const resolved = await sock.lid.resolve(sender);
        if (resolved) {
            sender = jidNormalizedUser(resolved);
        }
    }

    const ctx = { 
      sock,
      getSock,
      msg, 
      chatId, 
      sender,
      text: text.slice(1).trim(), 
      args, 
      reply: (content) => sendReply(sock, chatId, content, msg)
    };

    try {
      await plugin.execute(ctx);
    } catch (err) {
      console.error(`[Loader] ${command}:`, err);
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
    for (const part of parts) {
      value = value?.[part];
    }
    if (typeof value === "string") return value;
  }

  return "";
}

async function sendReply(sock, chatId, content, quotedMsg) {
  const options = quotedMsg?.key ? { quoted: quotedMsg } : {};

  if (typeof content === "string") {
    return await sock.sendMessage(chatId, { text: content }, options);
  }

  return await sock.sendMessage(chatId, content, options);
}
