const config = require("config");
const router = require("express").Router();
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
  region: config.get("awsRegion"),
  credentials: {
    accessKeyId: config.get("awsAccessKeyId"),
    secretAccessKey: config.get("awsSecretAccessKey"),
  },
});

async function deleteProductGalleryFromS3(gallery) {
  const bucket = config.get("s3BucketName");

  await Promise.all(
    (gallery || []).map((url) => {
      try {
        const key = new URL(url).pathname.slice(1);
        const command = new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        });

        return s3.send(command);
      } catch (err) {
        return Promise.resolve();
      }
    })
  );
}

router.post("/get-presigned-url", async (req, res) => {
  const { filename, contentType } = req.body;
  const bucket = config.get("s3BucketName");
  const key = `uploads/${Date.now()}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ACL: undefined,
  });

  const url = await getSignedUrl(s3, command, {
    expiresIn: 60,
  });

  res.send({ url, key });
});

router.put("/delete-images", async (req, res) => {
  const bucket = config.get("s3BucketName");

  if (!req.body.gallery) {
    return res.status(400).send("Gallery is required");
  }

  await Promise.all(
    req.body.gallery.map((key) => {
      try {
        const command = new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        });

        return s3.send(command);
      } catch (err) {
        return Promise.resolve();
      }
    })
  );

  res.send("Images deleted successfully");
});

module.exports = router;
