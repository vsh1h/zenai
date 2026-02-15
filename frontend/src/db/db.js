import Dexie from 'dexie';

export const db = new Dexie('FinIdeasDB');


db.version(6).stores({
  leads_local: '++id, client_uuid, name, email, phone, status, source, mode, sync_status, timestamp, reminder_date, owner_id, revenue, conference_id',
  interactions_local: '++id, client_uuid, lead_uuid, type, timestamp, note, mode, sync_status',
  sync_queue: '++id, type, table, data, timestamp, status',
  reminders_local: '++id, client_uuid, lead_uuid, title, timestamp, sync_status',
  settings: 'key, value',
  media_local: '++id, client_uuid, file_name, blob, type, timestamp'
});

db.on('ready', () => {
  return db.settings.get('sync_status').then(res => {
    if (!res) {
      db.settings.add({ key: 'sync_status', value: 'idle' });
    }
  });
});

export default db;
