import { useEffect } from 'react';
import { db } from '../db/db';

const BACKEND_URL = "http://127.0.0.1:8000"; // Update with your local IP or deployed URL
const CURRENT_USER_ID = "00000000-0000-0000-0000-000000000000";

export function useSync(isOnline) {
  useEffect(() => {
    const syncData = async () => {
      if (!isOnline) {
        console.log("☁️ Offline mode: Sync deferred.");
        return;
      }

      try {
        console.log("[Sync Engine] Checking for pending data...");

        const pendingLeads = await db.leads_local
          .where('sync_status')
          .equals('pending')
          .toArray();

        if (pendingLeads.length > 0) {
          console.log(`[Sync Engine] Found ${pendingLeads.length} leads to upload...`);
          await db.settings.put({ key: 'sync_status', value: 'syncing' });

          const payload = {
            leads: pendingLeads.map(lead => ({
              id: lead.client_uuid,
              name: lead.name,
              email: lead.email || null,
              phone: lead.phone || null,
              notes: lead.notes,
              location: lead.location,
              intent: lead.intent,
              status: lead.status || "New",
              captured_at: lead.timestamp,
              revenue: parseFloat(lead.revenue) || 0,
              conference_id: lead.conference_id || null,
              owner_id: lead.owner_id || CURRENT_USER_ID,
              meta_data: {
                source: lead.source,
                mode: lead.mode,
                captured_offline: true,
                company: lead.company || null,
                role: lead.role || null
              }
            }))
          };


          console.log("[Sync Engine] POSTing to", `${BACKEND_URL}/sync`);
          const response = await fetch(`${BACKEND_URL}/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': CURRENT_USER_ID
            },
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
              await db.leads_local.update(lead.id, { sync_status: 'synced' });
            }
          });

          await db.settings.put({ key: 'sync_status', value: 'idle' });
          await db.settings.put({ key: 'last_sync', value: new Date().toISOString() });
        } else {
          console.log("✅ [Sync Engine] No pending leads.");
        }

        // 5. Handle Pending Audio Post-Processing
        const pendingAudio = await db.sync_queue
          .where('type')
          .equals('audio')
          .and(item => item.sync_status === 'pending')
          .toArray();

        if (pendingAudio.length > 0) {
          console.log(`🎙️ [Sync Engine] Found ${pendingAudio.length} audio files to process...`);
          for (const item of pendingAudio) {
            try {
              const media = await db.media_local
                .where('file_name')
                .equals(item.file_name)
                .first();

              if (!media) continue;

              const formData = new FormData();
              formData.append('file', media.blob, media.file_name);
              formData.append('lead_id', item.lead_client_uuid);

              const audioResponse = await fetch(`${BACKEND_URL}/process-audio`, {
                method: 'POST',
                headers: { 'X-User-ID': CURRENT_USER_ID },
                body: formData
              });

              if (audioResponse.ok) {
                const audioResult = await audioResponse.json();
                console.log("📝 [Sync Engine] Audio processed:", audioResult);

                // Update local lead with intelligence
                await db.leads_local
                  .where('client_uuid')
                  .equals(item.lead_client_uuid)
                  .modify(lead => {
                    lead.notes = (lead.notes || "") + "\n\n[Voice Intent]: " + audioResult.transcript;
                    lead.meta_data = {
                      ...(lead.meta_data || {}),
                      ...audioResult.extracted_intent,
                      priority_score: audioResult.priority_score,
                      meeting_link: audioResult.meeting_link,
                      transcribed: true
                    };
                  });

                // Update the media entry with the transcript for the player UI
                await db.media_local
                  .where('client_uuid')
                  .equals(item.lead_client_uuid)
                  .and(m => m.file_name === item.file_name)
                  .modify(media => {
                    media.meta_data = {
                      ...(media.meta_data || {}),
                      transcript: audioResult.transcript,
                      intelligence: audioResult.extracted_intent
                    };
                  });

                await db.sync_queue.update(item.id, { sync_status: 'synced' });
              }
            } catch (err) {
              console.error("❌ Audio Sync Error:", err);
            }
          }
        }

      } catch (error) {
        console.error("❌ [Sync Engine] Critical failure:", error.message);
        await db.settings.put({ key: 'sync_status', value: 'error' });
      }
    };

    // Trigger immediately on online/mount
    syncData();

    // Loop every 10 seconds for more real-time feel
    const interval = setInterval(syncData, 10000);
    return () => clearInterval(interval);
  }, [isOnline]);
}
