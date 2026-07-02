import { GridFSBucket, MongoClient, ObjectId } from "mongodb";
import { Readable } from "node:stream";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "personal_vault";

if (!uri) {
  throw new Error("MONGODB_URI is required.");
}

let clientPromise;

function getClient() {
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
}

export async function getDb() {
  const client = await getClient();
  return client.db(dbName);
}

export async function getCollections() {
  const db = await getDb();
  return {
    users: db.collection("users"),
    vaults: db.collection("vaults"),
  };
}

export async function ensureIndexes() {
  const { users, vaults } = await getCollections();
  await users.createIndex({ email: 1 }, { unique: true });
  await vaults.createIndex({ userId: 1 }, { unique: true });
}

export async function getBucket() {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: "vaultFiles" });
}

export async function uploadBufferFile({ userId, name, mimeType, category, linkedTo, data }) {
  const bucket = await getBucket();
  const buffer = Buffer.from(data, "base64");
  const source = Readable.from(buffer);

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(name, {
      contentType: mimeType || "application/octet-stream",
      metadata: {
        userId,
        category,
        linkedTo,
        uploadedAt: new Date(),
        size: buffer.length,
      },
    });

    source.pipe(uploadStream);
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => {
      resolve({
        id: uploadStream.id.toString(),
        name,
        type: mimeType || "application/octet-stream",
        size: buffer.length,
        uploadedAt: new Date().toISOString(),
        category,
        linkedTo,
      });
    });
  });
}

export async function downloadFileToBuffer(fileId, userId) {
  const bucket = await getBucket();
  const db = await getDb();
  const file = await db.collection("vaultFiles.files").findOne({
    _id: new ObjectId(fileId),
    "metadata.userId": userId,
  });

  if (!file) {
    return null;
  }

  const chunks = [];
  return new Promise((resolve, reject) => {
    const stream = bucket.openDownloadStream(file._id);
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => {
      resolve({
        file,
        buffer: Buffer.concat(chunks),
      });
    });
  });
}

export async function deleteFile(fileId, userId) {
  const db = await getDb();
  const file = await db.collection("vaultFiles.files").findOne({
    _id: new ObjectId(fileId),
    "metadata.userId": userId,
  });

  if (!file) {
    return false;
  }

  const bucket = await getBucket();
  await bucket.delete(file._id);
  return true;
}
