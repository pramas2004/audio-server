const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// सर्व्हर ॲक्टिव्ह आहे का हे तपासण्यासाठी साधा रूट
app.get('/', (req, res) => {
  res.send('Audio Monitor Server is Live!');
});

const children = {}; // { pairingCode: { socketId, battery, location } }

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  // Child register hoto
  socket.on('register_child', (code) => {
    children[code] = { socketId: socket.id, battery: null, location: null };
    socket.pairingCode = code;
    socket.join(`room_${code}`); // Child ला रूममध्ये ॲड करणे आवश्यक
    console.log(`Child registered & joined room: ${code}`);
  });

  // Child kadun Battery ani Location updates
  socket.on('child_status_update', (data) => {
    const { code, battery, location } = data;
    if (children[code]) {
      children[code].battery = battery;
      children[code].location = location;
      // रूममधील Parent ला पाठवा
      socket.to(`room_${code}`).emit('parent_received_status', { battery, location });
    }
  });

  // Parent connect kartana verification
  socket.on('connect_parent', (code) => {
    if (children[code]) {
      socket.join(`room_${code}`);
      io.to(children[code].socketId).emit('parent_connected');
      socket.emit('parent_auth_success', {
        success: true,
        battery: children[code].battery,
        location: children[code].location
      });
      console.log(`Parent paired successfully with ${code}`);
    } else {
      socket.emit('parent_auth_error', 'Invalid pairing code or child is offline');
      console.log(`Invalid code attempt: ${code}`);
    }
  });

  // Audio chunk forwarding
  socket.on('audio_chunk', (data) => {
    socket.to(`room_${data.code}`).emit('audio_stream', data.data);
  });

  socket.on('disconnect', () => {
    if (socket.pairingCode && children[socket.pairingCode]) {
      io.to(`room_${socket.pairingCode}`).emit('child_disconnected');
      delete children[socket.pairingCode];
      console.log(`Child removed: ${socket.pairingCode}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
