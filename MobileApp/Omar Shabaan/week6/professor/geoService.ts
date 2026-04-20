import * as Location from 'expo-location';

export const BACKGROUND_LOCATION_TASK = 'geotrack-background-location';

export interface GeoPoint {
    latitude: number;
    longitude: number;
}

export function getDistanceMeters(a: GeoPoint, b: GeoPoint): number {
    const R = 6_371_000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.latitude)) *
        Math.cos(toRad(b.latitude)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function isWithinRadius(point: GeoPoint, center: GeoPoint, radius: number): boolean {
    return getDistanceMeters(point, center) <= radius;
}

export async function getCurrentLocation(): Promise<GeoPoint | null> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return null;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch (e) {
        console.error('getCurrentLocation error:', e);
        return null;
    }
}

export async function startLocationWatcher(
    callback: (point: GeoPoint) => void,
    distanceInterval = 10,
    timeInterval = 30_000,
): Promise<Location.LocationSubscription | null> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return null;
        return await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval, timeInterval },
            (loc) => callback({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }),
        );
    } catch (e) {
        console.error('startLocationWatcher error:', e);
        return null;
    }
}

export async function startBackgroundLocation(): Promise<boolean> {
    try {
        const fg = await Location.requestForegroundPermissionsAsync();
        if (fg.status !== 'granted') return false;

        const bg = await Location.requestBackgroundPermissionsAsync();
        if (bg.status !== 'granted') return false;

        const already = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        if (already) return true;

        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10,
            timeInterval: 30_000,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
                notificationTitle: 'GeoTrack',
                notificationBody: 'يتم تسجيل موقعك',
                notificationColor: '#10B981',
            },
        });
        return true;
    } catch (e) {
        console.error('startBackgroundLocation error:', e);
        return false;
    }
}

export async function stopBackgroundLocation(): Promise<void> {
    try {
        const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        if (running) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    } catch (e) {
        console.error('stopBackgroundLocation error:', e);
    }
}
