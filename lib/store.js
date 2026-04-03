import fs from 'fs/promises';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, "..", "baileys_store.json");

const store = {
    contacts: {},
    chats: {},
    _dirty: false,
    _saving: false,

    load() {
        try {
            if (!existsSync(filePath)) return;
            
            const data = JSON.parse(readFileSync(filePath, 'utf-8'));
            this.contacts = data.contacts || {};
            this.chats = data.chats || {};
            
            console.log(`[Store] ${Object.keys(this.contacts).length} contactos cargados`);
        } catch (err) {
            console.error("[Store] Error cargando:", err.message);
            this.contacts = {};
            this.chats = {};
        }
    },

    async save(force = false) {
        if (this._saving || (!this._dirty && !force)) return;
        
        this._saving = true;
        this._dirty = false;
        
        try {
            const data = JSON.stringify({
                contacts: this.contacts,
                chats: this.chats
            }, null, 2);
            
            await fs.writeFile(filePath + '.tmp', data);
            await fs.rename(filePath + '.tmp', filePath);
        } catch (err) {
            console.error("[Store] Error guardando:", err.message);
            this._dirty = true;
        } finally {
            this._saving = false;
        }
    },

    markDirty() {
        this._dirty = true;
    },

    bind(ev) {
        ev.on('contacts.upsert', (contacts) => {
            for (const contact of contacts) {
                const existing = this.contacts[contact.id] || {};
                this.contacts[contact.id] = { ...existing, ...contact };
            }
            this.markDirty();
        });

        ev.on('contacts.update', (updates) => {
            for (const update of updates) {
                const existing = this.contacts[update.id] || {};
                this.contacts[update.id] = { ...existing, ...update };
            }
            this.markDirty();
        });

        ev.on('chats.upsert', (chats) => {
            for (const chat of chats) {
                this.chats[chat.id] = chat;
            }
            this.markDirty();
        });

        ev.on('chats.update', (updates) => {
            for (const update of updates) {
                const existing = this.chats[update.id] || {};
                this.chats[update.id] = { ...existing, ...update };
            }
            this.markDirty();
        });
    },

    getContact(id) {
        return this.contacts[id];
    },

    getAllContacts() {
        return Object.values(this.contacts);
    }
};

store.load();

const saveInterval = setInterval(() => store.save(), 10_000);

const gracefulExit = (signal) => {
    clearInterval(saveInterval);
    console.log(`\n[Store] ${signal} recibido, guardando...`);
    store.save(true).finally(() => process.exit(0));
};

process.on("SIGINT", () => gracefulExit("SIGINT"));
process.on("SIGTERM", () => gracefulExit("SIGTERM"));

export default store;
