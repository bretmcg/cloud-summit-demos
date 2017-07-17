require('dotenv').config();

const path = require('path');

var self = {

  extractLabels: function (event) {

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
        let labelsName = parsedPath.name + '_labels.json';        

        return bucket.file(filename).download({
          destination: localFile
        })
        .then(value => {
          console.log(`Downloaded file to ${localFile}`);
          const vision = require('@google-cloud/vision')();
          return vision.detectLabels(localFile);
        })
        .then(labels => {
          console.log(`Extracted labels ${labels}`);
          let outBucket = storage.bucket(process.env.OUT_BUCKET);
          let outFile = outBucket.file(labelsName);
          return outFile.save(JSON.stringify(labels, null, ' '), {
            metadata: {
                contentType: 'application/json'
            }              
          });
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