import { useEffect, useRef } from 'react';

const SYNC_INTERVAL = 10000; // 10 seconds

const OffsetSyncWorker: React.FC = () => {
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastSyncRef = useRef<number>(0);

    useEffect(() => {
        const syncOffsets = async () => {
            try {
                // Prevent duplicate calls
                const now = Date.now();
                if (now - lastSyncRef.current < SYNC_INTERVAL - 1000) {
                    return;
                }
                lastSyncRef.current = now;

                const response = await fetch('/api/offset-sync');
                const data = await response.json();
                
                if (data.status === 'updated') {
                    console.log('[Glycon Sync] Offsets updated:', data);
                } else if (data.status === 'up_to_date') {
                    console.log('[Glycon Sync] Already up to date');
                }
            } catch (error) {
                console.error('[Glycon Sync] Error:', error);
            }
        };

        // Run immediately on mount
        syncOffsets();

        // Then run every 10 seconds
        intervalRef.current = setInterval(syncOffsets, SYNC_INTERVAL);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // This component doesn't render anything
    return null;
};

export default OffsetSyncWorker;
