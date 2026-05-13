const geofire = require('geofire-common');

const center = [40.7128, -74.0060]; // NYC
const radiusInM = 50 * 1000; // 50 km

const bounds = geofire.geohashQueryBounds(center, radiusInM);
console.log('Geohash bounds (for querying):', bounds);

function haversineDistance(lat1, lon1, lat2, lon2) {
  return geofire.distanceBetween([lat1, lon1], [lat2, lon2]); // in km
}

console.log('Distance NYC–LA:', haversineDistance(40.7128, -74.0060, 34.0522, -118.2437), 'km');