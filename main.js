const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow

const path = require("path")
const url = require('url')

// const size = electronScreen.getPrimaryDisplay().size

const WINDOW_WIDTH =  1920 //`${size.width}`
const WINDOW_HEIGHT = 1080 //`${size.height}`
const ipc = require('electron').ipcMain
const dialog = require('electron').dialog
const fs = require('fs')
const $ = require('jquery')
const Tray = electron.Tray

let mainWindow
let library
let appIcon = null

function createWindow () {
    // create the browser Window
    mainWindow = new BrowserWindow({width: WINDOW_WIDTH, height : WINDOW_HEIGHT})

    mainWindow.setMenu(null);
    // and load the index.html of app
    mainWindow.loadURL(url.format({
        pathname : path.join(__dirname,"index.html"),
        protocol : 'file:',
        slashes : true 
    }))

    mainWindow.on('closed', function(){
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
    console.log("Window Created.");

}
// Occurs after Electron has finished initialization
// and is ready to create browser Windows.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
  event.sender.send('initialize')
})

ipc.on('open-file-dialog', function (event) {
  dialog.showOpenDialog({
    properties: ['openDirectory','multiSelections']
  }, function (files) {
    // console.log(files)
    if (files) event.sender.send('selected-directory', files)
  })
})

ipc.on('put-in-tray', function (event) {
  const iconName = process.platform === 'win32' ? 'windows-icon.png' : 'iconTemplate.png'
  const iconPath = path.join(__dirname, iconName)
  appIcon = new Tray(iconPath)
  const contextMenu = Menu.buildFromTemplate([{
    label: 'Remove',
    click: function () {
      event.sender.send('tray-removed')
    }
  }])
  appIcon.setToolTip('Series-Watcher in the tray.')
  appIcon.setContextMenu(contextMenu)
})

ipc.on('remove-tray', function () {
  appIcon.destroy()
})

// var isOnline = require('is-online');
// setInterval(function(){
//   isOnline(function(err,online){
//     if(err)
//       console.log("Offline")
//     else
//     console.log(online);
//   });
// },1000)
