import * as Location from 'expo-location';

export interface GeoPoint {
    latitude: number;
    longitude: number;
}

export function getDistanceMeters(a: GeoPoint, b: GeoPoint): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
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
