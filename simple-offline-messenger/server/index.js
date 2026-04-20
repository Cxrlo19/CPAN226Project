const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static frontend files from Vite build output (dist)
app.use(express.static(path.join(__dirname, '../client/dist')));


const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients with more info
const clients = new Map();

// Generate unique client ID
function generateClientId() {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  const clientId = generateClientId();
  clients.set(clientId, { 
    ws, 
    id: clientId,
    username: null,
    room: null
  });
  
  console.log(`New client connected: ${clientId}. Total clients: ${clients.size}`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const client = clients.get(clientId);
      
      if (!client) {
        console.error('Client not found for id:', clientId);
        return;
      }
      
      // Handle different message types
      switch (data.type) {
        case 'join':
          // Client joins with username
          client.username = data.username || `User${clientId.substring(0, 5)}`;
          client.room = data.room || 'default';
          console.log(`${client.username} joined room ${client.room} (ID: ${clientId})`);
          
          // Notify others in the room
          let notifiedCount = 0;
          clients.forEach((c, id) => {
            if (id !== clientId && 
                c.ws.readyState === WebSocket.OPEN && 
                c.room === client.room) {
              c.ws.send(JSON.stringify({
                type: 'system',
                message: `${client.username} has joined the room`,
                timestamp: Date.now()
              }));
              notifiedCount++;
            }
          });
          console.log(`Notified ${notifiedCount} clients about join`);
          
          // Send confirmation to joiner
          client.ws.send(JSON.stringify({
            type: 'joined',
            room: client.room,
            timestamp: Date.now()
          }));
          break;
          
        case 'message':
          // Validate we have a username and room
          if (!client.username || !client.room) {
            console.error('Client not properly joined:', clientId);
            client.ws.send(JSON.stringify({
              type: 'error',
              message: 'Please join a room first'
            }));
            return;
          }
          
          // Broadcast message to others in the same room
          const msg = {
            type: 'message',
            from: client.username,
            content: data.content,
            timestamp: Date.now(),
            clientId: clientId // Include for debugging
          };
          
          let sentCount = 0;
          clients.forEach((c, id) => {
            if (id !== clientId && 
                c.ws.readyState === WebSocket.OPEN && 
                c.room === client.room) {
              try {
                c.ws.send(JSON.stringify(msg));
                sentCount++;
              } catch (sendError) {
                console.error('Failed to send message to client', id, sendError);
              }
            }
          });
          
          console.log(`Message from ${client.username} sent to ${sentCount} other clients in room ${client.room}`);
          
          // Also send back to sender for confirmation (optional)
          client.ws.send(JSON.stringify({
            type: 'messageSent',
            message: data.content,
            timestamp: Date.now()
          }));
          break;
          
        default:
          console.log('Unknown message type from client', clientId, ':', data.type);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type'
          }));
      }
    } catch (e) {
      console.error('Error parsing message from client', clientId, ':', e);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });
  
  ws.on('close', () => {
    const client = clients.get(clientId);
    if (client) {
      console.log(`Client disconnected: ${client.username || clientId} (ID: ${clientId})`);
      
      // Notify others in the room
      if (client.username && client.room) {
        let notifiedCount = 0;
        clients.forEach((c, id) => {
          if (id !== clientId && 
              c.ws.readyState === WebSocket.OPEN && 
              c.room === client.room) {
            c.ws.send(JSON.stringify({
              type: 'system',
              message: `${client.username} has left the room`,
              timestamp: Date.now()
            }));
            notifiedCount++;
          }
        });
        console.log(`Notified ${notifiedCount} clients about leave`);
      }
      
      clients.delete(clientId);
      console.log(`Client removed. Total clients: ${clients.size}`);
    } else {
      console.log(`Client disconnected: Unknown client (ID: ${clientId})`);
    }
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
});

// Periodic cleanup of stale clients (optional)
setInterval(() => {
  const now = Date.now();
  let staleCount = 0;
  
  clients.forEach((client, id) => {
    // If websocket is closed, remove it
    if (client.ws.readyState === WebSocket.CLOSED) {
      clients.delete(id);
      staleCount++;
    }
  });
  
  if (staleCount > 0) {
    console.log(`Cleaned up ${staleCount} stale clients. Remaining: ${clients.size}`);
  }
}, 30000); // Every 30 seconds

// REST endpoint for health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    connectedClients: clients.size
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready at ws://localhost:${PORT}`);
});

module.exports = server;