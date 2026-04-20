# Secure Offline Messenger (PWA - React Fullstack)

A Progressive Web App (PWA) offline-first messaging application built with React, Node.js, and Vite. The system features WebSocket-based real-time communication, End-to-End Encryption using the Web Crypto API, and robust offline message queuing via Service Workers.

---

## 1. Core Features

*   **Modern React Architecture**: Built with React 18 and Vite for optimized state management and performance.
*   **Bidirectional Communication**: Real-time message exchange via WebSockets over TCP.
*   **Offline-First Capabilities**: Installable Progressive Web App with local caching driven by Service Workers.
*   **Zero-Trust Security Framework**: End-to-End Encryption (AES-GCM 256) with key derivation performed via PBKDF2 (100,000 iterations).
*   **Dynamic Status Monitoring**: Native detection of network availability with visual indicators.
*   **Persistent Offline Queueing**: Automatic encryption and local storage of messages during network outages.

---

## 2. Installation and Execution

### Development Environment

To run the application with hot-reloading for both backend and frontend:

1.  **Configure Backend Server (Port 5000)**
    ```bash
    cd server
    npm install
    npm start
    ```

2.  **Configure React Frontend (Port 5173)**
    ```bash
    cd client
    npm install
    npm run dev
    ```

### Production Environment

The Node.js server is architected to serve the optimized production build of the React application:

1.  **Generate Production Build**
    ```bash
    cd client
    npm run build
    ```

2.  **Start Integrated Server**
    ```bash
    cd server
    npm start
    ```
3.  The application will be accessible at `http://localhost:5000`.

---

## 3. Technical Implementation Details

*   **Frontend**: React 18, Vite, Lucide Icons, Web Crypto API.
*   **Backend**: Node.js, Express, WebSocket (`ws`).
*   **Networking**: TCP-based WebSockets for reliable, bidirectional communication.
*   **Data Persistence**: `localStorage` utilized for persistent offline message storage.
*   **Security Standards**: PBKDF2 for key derivation; AES-GCM for 256-bit data encryption.

