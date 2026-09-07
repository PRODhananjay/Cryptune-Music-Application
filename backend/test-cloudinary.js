import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const result = await cloudinary.uploader.upload("./test.m4a", {
  resource_type: "video",
  folder: "cryptune/test",
});

console.log("Upload successful!");
console.log("URL:", result.secure_url);
console.log("Public ID:", result.public_id);