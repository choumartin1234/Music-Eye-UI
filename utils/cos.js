const COS = require('cos-nodejs-sdk-v5');

const secretId = process.env.TENCENT_SECRET_ID;
const secretKey = process.env.TENCENT_SECRET_KEY;
const region = process.env.TENCENT_COS_REGION;
const bucket = process.env.TENCENT_COS_BUCKET;

const cos = new COS({
  SecretId: secretId,
  SecretKey: secretKey,
});

module.exports = {
  upload(name, path) {
    return new Promise((resolve, reject) => {
      cos.sliceUploadFile(
        {
          Bucket: bucket,
          Region: region,
          Key: name,
          FilePath: path,
        },
        (err, data) => {
          if (err) reject(err);
          else resolve(data);
        },
      );
    });
  },
  uploadBuffer(name, buffer) {
    return new Promise((resolve, reject) => {
      cos.putObject(
        {
          Bucket: bucket,
          Region: region,
          Key: name,
          Body: buffer,
        },
        (err, data) => {
          if (err) reject(err);
          else resolve(data);
        },
      );
    });
  },
  getObjectUrl(name) {
    return new Promise((resolve, reject) => {
      cos.getObjectUrl(
        {
          Bucket: bucket,
          Region: region,
          Key: name,
          Method: 'GET',
          Sign: true,
          Expires: 60 * 60,
        },
        (err, data) => {
          if (err) reject(err);
          else resolve(data);
        },
      );
    });
  },
};
