require('dotenv/config');
const fs = require('fs');

module.exports = {
  api(method, handle) {
    return (req, res) => {
      if (req.method !== method) {
        return res.status(405).send('Method Not Allowed');
      }
      return handle(req, res);
    };
  },
  loadPlaylist(name) {
    try {
      return JSON.parse(
        fs.readFileSync(`data/playlist/${name}.json`).toString(),
      );
    } catch (err) {
      return [];
    }
  },
  savePlaylist(name, data) {
    try {
      fs.writeFileSync(
        `data/playlist/${name}.json`,
        Buffer.from(JSON.stringify(data)),
      );
    } catch (err) {
      //
    }
  },
};
