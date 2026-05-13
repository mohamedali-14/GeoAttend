const { db } = require('../firebase');
const geofire = require('geofire-common');

const lat = 40.7128;   // New York latitude
const lng = -74.0060;  // New York longitude
const geohash = geofire.geohashForLocation([lat, lng]);
console.log('Geohash:', geohash);

async function storeLocation() {
  const docRef = db.collection('locations').doc('nyc');
  await docRef.set({
    name: 'New York',
    lat,
    lng,
    geohash
  });
  console.log('Location stored in Firestore');
}
storeLocation();