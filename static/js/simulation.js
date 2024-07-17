import { Mutex } from 'https://cdn.jsdelivr.net/npm/async-mutex@0.5.0/+esm';

function get() {
  const downloadButtonElement = document.querySelector("[data-download='simulation']");
  if (downloadButtonElement === null) {
    console.error("No button for downloading the simulation");
    return false;
  }

  return JSON.parse(decodeURIComponent(
    downloadButtonElement.getAttribute("href").split(",",2)[1]));
}

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

function createDownloadButton(name, result) {
  const buttonElement = document.createElement("a");
  const data = encodeURIComponent(JSON.stringify(result, null, 2));
  buttonElement.textContent = name;
  buttonElement.setAttribute("href", "data:text/json;charset=utf8," + data);
  const date = new Date().toJSON().replaceAll(/[:.]/g, "-");
  buttonElement.setAttribute("download", "genirsim-" + name + "-" + date + ".json");
  buttonElement.setAttribute("data-download", name);
  return buttonElement;
}

function createResultBubble(result, simulationOnly) {
  const chatBubble = ensureChatBubble("controller");
  const loaderElement = chatBubble.querySelector(".loader");
  if (loaderElement !== null) {
    loaderElement.parentElement.removeChild(loaderElement);
  }

  const buttonsElement = document.createElement("div");
  buttonsElement.innerText = "Download: ";
  buttonsElement.classList.add("buttons");
  if (simulationOnly) {
    buttonsElement.appendChild(createDownloadButton("simulation", result));
  } else {
    buttonsElement.appendChild(createDownloadButton("simulation", result.simulation));
    buttonsElement.appendChild(createDownloadButton("evaluation", result));
  }
  chatBubble.appendChild(buttonsElement);

  document.getElementById("runEvaluation").removeAttribute("disabled");
}

export function load(simulation) {
  if (!(simulation.userTurns)) { return false; }

  bubbleElement = null;
  chatElement.innerHTML = '';
  for (const userTurn of simulation.userTurns) {
    ensureChatBubble("user").innerText = userTurn.utterance;
    ensureChatBubble("system").innerText = userTurn.systemResponse.utterance;
  }
  createResultBubble(simulation, true);
  return true;
}

export async function run(call, configuration) {
  const disabledButtons = new Set();
  for (const buttonElement of Array.from(document.querySelectorAll(".run-buttons button"))) {
    if (!buttonElement.hasAttribute("disabled")) {
      buttonElement.setAttribute("disabled", "");
      disabledButtons.add(buttonElement);
    }
  }

  const url = window.location.protocol.replace("http", "ws")
    + "//" + window.location.host;
  bubbleElement = null;
  let existingSimulation = null;
  if (call !== "evaluate") {
    chatElement.innerHTML = '';
  } else {
    existingSimulation = get();
    for (const scoresElement of Array.from(document.querySelectorAll(".scores"))) {
      scoresElement.parentElement.removeChild(scoresElement);
    }
    for (const controllerElement of Array.from(document.querySelectorAll("[data-source='controller']"))) {
      controllerElement.parentElement.removeChild(controllerElement);
    }
  }
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
          chatElement.scrollTo({top: chatElement.scrollHeight, behavior: "smooth"});
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
    } else if (message.userTurns) { // only simulation result
      createResultBubble(message, true);
    } else if (message.overallEvaluations) { // evaluation result
      createResultBubble(message, false);
    } else { // something else => error
      console.error(message);
    }
    release();
  };
  socket.onopen = (event) => {
    const data = {
      call: call,
      configuration: configuration
    };
    if (call == "evaluate") {
      data.simulation = existingSimulation;
    }
    socket.send(JSON.stringify(data));
  };
  socket.onclose = (event) => {
    loaderElement.parentElement.removeChild(loaderElement);
    loaderElement = null;
    for (const buttonElement of disabledButtons) {
      buttonElement.removeAttribute("disabled");
    }
  };
}


