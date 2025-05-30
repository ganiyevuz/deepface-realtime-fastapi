const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'electron',
    {
        // Send messages to main process
        send: (channel, data) => {
            ipcRenderer.send(channel, data);
        },
        // Receive messages from main process
        receive: (channel, func) => {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        },
        // Get app version
        getVersion: () => process.env.npm_package_version,
        // Check if running in development
        isDev: () => process.env.NODE_ENV === 'development'
    }
); 