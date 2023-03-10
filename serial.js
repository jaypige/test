const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const fs = require('fs');
  // serialPort.open(function (err) {
  //   if (err) {
  //     return console.log('Error opening port: ', err.message);
  //   }
  
  //   console.log('Port opened');
  // });

const storage_dict = {};
const app = express();
app.use(express.static(path.join(__dirname, 'build')));
console.log(path.join(__dirname, 'build'));
// Catch all requests and return the React app

const server = http.createServer(app);
const webSocket = socketIO(server);

if (!webSocket.connected) {
  app.get('*', (req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    res.sendFile(filePath);

});

  webSocket.on('connection', (socket) => {
    const serialPort = new SerialPort({
      path: 'COM6',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      bufferSize: 1024 
      });
      const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))

    console.log('A user connected');
    socket.on('message', (message) => {
      serialPort.write(message, (err) => {
        if (err) {
          console.log('Error on write: ', err.message);
        } else {
          console.log('Data sent successfully');
        }
      });
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected');
      serialPort.write("q");
      serialPort.flush();
      serialPort.close();
      const jsonData = JSON.stringify(storage_dict);
      fs.writeFile('data'+Date.now().toString()+'.json', jsonData, (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log('Data written to file');
      });
    });
    parser.on('data', (line) => {
      let buffer = '';
      if (line.endsWith('x')) {        
        line = line.slice(0,-1);
        if (!(line[0] in storage_dict)) {
          storage_dict[line[0]] = {};
        }
        if (!(line[1] in storage_dict[line[0]])) {
          storage_dict[line[0]][line[1]] = [];
        }
        storage_dict[line[0]][line[1]].push(line.slice(2));
        const message = buffer + line;  
        buffer = '';  
        console.log('Received message:', message);
        socket.emit('message', message);  
      } else {
        buffer += line;
      }
    });
  });
  server.listen(3000, () => {
    console.log('Server is running on port 3000');
  });
}
else{
  console.log("Session is already active")
}
