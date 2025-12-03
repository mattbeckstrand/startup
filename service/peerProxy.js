const { WebSocketServer } = require('ws');

function peerProxy(httpServer) {
  const socketServer = new WebSocketServer({ server: httpServer });

  const connections = new Map();

  socketServer.on('connection', (socket) => {
    socket.isAlive = true;

    socket.on('message', function message(data) {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'connect') {
            connections.set(msg.userId, socket); 
        }
        if (msg.type === 'dm') {
            socketServer.clients.forEach((client) => {
                if (client.readyState === 1 && client !== socket) {
                    client.send(JSON.stringify(msg));
                }
            });
        }
    });


    socket.on('pong', () => {
      socket.isAlive = true;
    });
  });

  // Periodically send out a ping message to make sure clients are alive
  setInterval(() => {
    socketServer.clients.forEach(function each(client) {
      if (client.isAlive === false) return client.terminate();

      client.isAlive = false;
      client.ping();
    });
  }, 10000);
}

module.exports = { peerProxy };