const { storage } = require('../firebase');
const fs = require('fs');
const path = require('path');

const bucket = storage.bucket();

async function uploadFile(localPath, destination) {
  await bucket.upload(localPath, { destination });
  console.log(`Uploaded ${localPath} to ${destination}`);
}

async function downloadFile(source, localPath) {
  const file = bucket.file(source);
  await file.download({ destination: localPath });
  console.log(`Downloaded ${source} to ${localPath}`);
}

async function demo() {
  const testFilePath = path.join(__dirname, 'test.txt');
  fs.writeFileSync(testFilePath, 'Hello Storage!');
  await uploadFile(testFilePath, 'test.txt');
  await downloadFile('test.txt', path.join(__dirname, 'downloaded.txt'));
}
demo();