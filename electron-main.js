const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Require the express server so it starts running
require('./server.js');

const PORT = 3000;

// Wait for the server to be ready before loading the window
function waitForServer(url, maxRetries = 30) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            attempts++;
            const http = require('http');
            http.get(url, (res) => {
                resolve();
            }).on('error', () => {
                if (attempts >= maxRetries) {
                    reject(new Error('Server did not start in time'));
                } else {
                    setTimeout(check, 500);
                }
            });
        };
        check();
    });
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true,
        title: "CMentor",
        show: false, // Don't show until ready
        backgroundColor: '#0a0a1a'
    });

    // Wait for the server, then load
    waitForServer(`http://localhost:${PORT}`).then(() => {
        mainWindow.loadURL(`http://localhost:${PORT}`);
        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
        });
    }).catch((err) => {
        console.error('Failed to connect to backend:', err);
        dialog.showErrorBox('Startup Error', 'CMentor backend failed to start. Please restart the application.');
        app.quit();
    });

    return mainWindow;
}

app.whenReady().then(() => {
    createWindow();

    // Check for updates with error handling
    try {
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
            console.warn('Auto-update check failed (this is normal for local builds):', err.message);
        });
    } catch (err) {
        console.warn('Auto-updater not available:', err.message);
    }

    autoUpdater.on('update-downloaded', () => {
        dialog.showMessageBox({
            type: 'info',
            title: 'Update Ready',
            message: 'A new version of CMentor has been downloaded. Restart the application to apply the updates.',
            buttons: ['Restart', 'Later']
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    });

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
