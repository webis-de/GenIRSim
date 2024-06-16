import { Mutex } from 'https://cdn.jsdelivr.net/npm/async-mutex@0.5.0/+esm';

const logElement = document.getElementById("messages");
let lastEntry = {};
let logContainerElement = null;
let loaderElement = null;
function log(logEntry) {
  if (logEntry.source !== lastEntry.source || logEntry.action !== lastEntry.action) {
    if (logContainerElement !== null) {
      logContainerElement.parentElement.removeAttribute("open");
    }
    const logContainerParentElement = document.createElement("details");
    logContainerParentElement.setAttribute("open", "");
    logContainerParentElement.setAttribute("data-time", logEntry.time);
    logContainerParentElement.setAttribute("data-source", logEntry.source);
    logContainerParentElement.setAttribute("data-action", logEntry.action);
    const logContainerTitleElement = document.createElement("summary");
    logContainerTitleElement.textContent = logEntry.source + ": " + logEntry.action;
    logContainerParentElement.appendChild(logContainerTitleElement);
    logContainerElement = document.createElement("div");
    logContainerParentElement.appendChild(logContainerElement);
    logElement.insertBefore(logContainerParentElement, loaderElement);
    if (logEntry.data === undefined) {
      logContainerParentElement.classList.add("empty");
    }
  }

  if (logEntry.data !== undefined) {
    if (typeof(logEntry.data) === "string") {
      logContainerElement.textContent += logEntry.data;
    } else {
      logContainerElement.textContent +=
        JSON.stringify(logEntry.data, null, 2).replaceAll(/\\n/g, "\n") + "\n";
    }
    logContainerElement.parentElement.classList.remove("empty");
  }

  logElement.scrollTop = logElement.scrollHeight;
  lastEntry = logEntry;
}

const chatElement = document.getElementById("chat");
let bubbleElement = null;
function ensureChatBubble(side) {
  if (bubbleElement === null || bubbleElement.getAttribute("data-source") !== side) {
    bubbleElement = document.createElement("div");
    bubbleElement.setAttribute("data-source", side);
    bubbleElement.classList.add("bubble");
    chatElement.appendChild(bubbleElement);

    const loaderElement = document.createElement("span");
    loaderElement.classList.add("loader");
    bubbleElement.appendChild(loaderElement)

    chatElement.scrollTo({top: chatElement.scrollHeight, behavior: "smooth"});
  }
  return bubbleElement;
}


export async function run(configuration) {
  const startButtonElement = document.getElementById("start");
  startButtonElement.setAttribute("disabled", "");
  const url = window.location.protocol.replace("http", "ws")
    + "//" + window.location.host;
  chatElement.innerHTML = '';
  logElement.innerHTML = '';
  loaderElement = document.createElement("span");
  loaderElement.classList.add("loader");
  logElement.appendChild(loaderElement);

  const mutex = new Mutex();
  const socket = new WebSocket(url);
  socket.onmessage = async (event) => {
    const release = await mutex.acquire();
    const message = JSON.parse(event.data);
    if (message.source) { // logEntry
      log(message);
      if (message.source === "user" || message.source === "system") {
        const chatBubble = ensureChatBubble(message.source);
        if (message.action === "turn") {
          chatBubble.innerText = message.data.utterance;
        }
      } else if (message.source === "evaluation"
        && message.action.match(/\.result$/) !== null) {
      }
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
  socket.onclose = (event) => {
    loaderElement.parentElement.removeChild(loaderElement);
    loaderElement = null;
    startButtonElement.removeAttribute("disabled");
  };
}

