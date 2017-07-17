require('dotenv').config();

const path = require('path');
const Promise = require("bluebird");

var self = {

  createThumbnail: function (event) {

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
        let thumbPath = path.resolve(parsedPath.dir, parsedPath.name) + '_thumb' + parsedPath.ext;

        return bucket.file(filename).download({
          destination: localFile
        })
        .then(value => {
          console.log(`Downloaded file to ${localFile}`);
          const im = require('imagemagick');
          
          // Promises FTW!
          var resize = Promise.promisify(im.resize);

          return resize({
            srcPath: localFile,
            dstPath: thumbPath,
            width: process.env.THUMB_WIDTH,
            height: process.env.THUMB_HEIGHT         
          });
        })
        .then(value => {
          console.log(`Created thumbnail in ${thumbPath}`);
          let outBucket = storage.bucket(process.env.OUT_BUCKET);
          return outBucket.upload(thumbPath);
        })
        .then(value => {
            console.log(`Uploaded thumbnail to ${process.env.OUT_BUCKET}`);
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