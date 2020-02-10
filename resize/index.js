require('dotenv').config();

const path = require('path');
const Promise = require("bluebird");

var self = {

  createThumbnail: function (event) {
    let thumbSizes = [
      {
        suffix: '__0_thumb',
        width: 100,
        height: 100
      },
      {
        suffix: '__1_mobile',
        width: 250,
        height: 250
      },
      {
        suffix: '__2_tablet',
        width: 500,
        height: 500
      },
      {
        suffix: '__3_large',
        width: 1200,
        height: 1200
      }
    ];

    const file = event.data;

    if (file.resourceState === 'not_exists') {
      // Delete event
      return true;
    } else {
      let filename = file.name;

      if(filename) {
        const storage = require('@google-cloud/storage')();

        console.log(`Triggered by create of file ${filename}`);

        let localFile = path.resolve('/tmp', filename);
        let bucket = storage.bucket(file.bucket);
        let parsedPath = path.parse(localFile);

        /*
         1. Download the file from GCS to local tmpfs
         2. Resize the image using imagemagick
         3. Write the resized image back to GCS (different bucket!)
         4. Profit
         */
        return bucket.file(filename).download({
          destination: localFile
        })
        .then(value => {
          console.log(`Downloaded file to ${localFile}`);
          const im = require('imagemagick');
          
          var resize = Promise.promisify(im.resize);
          let resizes = [];

          for (let i=0; i<thumbSizes.length; i++) {
            thumbSizes[i].thumbPath = path.resolve(parsedPath.dir, parsedPath.name)
              + thumbSizes[i].suffix + parsedPath.ext;
            resizes.push(resize({
              srcPath: localFile,
              dstPath: thumbSizes[i].thumbPath,
              width: thumbSizes[i].width,
              height: thumbSizes[i].height
            }).then(() => {
              console.log(`Created thumbnail(s) in ${thumbSizes[i].thumbPath}`);
              let outBucket = storage.bucket(process.env.OUT_BUCKET);
              return outBucket.upload(thumbSizes[i].thumbPath);
            }));
          }

          return Promise.all(resizes);
        })
        .then(value => {
          console.log(`Uploaded thumbnail(s) to ${process.env.OUT_BUCKET}`);
          return true;
        })
        .catch(err => {
          console.error(err);
        });        
      } else {
        console.err('Not a GCS event?');
        return 'Failed';
      }
    }
  }
};

module.exports = self;