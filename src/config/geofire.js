const geofire = require('geofire-common');
<<<<<<< Updated upstream
=======
const { admin } = require('./firebase');
>>>>>>> Stashed changes

/**
 * Generate a geohash from latitude and longitude
 * @param {number} lat - Latitude (-90 to 90)
 * @param {number} lng - Longitude (-180 to 180)
<<<<<<< Updated upstream
 * @returns {string} Geohash string (9 characters for ~2m accuracy)
 */
function generateGeohash(lat, lng) {
  if (lat < -90 || lat > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }
  if (lng < -180 || lng > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }
  return geofire.geohashForLocation([lat, lng]);
=======
 * @returns {string} Geohash string
 */
function generateGeohash(lat, lng) {
    if (lat === undefined || lng === undefined) return null;
    if (lat < -90 || lat > 90) throw new Error('Latitude must be between -90 and 90');
    if (lng < -180 || lng > 180) throw new Error('Longitude must be between -180 and 180');
    return geofire.geohashForLocation([lat, lng]);
>>>>>>> Stashed changes
}

/**
 * Calculate distance between two points using Haversine formula
<<<<<<< Updated upstream
 * @param {number} lat1 - First latitude
 * @param {number} lng1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lng2 - Second longitude
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const distanceKm = geofire.distanceBetween([lat1, lng1], [lat2, lng2]);
  return distanceKm * 1000; // Convert to meters
}

/**
 * Get geohash query bounds for a circular area
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} radiusInM - Radius in meters
 * @returns {Array} Array of [minGeohash, maxGeohash] bounds
 */
function getGeohashQueryBounds(lat, lng, radiusInM) {
  return geofire.geohashQueryBounds([lat, lng], radiusInM);
=======
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1 || !lat2 || !lng2) return null;
    const distanceKm = geofire.distanceBetween([lat1, lng1], [lat2, lng2]);
    return distanceKm * 1000; // Convert to meters
}

/**
 * Calculate distance in kilometers (simpler version)
 */
function calculateDistanceKm(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1 || !lat2 || !lng2) return null;
    return geofire.distanceBetween([lat1, lng1], [lat2, lng2]);
}

/**
 * Get geohash query bounds for a circular area
 * @returns {Array} Array of [minGeohash, maxGeohash] bounds
 */
function getGeohashQueryBounds(lat, lng, radiusInM) {
    if (!lat || !lng) return [];
    return geofire.geohashQueryBounds([lat, lng], radiusInM);
>>>>>>> Stashed changes
}

/**
 * Store a location with geohash in Firestore
<<<<<<< Updated upstream
 * @param {Object} db - Firestore instance
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Object} additionalData - Additional data to store
 * @returns {Promise<Object>} Stored location data
 */
async function storeLocation(db, collection, docId, lat, lng, additionalData = {}) {
  const geohash = generateGeohash(lat, lng);
  const locationData = {
    location: new admin.firestore.GeoPoint(lat, lng),
    geohash,
    lat,
    lng,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...additionalData
  };
  
  await db.collection(collection).doc(docId).set(locationData, { merge: true });
  return { geohash, ...locationData };
}

/**
 * Find nearby documents using geohash with optional filter
 * @param {Object} db - Firestore instance
 * @param {string} collection - Collection name
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} radiusInM - Radius in meters
 * @param {Function} filterFn - Optional filter function
 * @returns {Promise<Array>} Array of nearby documents with distances
 */
