const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';

const app = require('next')({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const expressApp = require('express')();

  expressApp.all('*', (req, res) => handle(req, res));

  const server = require('http').createServer(expressApp);

  require('./io')(server);

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
