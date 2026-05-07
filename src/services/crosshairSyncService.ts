/**
 * Crosshair Sync Service
 * Manages broadcasting crosshair positions between multiple charts
 */

export interface CrosshairMoveEvent {
    chartId: number;
    time?: number | string;
    price?: number;
    point?: { x: number; y: number };
    source: 'mouse' | 'sync';
}

type CrosshairCallback = (event: CrosshairMoveEvent) => void;

class CrosshairSyncService {
    private isSyncEnabled: boolean = false;
    private listeners: Set<CrosshairCallback> = new Set();

    setSyncEnabled(enabled: boolean) {
        this.isSyncEnabled = enabled;
    }

    getEnabled(): boolean {
        return this.isSyncEnabled;
    }

    broadcastMove(event: CrosshairMoveEvent) {
        if (!this.isSyncEnabled || event.source === 'sync') return;
        
        // Notify all listeners (other charts)
        const syncEvent: CrosshairMoveEvent = {
            ...event,
            source: 'sync'
        };
        
        this.listeners.forEach(callback => callback(syncEvent));
    }

    onMove(callback: CrosshairCallback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
}

export const crosshairSyncService = new CrosshairSyncService();
export default crosshairSyncService;
