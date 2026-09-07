/**
 * Storage drivers:
 *   STORAGE_DRIVER=local       -> files on disk
 *   STORAGE_DRIVER=s3          -> Amazon S3
 *   STORAGE_DRIVER=cloudinary  -> Cloudinary
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  unlinkSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { extname, join } from "node:path";

const DRIVER = process.env.STORAGE_DRIVER || "local";
const LOCAL_DIR = process.env.LOCAL_STORAGE_DIR || "./uploads";

/* -------------------------------------------------------------------------- */
/*                                  helpers                                   */
/* -------------------------------------------------------------------------- */

function key(folder, originalName) {
  return `${folder}/${randomUUID()}${extname(originalName || "").toLowerCase()}`;
}

/* -------------------------------------------------------------------------- */
/*                               local driver                                 */
/* -------------------------------------------------------------------------- */

function localSave(folder, file) {
  const k = key(folder, file.originalname);
  const dest = join(LOCAL_DIR, k);

  mkdirSync(join(LOCAL_DIR, folder), { recursive: true });
  writeFileSync(dest, file.buffer);

  return k;
}

function localDelete(k) {
  const p = join(LOCAL_DIR, k);

  if (existsSync(p)) {
    unlinkSync(p);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  s3 driver                                 */
/* -------------------------------------------------------------------------- */

let s3;
let GetObjectCommand;
let PutObjectCommand;
let DeleteObjectCommand;
let getSignedUrl;

async function s3Client() {
  if (s3) return s3;

  const mod = await import("@aws-sdk/client-s3");
  const signer = await import("@aws-sdk/s3-request-presigner");

  ({ GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = mod);
  ({ getSignedUrl } = signer);

  s3 = new mod.S3Client({
    region: process.env.AWS_REGION,
  });

  return s3;
}

/* -------------------------------------------------------------------------- */
/*                             cloudinary driver                              */
/* -------------------------------------------------------------------------- */

let cloudinary;

async function cloudinaryClient() {
  if (cloudinary) return cloudinary;

  const mod = await import("cloudinary");

  cloudinary = mod.v2;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return cloudinary;
}

/**
 * Upload a Buffer to Cloudinary.
 *
 * Audio files such as M4A use resource_type "video".
 * Cover images use resource_type "image".
 */
async function cloudinarySave(folder, file) {
  const client = await cloudinaryClient();

  const resourceType = folder === "audio" ? "video" : "image";

  const publicId = `cryptune/${folder}/${randomUUID()}`;

  const result = await new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        resource_type: resourceType,
        public_id: publicId,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    stream.end(file.buffer);
  });

  console.log("Cloudinary upload successful:");
  console.log("Resource type:", resourceType);
  console.log("Public ID:", result.public_id);
  console.log("URL:", result.secure_url);

  /*
   * We store both the resource type and public ID in one string.
   *
   * Example:
   * cloudinary:video:cryptune/audio/abc123
   * cloudinary:image:cryptune/covers/xyz789
   */
  return `cloudinary:${resourceType}:${result.public_id}`;
}

/**
 * Delete a file from Cloudinary.
 */
async function cloudinaryDelete(k) {
  if (!k.startsWith("cloudinary:")) return;

  const client = await cloudinaryClient();

  const parts = k.split(":");

  const resourceType = parts[1];
  const publicId = parts.slice(2).join(":");

  if (!resourceType || !publicId) return;

  await client.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });

  console.log("Cloudinary file deleted:", publicId);
}

/**
 * Get the Cloudinary delivery URL.
 *
 * Cloudinary URLs are normally public HTTPS delivery URLs.
 */
async function cloudinaryUrl(k) {
  const client = await cloudinaryClient();

  const parts = k.split(":");

  const resourceType = parts[1];
  const publicId = parts.slice(2).join(":");

  if (!resourceType || !publicId) {
    return null;
  }

  return client.url(publicId, {
    resource_type: resourceType,
    secure: true,
  });
}

/* -------------------------------------------------------------------------- */
/*                                   public                                   */
/* -------------------------------------------------------------------------- */

export async function saveFile(folder, file) {
  /* ----------------------------- Cloudinary ----------------------------- */

  if (DRIVER === "cloudinary") {
    return cloudinarySave(folder, file);
  }

  /* ---------------------------------- S3 --------------------------------- */

  if (DRIVER === "s3") {
    const client = await s3Client();

    const k = key(folder, file.originalname);

    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: k,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    return k;
  }

  /* ------------------------------- local -------------------------------- */

  return localSave(folder, file);
}

export async function deleteFile(k) {
  if (!k) return;

  /* ----------------------------- Cloudinary ----------------------------- */

  if (DRIVER === "cloudinary") {
    await cloudinaryDelete(k);
    return;
  }

  /* ---------------------------------- S3 --------------------------------- */

  if (DRIVER === "s3") {
    const client = await s3Client();

    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: k,
      })
    );

    return;
  }

  /* ------------------------------- local -------------------------------- */

  localDelete(k);
}

/**
 * Returns a URL the browser can stream from.
 */
export async function signedUrlFor(k, expiresIn = 60 * 60 * 6) {
  if (!k) return null;

  /* ----------------------------- Cloudinary ----------------------------- */

  if (DRIVER === "cloudinary") {
    return cloudinaryUrl(k);
  }

  /* ---------------------------------- S3 --------------------------------- */

  if (DRIVER === "s3") {
    const client = await s3Client();

    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: k,
      }),
      {
        expiresIn,
      }
    );
  }

  /* ------------------------------- local -------------------------------- */

  return `${process.env.PUBLIC_API_URL || ""}/api/files/${encodeURIComponent(
    k
  )}`;
}

/* -------------------------------------------------------------------------- */
/*                         local streaming support                            */
/* -------------------------------------------------------------------------- */

/**
 * Range-aware local streaming used by GET /api/files/:key
 */
export function streamLocal(k, req, res) {
  const p = join(LOCAL_DIR, k);

  if (!existsSync(p)) {
    return res.status(404).json({ error: "Not found" });
  }

  const size = statSync(p).size;
  const range = req.headers.range;

  if (range) {
    const [startStr, endStr] = range
      .replace(/bytes=/, "")
      .split("-");

    const start = Number(startStr);
    const end = endStr ? Number(endStr) : size - 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
    });

    return createReadStream(p, {
      start,
      end,
    }).pipe(res);
  }

  res.writeHead(200, {
    "Content-Length": size,
    "Accept-Ranges": "bytes",
  });

  createReadStream(p).pipe(res);
}

/* -------------------------------------------------------------------------- */

export const isLocal = DRIVER !== "s3" && DRIVER !== "cloudinary";