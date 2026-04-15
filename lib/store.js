import fs from 'fs/promises';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jidNormalizedUser } from '@whiskeysockets/baileys';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = path.join(__dirname, '..', 'data', 'store.json');

export class StorePro {
  constructor(options = {}) {
    this.path = options.path || DEFAULT_PATH;
    this.maxMessagesPerChat = options.maxMessagesPerChat || 50;
    this.saveIntervalMs = options.saveIntervalMs || 10_000;

    this.contacts = {}; 
    this.chats = {};
    this.messages = {};

    this._saveInterval = null;
    this._isSaving = false;
    this._shutdownBound = false;
    
    const dir = path.dirname(this.path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    this._loadSync();
    this.#bindShutdown();
  }

  _loadSync() {
    try {
      if (existsSync(this.path)) {
        const data = readFileSync(this.path, 'utf-8');
        const parsed = JSON.parse(data);
        this.contacts = parsed.contacts || {};
        this.chats = parsed.chats || {};
      }
    } catch (err) {
      console.warn('[StorePro] Iniciando store en limpio (JSON previo ausente o corrupto).');
    }
  }

  bind(ev) {
    ev.on('contacts.upsert', (contactos) => {
      for (const c of contactos) {
        if (c.id) {
          const id = jidNormalizedUser(c.id);
          this.contacts[id] = Object.assign(this.contacts[id] || {}, c, { id });
        }
      }
    });

    ev.on('contacts.update', (updates) => {
      for (const u of updates) {
        if (u.id) {
          const id = jidNormalizedUser(u.id);
          this.contacts[id] = Object.assign(this.contacts[id] || {}, u, { id });
        }
      }
    });

    ev.on('chats.upsert', (chats) => {
      for (const c of chats) {
        if (c.id) {
          const id = jidNormalizedUser(c.id);
          this.chats[id] = Object.assign(this.chats[id] || {}, c, { id });
        }
      }
    });

    ev.on('chats.update', (updates) => {
      for (const u of updates) {
        if (u.id) {
          const id = jidNormalizedUser(u.id);
          this.chats[id] = Object.assign(this.chats[id] || {}, u, { id });
        }
      }
    });

    ev.on('chats.delete', (deletions) => {
      for (const rawId of deletions) {
        const id = jidNormalizedUser(rawId);
        delete this.chats[id];
        delete this.messages[id];
      }
    });

    ev.on('messages.upsert', ({ messages }) => {
      for (const msg of messages) {
        const rawJid = msg.key.remoteJid;
        if (!rawJid) continue;
        
        const jid = jidNormalizedUser(rawJid);
        const sender = jidNormalizedUser(msg.key.participant || rawJid);
        const name = msg.pushName;

        if (name) {
          if (!this.contacts[sender]) {
            this.contacts[sender] = { id: sender, name: name };
          } else if (this.contacts[sender].name !== name) {
            this.contacts[sender].name = name;
          }
        }

        if (!this.messages[jid]) this.messages[jid] = [];
        this.messages[jid].push(msg);
        if (this.messages[jid].length > this.maxMessagesPerChat) {
          this.messages[jid].shift();
        }
      }
    });

    this.#startAutoSave();
  }

  #startAutoSave() {
    if (this._saveInterval) clearInterval(this._saveInterval);
    this._saveInterval = setInterval(() => this.save(), this.saveIntervalMs);
    if (this._saveInterval.unref) this._saveInterval.unref();
  }

  #bindShutdown() {
    if (this._shutdownBound) return;
    this._shutdownBound = true;
    const exitHandler = async () => {
      await this.destroy();
      process.exit(0);
    };
    process.on('SIGINT', exitHandler);
    process.on('SIGTERM', exitHandler);
  }

  async save(force = false) {
    if (this._isSaving && !force) return;
    this._isSaving = true;
    try {
      const data = JSON.stringify({ contacts: this.contacts, chats: this.chats });
      const tmpPath = `${this.path}.tmp`;
      await fs.writeFile(tmpPath, data);
      await fs.rename(tmpPath, this.path);
    } catch (error) {
      if (force) console.error('[StorePro] Error crítico guardando estado:', error.message);
    } finally {
      this._isSaving = false;
    }
  }

  async destroy() {
    if (this._saveInterval) {
      clearInterval(this._saveInterval);
      this._saveInterval = null;
    }
    await this.save(true);
  }

  getAllContacts() {
    return this.contacts;
  }
}

export default new StorePro();
