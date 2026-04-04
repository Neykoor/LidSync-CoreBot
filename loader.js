import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadEvents(getSock) {
  const pluginsDir = path.join(__dirname, "plugins");
  const commandMap = new Map();

  try {
    await fs.access(pluginsDir);
    const files = (await fs.readdir(pluginsDir))
      .filter(f => f.endsWith(".js") && !f.startsWith("_"));

    for (const file of files) {
      try {
        const module = await import(`./plugins/${file}`);
        const plugin = module.default || module;

        if (!plugin.command || typeof plugin.execute !== "function") {
          console.warn(`[Loader] Plugin inválido: ${file}`);
          continue;
        }

        if (commandMap.has(plugin.command)) {
          console.warn(`[Loader] Duplicado: ${plugin.command}`);
        }

        commandMap.set(plugin.command, plugin);
        console.log(`[Loader] ${plugin.command} (${file})`);
      } catch (err) {
        console.error(`[Loader] Error ${file}:`, err.message);
      }
    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("[Loader] Error plugins:", err.message);
    }
  }

  console.log(`[Loader] ${commandMap.size} comandos`);

  const initialSock = getSock();

  initialSock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const text = extractText(msg.message);
    if (!text?.startsWith(".")) return;

    const chatId = msg.key.remoteJid;
    const args = text.slice(1).trim().split(/\s+/).filter(Boolean);
    const command = args.shift()?.toLowerCase();

    if (!command) return;

    const plugin = commandMap.get(command);
    if (!plugin) return;

    const sock = getSock();

    const ctx = { 
      sock,
      getSock,
      msg, 
      chatId, 
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

  for (const path of types) {
    const parts = path.split(".");
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
