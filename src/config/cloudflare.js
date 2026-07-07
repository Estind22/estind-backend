// import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// export const r2 = new S3Client({
//     region: "auto",
//     endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
//     credentials: {
//         accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
//         secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY
//     }
// });

// export const uploadPdfToCloudFlare = async (key, buffer) => {
//     const response = await r2.send(
//         new PutObjectCommand({
//             Bucket: process.env.CLOUDFLARE_R2_BUCKET,
//             Key: key,
//             Body: buffer,
//             ContentType: "application/pdf"
//         })
//     );
//     return response;
// }

// export const deleteFromCloudFlare = async (key) => {
//     const response = await r2.send(
//         new DeleteObjectCommand({
//             Bucket: process.env.CLOUDFLARE_R2_BUCKET,
//             Key: key
//         })
//     );
//     return response;
// }