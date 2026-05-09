const geofire = require('geofire-common');

function generateGeohash(lat, lng) {
    return geofire.geohashForLocation([lat, lng]);
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    return geofire.distanceBetween([lat1, lng1], [lat2, lng2]);
}

function calculateDistanceInMeters(lat1, lng1, lat2, lng2) {
    return geofire.distanceBetween([lat1, lng1], [lat2, lng2]) * 1000;
}

function getGeohashBounds(lat, lng, radiusInM) {
    return geofire.geohashQueryBounds([lat, lng], radiusInM);
}

module.exports = { generateGeohash, calculateDistance, calculateDistanceInMeters, getGeohashBounds };