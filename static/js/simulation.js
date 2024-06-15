import { Mutex } from 'https://cdn.jsdelivr.net/npm/async-mutex@0.5.0/+esm';

const logElement = document.getElementById("messages");
let lastEntry = {};
let logContainerElement = null;
function log(logEntry) {
  if (logEntry.source !== lastEntry.source || logEntry.action !== lastEntry.action) {
    if (logContainerElement !== null) {
      logContainerElement.parentElement.removeAttribute("open");
    }
    const logContainerParentElement = document.createElement("details");
    const logContainerTitleElement = document.createElement("summary");
    logContainerTitleElement.setAttribute("open", "");
    logContainerTitleElement.setAttribute("data-time", logEntry.time);
    logContainerTitleElement.setAttribute("data-source", logEntry.source);
    logContainerTitleElement.setAttribute("data-action", logEntry.action);
    logContainerTitleElement.textContent = logEntry.source + ": " + logEntry.action;
    logContainerParentElement.appendChild(logContainerTitleElement);
    logContainerElement = document.createElement("div");
    logContainerParentElement.appendChild(logContainerElement);
    logElement.appendChild(logContainerParentElement);
  }

  if (logEntry.data !== undefined) {
    if (typeof(logEntry.data) === "string") {
      logContainerElement.textContent += logEntry.data;
    } else {
      logContainerElement.textContent += "\n" + JSON.stringify(logEntry.data);
    }
  }

  logElement.scrollTop = logElement.scrollHeight;
  lastEntry = logEntry;
}


export async function run(configuration) {
  const url = window.location.protocol.replace("http", "ws")
    + "//" + window.location.host;
  const mutex = new Mutex();
  const socket = new WebSocket(url);
  socket.onmessage = async (event) => {
    const release = await mutex.acquire();
    const message = JSON.parse(event.data);
    if (message.source) { // logEntry
      log(message);
    } else if (message.overallEvaluations) { // final result
      console.log(message);
    } else { // something else => error
      console.error(message);
    }
    release();
  };
  socket.onopen = (event) => {
    socket.send(JSON.stringify(configuration));
  };
}

