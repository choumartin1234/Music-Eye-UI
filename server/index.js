const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';

const app = require('next')({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const expressApp = require('express')();

  const server = require('http').createServer(expressApp);

  const { createSocketIOServer } = require('./io');
  const io = createSocketIOServer(server);

  expressApp.use(
    require('cookie-session')({
      secret: process.env.SESSION_SECRET,
      httpOnly: true,
    }),
  );

  expressApp.use(
    require('express-fileupload')({
      useTempFiles: true,
      tempFileDir: '/tmp/',
    }),
  );

  expressApp.use((req, res, next) => {
    if (!req.session.id) {
      req.session.id = require('uuid').v4();
    }
    req.io = io;
    next();
  });

  expressApp.post('/api/upload', require('./upload'));

  expressApp.all('*', (req, res) => handle(req, res));

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
