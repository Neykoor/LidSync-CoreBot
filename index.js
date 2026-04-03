import { connectToWhatsApp } from "./connection.js";
import { loadEvents } from "./loader.js";
import { pluginLid } from "lidsync";
import store from "./lib/store.js";

async function start() {
  try {
    let sock = await connectToWhatsApp();
    
    store.bind(sock.ev);
    
    sock = pluginLid(sock, { store });
    
    await loadEvents(sock);
    
    console.log("[Bot] Iniciado y listo");
  } catch (err) {
    console.error("[Bot] Error fatal en inicio:", err);
    await store.save(true).catch(() => {}); 
    process.exit(1);
  }
}

start();
