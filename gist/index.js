const path = require('path');
const fs = require('fs');
const GitHubApi = require('github');
var github = new GitHubApi({});

var self = {

  createGist: function (event) {

    const file = event.data;

    if (file.resourceState === 'not_exists') {
      // Delete event
      return true;
    } else {
      let filename = file.name;

      if(filename.split('.').pop() === "json") { // only create gists of json files
        const storage = require('@google-cloud/storage')();

        console.log(`Triggered by create of file ${filename}`);

        let localFile = path.resolve('/tmp', filename);
        let bucket = storage.bucket(file.bucket);

        return bucket.file(filename).download({
          destination: localFile
        }).then(value => {

          console.log(`Downloaded file to ${localFile}`);

          let parsedPath = path.parse(localFile);
          let labelsName = parsedPath.name + '_labels.json';
          let filedata = fs.readFileSync(localFile, 'utf8');

          return github.gists.create({
              "files": {
                  "vision-response.json": {
                      content: filedata
                  }
              },
              "public": true,
              "description": `Vision API labels for ${localFile}`
          }, function(err, res) {
              if (err) {
                  console.log(err);
              } else {
                  console.log(`Gist created successfully at url: ${res.data.html_url}`);
              }
          });
        });
      } else {
        console.err('Not a GCS event?');
        return 'Failed';
      }
    }
  }
};

module.exports = self;