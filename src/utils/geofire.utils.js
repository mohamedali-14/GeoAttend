const { db } = require('../config/firebase');
const geofire = require('geofire-common');

/**
 * Generate a geohash from latitude and longitude
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Geohash
 */
function generateGeohash(lat, lng) {
  return geofire.geohashForLocation([lat, lng]);
}

/**
 * Calculate distance between two points (Haversine formula)
 * @param {number} lat1 - First latitude
 * @param {number} lng1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lng2 - Second longitude
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  return geofire.distanceBetween([lat1, lng1], [lat2, lng2]);
}

/**
 * Get geohash query bounds for proximity search
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} radiusInM - Radius in meters
 * @returns {Array} Array of geohash bounds
 */
function getGeohashBounds(lat, lng, radiusInM) {
  return geofire.geohashQueryBounds([lat, lng], radiusInM);
}

/**
 * Store a location with geohash in Firestore
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} name - Location name
 * @returns {Promise<string>} Document ID
 */
async function storeLocation(lat, lng, name) {
  const geohash = generateGeohash(lat, lng);
  const docRef = db.collection('locations').doc();
  await docRef.set({
    name,
    lat,
    lng,
    geohash,
    createdAt: new Date()
  });
  return docRef.id;
}

module.exports = {
  generateGeohash,
  calculateDistance,
  getGeohashBounds,
  storeLocation
};