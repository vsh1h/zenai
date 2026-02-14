import { useEffect } from 'react';
import { db } from '../db/db';

const BACKEND_URL = "http://127.0.0.1:8000"; // Update with your local IP or deployed URL

export function useSync(isOnline) {
  useEffect(() => {
    const syncData = async () => {
      if (!isOnline) {
        console.log("☁️ Offline mode: Sync deferred.");
        return;
      }

      try {
        console.log("🔄 [Sync Engine] Checking for pending data...");

        // 1. Fetch pending leads
        const pendingLeads = await db.leads_local
          .where('sync_status')
          .equals('pending')
          .toArray();

        if (pendingLeads.length === 0) {
          console.log("✅ [Sync Engine] All leads are already synced.");
          return;
        }

        console.log(`📡 [Sync Engine] Found ${pendingLeads.length} leads to upload...`);
        await db.settings.put({ key: 'sync_status', value: 'syncing' });

        // 2. Prepare Payload
        const payload = {
          leads: pendingLeads.map(lead => ({
            id: lead.client_uuid,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            notes: lead.notes,
            location: lead.location,
            intent: lead.intent,
            status: lead.status || "New",
            captured_at: lead.timestamp,
            meta_data: {
              source: lead.source,
              mode: lead.mode,
              captured_offline: true
            }
          }))
        };

        // 3. Execute Fetch
        console.log("📤 [Sync Engine] POSTing to", `${BACKEND_URL}/sync`);
        const response = await fetch(`${BACKEND_URL}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${await response.text()}`);
        }

        const result = await response.json();
        console.log("🚀 [Sync Engine] Success!", result);

        // 4. Mark as Synced
        await db.transaction('rw', db.leads_local, async () => {
          for (const lead of pendingLeads) {
            // Use the primary key (id) for the update
            await db.leads_local.update(lead.id, { sync_status: 'synced' });
          }
        });

        await db.settings.put({ key: 'sync_status', value: 'idle' });
        await db.settings.put({ key: 'last_sync', value: new Date().toISOString() });

      } catch (error) {
        console.error("❌ [Sync Engine] Critical failure:", error.message);
        await db.settings.put({ key: 'sync_status', value: 'error' });
      }
    };

    // Trigger immediately on online/mount
    syncData();

    // Loop every 30 seconds
    const interval = setInterval(syncData, 30000);
    return () => clearInterval(interval);
  }, [isOnline]);
}
