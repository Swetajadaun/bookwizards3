const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const csv = require("csv-parser");

// Load service account
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function importCSV(fileName, collectionName) {
  const rows = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(fileName)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", async () => {
        console.log(`Uploading ${rows.length} records to ${collectionName}...`);

        for (const row of rows) {
          // Remove the photo field
          delete row.photo;

          // Use the id column if available
          const documentId =
            row.id && row.id.trim() !== ""
              ? row.id
              : db.collection(collectionName).doc().id;

          await db.collection(collectionName).doc(documentId).set(row);
        }

        console.log(`✅ ${collectionName} imported successfully.`);
        resolve();
      })
      .on("error", reject);
  });
}

async function main() {
  try {
    await importCSV("members_rows.csv", "members");
    await importCSV("books_rows.csv", "books");

    console.log("🎉 All data imported successfully!");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();