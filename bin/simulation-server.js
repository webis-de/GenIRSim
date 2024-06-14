#!/usr/bin/env node

import * as genirsim from "../src/index.js";


//////
// WEB SOCKET
////

import { WebSocketServer } from "ws";
const webSocketServer = new WebSocketServer({ noServer: true });
webSocketServer.on('connection', socket => {
  socket.on('message', async message => {
    try {
      const configuration = JSON.parse(message.toString());
      console.log("Running for: " + JSON.stringify(configuration));
      const evaluation = await genirsim.run(configuration,
        entry => socket.send(JSON.stringify(entry)));
      socket.send(JSON.stringify(evaluation));
      socket.close();
    } catch (error) {
      console.error(error);
    }
  });
});

//////
// HTTP SERVER
////

// source: https://developer.mozilla.org/en-US/docs/Learn/Server-side/Node_server_without_framework
import fs from "fs";
import http from "http";
import path from "path";
import process from "process";

const PORT = 8000;
const PATH = path.normalize(path.join(process.cwd(), "web"));

const MIME_TYPES = {
  default: "application/octet-stream",
  html: "text/html; charset=UTF-8",
  js: "application/javascript",
  css: "text/css"
};

const server = http.createServer(async (request, response) => {
    const file = path.normalize(path.join(PATH, request.url));
    if (!file.startsWith(PATH)
        || !fs.existsSync(file)
        || !fs.lstatSync(file).isFile()) {
      response.writeHead(404);
      response.end()
    } else {
      const mimeType = MIME_TYPES[path.extname(file).substring(1).toLowerCase()]
        || MIME_TYPES.default;
      response.writeHead(200, { "Content-Type": mimeType });
      fs.createReadStream(file).pipe(response);
    }
  });
server.on("upgrade", (request, socket, head) => {
  webSocketServer.handleUpgrade(request, socket, head, websocket => {
    webSocketServer.emit("connection", websocket, request);
  });
});
server.listen(PORT);




