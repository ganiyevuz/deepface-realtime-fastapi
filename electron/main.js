const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let pythonProcess;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // Required for local development
        },
        icon: path.join(__dirname, '../static/icon.png')
    });

    // Load the FastAPI app
    const startUrl = isDev ? 'http://localhost:8000' : 'http://localhost:8000';
    mainWindow.loadURL(startUrl);

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
    // Python binary from virtualenv (development)
    const pythonPath = isDev 
        ? path.join(__dirname, '../venv/bin/python') 
        : path.join(process.resourcesPath, 'python');

    // Path to main.py inside backend folder
    const scriptPath = isDev 
        ? path.join(__dirname, '../backend/main.py') 
        : path.join(process.resourcesPath, 'backend', 'main.py');

    console.log('Starting Python with:', pythonPath, scriptPath);

    pythonProcess = spawn(pythonPath, [scriptPath], {
        stdio: 'pipe'
    });

    pythonProcess.stdout.on('data', (data) => {
        console.log(`[PYTHON STDOUT]: ${data.toString()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`[PYTHON STDERR]: ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python Backend exited with code ${code}`);
        if (code !== 0 && mainWindow) {
            mainWindow.webContents.send('backend-error', 'Backend process terminated unexpectedly');
        }
    });
}


// App ready
app.whenReady().then(() => {
    startPythonBackend();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
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

// Handle app quit
app.on('before-quit', () => {
    if (pythonProcess) {
        pythonProcess.kill();
    }
});

// Handle IPC messages
ipcMain.on('restart-backend', () => {
    if (pythonProcess) {
        pythonProcess.kill();
    }
    startPythonBackend();
}); 