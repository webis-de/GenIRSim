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
    if (logEntry.source === "controller") {
      logContainerTitleElement.textContent = logEntry.action;
    } else {
      logContainerTitleElement.textContent = logEntry.source + ": " + logEntry.action;
    }
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

function ensureScoreBadge(message) {
  let userTurnIndex = undefined;
  if (message.data !== undefined && message.data.userTurnIndex !== undefined) {
    userTurnIndex = message.data.userTurnIndex;
  } else {
    const match = message.action.match(/^turn ([0-9]*)/);
    if (match !== null) { userTurnIndex = parseInt(match[1]); }
  }

  let evaluator = undefined
  if (message.data !== undefined && message.data.evaluator !== undefined) {
    evaluator = message.data.evaluator;
  } else {
    const match = message.action.match(/^turn [0-9]* ([^\.]*)/);
    if (match !== null) { evaluator = match[1]; }
  }
  if (userTurnIndex === undefined || evaluator === undefined) { return null; }

  let scoreElement = document.querySelector(
    "#chat .badge[data-user-turn-index='"+userTurnIndex
    +"'][data-evaluator='"+evaluator+"'] .score");
  if (scoreElement !== null) { return scoreElement; }

  const turnElement =
    document.querySelectorAll(".bubble[data-source='system']")[userTurnIndex];
  if (turnElement === undefined) {
    throw new Error("No bubble for system turn " + userTurnIndex);
  }
  let scoresElement = turnElement.querySelector(".scores");
  if (scoresElement === null) {
    scoresElement = document.createElement("div");
    scoresElement.classList.add("scores");
    turnElement.appendChild(scoresElement);
  }

  const badgeElement = document.createElement("span");
  badgeElement.classList.add("badge");
  badgeElement.setAttribute("data-user-turn-index", userTurnIndex);
  badgeElement.setAttribute("data-evaluator", evaluator);
  scoresElement.appendChild(badgeElement)

  const labelElement = document.createElement("label");
  labelElement.classList.add("evaluator");
  labelElement.textContent = evaluator;
  badgeElement.appendChild(labelElement);

  scoreElement = document.createElement("span");
  scoreElement.classList.add("score");
  badgeElement.appendChild(scoreElement);

  const loaderElement = document.createElement("span");
  loaderElement.classList.add("loader");
  scoreElement.appendChild(loaderElement)

  badgeElement.scrollIntoView({block: "end", behavior:"smooth"});

  return scoreElement;
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
        if (message.action === "turn complete") {
          chatBubble.innerText = message.data.utterance;
        }
      } else if (message.source === "evaluation") {
        const scoreBadge = ensureScoreBadge(message);
        const data = message.data;
        if (scoreBadge !== null
            && message.action.match(/ result$/) !== null
            && data !== undefined && data.result !== undefined
            && data.result.score !== undefined) {
          scoreBadge.innerText = data.result.score.toFixed(2);
          if (data.result.explanation !== undefined) { 
            if (typeof(data.result.explanation) === "string") {
              scoreBadge.setAttribute("title", data.result.explanation);
            } else {
              scoreBadge.setAttribute("title",
                JSON.stringify(data.result.explanation));
            }
          }
        }
      }
    } else if (message.overallEvaluations) { // final result
      const chatBubble = ensureChatBubble("controller");
      const loaderElement = chatBubble.querySelector(".loader");
      if (loaderElement !== null) {
        loaderElement.parentElement.removeChild(loaderElement);
      }

      const buttonsElement = document.createElement("div");
      buttonsElement.classList.add("buttons");
      const buttonElement = document.createElement("a");
      const data = encodeURIComponent(JSON.stringify(message, null, 2));
      buttonElement.textContent = "download";
      buttonElement.setAttribute("href", "data:text/json;charset=utf8," + data);
      const date = new Date().toJSON().replaceAll(/[:.]/g, "-");
      buttonElement.setAttribute("download", "genirsim-evaluation-" + date + ".json");
      buttonsElement.appendChild(buttonElement);
      chatBubble.appendChild(buttonsElement);
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

