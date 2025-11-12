Architecture Overview
This project is a real-time collaborative drawing application where multiple users can draw together on a shared canvas. The system uses WebSockets for continuous communication between the client and server.

----

Data Flow Diagram (Conceptual Overview)

User Action (Draw/Erase)  
        ↓  
Canvas.js (captures strokes, tool, color, size)  
        ↓  
WebSocket Client (websocket.js)  
        ↓  
Server (server.js + Socket.io)  
        ↓  
Broadcast to All Connected Clients  
        ↓  
Each Client’s Canvas.js updates in real time

-----

WebSocket Events
init – Sends initial user and canvas state
cursor – Updates user cursor positions
stroke:commit – Sends completed strokes
op:add – Adds and shares new operations
undo / redo – Global undo/redo across all users
user:join / user:leave – Handles user presence updates
Each message includes the user ID, tool, color, size, and stroke points.

-----

Undo/Redo Strategy
Undo and redo work globally.
When any user performs undo or redo, it affects everyone’s shared canvas.
The server tracks all drawing operations in order and updates clients accordingly to keep the canvas consistent.

-----

Performance and Conflict Handling
Canvas uses an offscreen buffer to avoid redrawing everything repeatedly.
Smooth curves are drawn using quadraticCurveTo for better stroke quality.
When multiple users draw at the same time, the latest stroke overwrites the previous one, keeping the canvas uniform for all.

-----

Summary
The system follows a simple flow — Client → Server → All Clients — ensuring that all drawing actions are instantly visible to every user with minimal delay.
This design keeps the application fast, synchronized, and easy to scale.

