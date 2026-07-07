// import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// export const uploadToR2 = async (key, buffer, contentType) => {
//   const s3 = new S3Client({
//     region: "auto",
//     endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
//     credentials: {
//       accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
//       secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY
//     }
//   });

//   const command = new PutObjectCommand({
//     Bucket: process.env.CLOUDFLARE_R2_BUCKET,
//     Key: key,
//     Body: buffer,
//     ContentType: contentType,
//     ContentDisposition: "inline",
//     CacheControl: "public, max-age=31536000, immutable"
//   });

//   await s3.send(command);
// };

// export const deleteFromR2 = async (key) => {
//   // Initialize client inside the function
//   const s3 = new S3Client({
//     region: "auto",
//     endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
//     credentials: {
//       accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
//       secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY
//     }
//   });

//   const command = new DeleteObjectCommand({
//     Bucket: process.env.CLOUDFLARE_R2_BUCKET,
//     Key: key
//   });

//   await s3.send(command);
// };