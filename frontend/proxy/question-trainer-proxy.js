const net = require('node:net');

const listenHost = process.env.MOBILE_PROXY_HOST || '0.0.0.0';
const listenPort = Number(process.env.MOBILE_PROXY_PORT || 9988);
const targetHost = process.env.MOBILE_PROXY_TARGET_HOST || '127.0.0.1';
const targetPort = Number(process.env.MOBILE_PROXY_TARGET_PORT || 4200);

const server = net.createServer((clientSocket) => {
  const upstreamSocket = net.createConnection({ host: targetHost, port: targetPort });

  clientSocket.pipe(upstreamSocket);
  upstreamSocket.pipe(clientSocket);

  const closeBothSockets = () => {
    clientSocket.destroy();
    upstreamSocket.destroy();
  };

  clientSocket.on('error', closeBothSockets);
  upstreamSocket.on('error', closeBothSockets);
});

server.listen(listenPort, listenHost, () => {
  console.log(`Question Trainer mobile proxy listening on http://${listenHost}:${listenPort}`);
  console.log(`Forwarding to http://${targetHost}:${targetPort}`);
});

server.on('error', (error) => {
  console.error('Could not start Question Trainer mobile proxy.');
  console.error(error.message);
  process.exit(1);
});
