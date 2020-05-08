function createSocketIOServer(httpServer) {
  const io = require('socket.io')(httpServer);

  io.on('connection', (client) => {
    console.log(`New Connection: ${client.id}`);
  });

  return io;
}

module.exports = createSocketIOServer;
