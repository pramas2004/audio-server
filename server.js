const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e8 }); // मोठ्या इमेज फाईल्ससाठी बफर साईझ वाढवली

const activeChildren = {}; 

io.on('connection', (socket) => {
    
    socket.on('registerChild', (data) => { 
        socket.join(data.email);
        socket.email = data.email;
        socket.isChild = true;
        if (!activeChildren[data.email]) activeChildren[data.email] = [];
        activeChildren[data.email] = activeChildren[data.email].filter(c => c.id !== socket.id);
        activeChildren[data.email].push({ id: socket.id, name: data.name });
        socket.to(data.email).emit('updateChildrenList', activeChildren[data.email]);
    });

    socket.on('registerParent', (email) => {
        socket.join(email);
        if (activeChildren[email]) socket.emit('updateChildrenList', activeChildren[email]);
    });

    // ऑडिओ आणि व्हिडिओ चालू/बंद करण्याच्या कमांड्स
    socket.on('startRecording', (childId) => socket.to(childId).emit('startRecording'));
    socket.on('stopRecording', (childId) => socket.to(childId).emit('stopRecording'));
    
    socket.on('startVideo', (childId) => socket.to(childId).emit('startVideo'));
    socket.on('stopVideo', (childId) => socket.to(childId).emit('stopVideo'));

    // डेटा ट्रान्सफर
    socket.on('audioStream', (data) => socket.to(data.email).emit('audioPlay', data.audioChunk));
    socket.on('videoStream', (data) => socket.to(data.email).emit('videoFrame', data.frame)); 

    socket.on('disconnect', () => {
        if (socket.isChild && socket.email && activeChildren[socket.email]) {
            activeChildren[socket.email] = activeChildren[socket.email].filter(c => c.id !== socket.id);
            socket.to(socket.email).emit('updateChildrenList', activeChildren[socket.email]);
        }
    });
});

server.listen(3000, () => console.log('Server Running with Video Support'));