const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let pythonProcess;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, '../static/icon.png'),
        title: 'Face Analysis'
    });

    // Load the FastAPI app
    mainWindow.loadURL('http://localhost:8000');

    // Open DevTools in development mode
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startPythonBackend() {
    // Start the Python FastAPI server
    pythonProcess = spawn('python', ['main.py'], {
        stdio: 'inherit'
    });

    pythonProcess.on('error', (err) => {
        console.error('Failed to start Python backend:', err);
        app.quit();
    });

    // Wait for the server to start
    return new Promise((resolve) => {
        setTimeout(resolve, 2000); // Give the server 2 seconds to start
    });
}

// App ready
app.whenReady().then(async () => {
    try {
        await startPythonBackend();
        createWindow();
    } catch (error) {
        console.error('Failed to start application:', error);
        app.quit();
    }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (pythonProcess) {
            pythonProcess.kill();
        }
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Cleanup on quit
app.on('before-quit', () => {
    if (pythonProcess) {
        pythonProcess.kill();
    }
}); 