var fs = require('fs');
var navigator = require('navigator');
var Gpio = require('onoff').Gpio;
var spawn = require('child_process').spawn;
var express = require('express');
var path = require('path');
var http = require('http');
var server = http.createServer((req, res) => {
    req.url = req.url.toString().split("?")[0];
    var type='text/html';
    if(req.url == "/") req.url = "index.html";
    if(req.url == "/images/image_stream.jpg"){
        req.url = __dirname + req.url;
	type = 'image/jpg';
    }
    fs.readFile(req.url, function(err, data){
        if(err){
            res.writeHead(404, {'Content-Type': type}); //display 404 on error
            return res.end("404 Not Found");
        }
        res.writeHead(200, {'Content-Type': type});
        res.write(data);
        return res.end();
    });
});
server.listen(8080, function(){
    console.log("Listening on port 8080");
});

var io = require('socket.io')(server);

const plantPins = {
  "basil": 17,
  "oregano": 27,
  "rosmary": 22
};
const plantOutputs = {};
for(var key in plantPins){
    plantOutputs[key] = new Gpio(plantPins[key], 'out');
}

var proc;

io.on('connection', function (socket) {// WebSocket Connection
    stopAllPlants();
    startCamera();
  socket.on('water', function(plant, on) {
    writePlant(plant, on);
  });
  socket.on('disconnect', function(){
    stopAllPlants();
    stopCamera();
  });
});

function startCamera(){
    var args = ["-w", "640", "-h", "480", "-o", "./images/image_stream.jpg", "-t", "999999999", "-tl", "50", "-n"];
    proc = spawn('raspistill', args);
}
function stopCamera(){
    if(proc) proc.kill();
    fs.unwatchFile('./images/image_stream.jpg');
}

function stopAllPlants(){
    for (var plant in plantPins){
        writePlant(plant, false);
    }
}
function writePlant(plant, on){
    if(!(plant in plantPins)){
        console.log("ERROR - Unknown Key: " + plant);
    }
    var output = on ? 0: 1;
    plantOutputs[plant].writeSync(output);
}