async function findNearby(db, collection, lat, lng, radiusInM, filterFn = null) {
  const bounds = getGeohashQueryBounds(lat, lng, radiusInM);
  const results = [];
  const seenIds = new Set();

  for (const bound of bounds) {
    const snapshot = await db.collection(collection)
      .where('geohash', '>=', bound[0])
      .where('geohash', '<=', bound[1])
      .get();

    for (const doc of snapshot.docs) {
      if (seenIds.has(doc.id)) continue;
      seenIds.add(doc.id);

      const data = doc.data();
      if (data.location) {
        const distance = calculateDistance(
          lat, lng,
          data.location.latitude, data.location.longitude
        );
        
        if (distance <= radiusInM) {
          const item = { id: doc.id, ...data, distance: Math.round(distance) };
          if (!filterFn || filterFn(item)) {
            results.push(item);
          }
        }
      }
    }
  }

  return results.sort((a, b) => a.distance - b.distance);
=======
 * @returns {Promise<Object>} Stored location data
 */
async function storeLocation(db, collection, docId, lat, lng, additionalData = {}) {
    const { admin } = require('./firebase');
    const geohash = generateGeohash(lat, lng);
    const locationData = {
        location: new admin.firestore.GeoPoint(lat, lng),
        geohash,
        lat,
        lng,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...additionalData
    };
    
    await db.collection(collection).doc(docId).set(locationData, { merge: true });
    return { geohash, ...locationData };
}

/**
 * Find nearby documents using geohash
 * @returns {Promise<Array>} Array of nearby documents with distances
 */
async function findNearby(db, collection, lat, lng, radiusInM, filterFn = null) {
    if (!lat || !lng) return [];
    
    const bounds = getGeohashQueryBounds(lat, lng, radiusInM);
    const results = [];
    const seenIds = new Set();

    for (const bound of bounds) {
        const snapshot = await db.collection(collection)
            .where('geohash', '>=', bound[0])
            .where('geohash', '<=', bound[1])
            .get();

        for (const doc of snapshot.docs) {
            if (seenIds.has(doc.id)) continue;
            seenIds.add(doc.id);

            const data = doc.data();
            if (data.location && data.location.latitude) {
                const distance = calculateDistance(lat, lng, data.location.latitude, data.location.longitude);
                if (distance <= radiusInM) {
                    const item = { id: doc.id, ...data, distance: Math.round(distance) };
                    if (!filterFn || filterFn(item)) {
                        results.push(item);
                    }
                }
            }
        }
    }

    return results.sort((a, b) => a.distance - b.distance);
>>>>>>> Stashed changes
}

/**
 * Batch update multiple locations
<<<<<<< Updated upstream
 * @param {Object} db - Firestore instance
 * @param {string} collection - Collection name
 * @param {Array} updates - Array of { docId, lat, lng, additionalData }
 */
async function batchUpdateLocations(db, collection, updates) {
  const batch = db.batch();
  
  for (const update of updates) {
    const { docId, lat, lng, additionalData = {} } = update;
    const geohash = generateGeohash(lat, lng);
    const docRef = db.collection(collection).doc(docId);
    
    batch.set(docRef, {
      location: new admin.firestore.GeoPoint(lat, lng),
      geohash,
      lat,
      lng,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...additionalData
    }, { merge: true });
  }
  
  await batch.commit();
=======
 */
async function batchUpdateLocations(db, collection, updates) {
    const batch = db.batch();
    
    for (const update of updates) {
        const { docId, lat, lng, additionalData = {} } = update;
        const geohash = generateGeohash(lat, lng);
        const docRef = db.collection(collection).doc(docId);
        
        batch.set(docRef, {
            location: new admin.firestore.GeoPoint(lat, lng),
            geohash,
            lat,
            lng,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...additionalData
        }, { merge: true });
    }
    
    await batch.commit();
>>>>>>> Stashed changes
}

/**
 * Validate coordinates
<<<<<<< Updated upstream
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True if coordinates are valid
 */
function isValidCoordinates(lat, lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Get distance in kilometers (simpler version)
 * @param {number} lat1 - First latitude
 * @param {number} lng1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lng2 - Second longitude
 * @returns {number} Distance in kilometers
 */
function getDistanceKm(lat1, lng1, lat2, lng2) {
  return geofire.distanceBetween([lat1, lng1], [lat2, lng2]);
}

module.exports = {
  generateGeohash,
  calculateDistance,
  getGeohashQueryBounds,
  storeLocation,
  findNearby,
  batchUpdateLocations,
  isValidCoordinates,
  getDistanceKm
=======
 */
function isValidCoordinates(lat, lng) {
    return lat !== undefined && lng !== undefined && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

module.exports = {
    generateGeohash,
    calculateDistance,
    calculateDistanceKm,
    getGeohashQueryBounds,
    storeLocation,
    findNearby,
    batchUpdateLocations,
    isValidCoordinates
>>>>>>> Stashed changes
};