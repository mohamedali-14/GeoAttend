const geofire = require("geofire-common");

function generateGeohash(lat, lng) {

    return geofire.geohashForLocation([lat, lng]);

}

function calculateDistance(lat1, lng1, lat2, lng2) {

    return geofire.getDistance(
        { lat: lat1, lng: lng1 },
        { lat: lat2, lng: lng2 }
    ) * 1000;

}

function getGeohashQueryBounds(lat, lng, radius) {

    return geofire.geohashQueryBounds([lat, lng], radius);

}

module.exports = {
    generateGeohash,
    calculateDistance,
    getGeohashQueryBounds
};