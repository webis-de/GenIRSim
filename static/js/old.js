// SIMULATION

function chatBubbleHandler(side) {
  const chatElement = document.getElementById("chat");

  return function() {
    const bubbleElement = document.createElement("div");
    bubbleElement.classList.add("bubble", side);
    chatElement.appendChild(bubbleElement);

    const loaderElement = document.createElement("span");
    loaderElement.classList.add("loader");
    bubbleElement.appendChild(loaderElement)

    chatElement.scrollTo({top: chatElement.scrollHeight, behavior: "smooth"});

    let text = ""
    return function(moreText) {
      text += moreText;
      bubbleElement.textContent = text;
      chatElement.scrollTo({top: chatElement.scrollHeight, behavior: "smooth"});
    };
  }
}

async function simulate(configuration) {
  document.getElementById("chat").innerHTML = "";
  document.getElementById("log").innerHTML = "";

  try {
    chatBubbleHandler("topic")()(configuration.simulation.topic.description);
    const simulation = await simulations.simulate(configuration.simulation, users, systems, log, chatBubbleHandler("user"), chatBubbleHandler("system"));
    chatBubbleHandler("info")()("Simulation ended after " + simulation.turns.length + "/" + configuration.simulation.maxTurns + " turns");
    return simulation;
  } catch (error) {
    chatBubbleHandler("error")()("ERROR during simulation: " + error.message);
    addRestart(executeBoth);
    throw(error);
  }
}


// EVALUATION

function evaluationScoreHandler(turnIndex, measureName) {
  const turnElement = document.querySelectorAll(".bubble.system")[turnIndex];
  let scoresElement = turnElement.querySelector(".scores");
  if (scoresElement === null) {
    scoresElement = document.createElement("div");
    scoresElement.classList.add("scores");
    turnElement.appendChild(scoresElement);
  }

  const badgeElement = document.createElement("span");
  badgeElement.classList.add("badge");
  badgeElement.setAttribute("data-measure", measureName);
  scoresElement.appendChild(badgeElement)

  const labelElement = document.createElement("label");
  labelElement.textContent = measureName;
  badgeElement.appendChild(labelElement);

  const scoreElement = document.createElement("span");
  badgeElement.appendChild(scoreElement);

  const loaderElement = document.createElement("span");
  loaderElement.classList.add("loader");
  scoreElement.appendChild(loaderElement)

  badgeElement.scrollIntoView({block: "end", behavior:"smooth"});

  return function(evaluation) {
    const score = evaluation.score;
    scoreElement.textContent = score.toFixed(2);
    badgeElement.setAttribute("data-score", score);
    badgeElement.setAttribute("data-evaluation", JSON.stringify(evaluation));
    if ("explanation" in evaluation) {
      badgeElement.setAttribute("title", evaluation.explanation);
    }
  }
}

async function evaluateSimulation(configuration, simulation) {
  for (const scoresElement of Array.from(document.querySelectorAll(".scores"))) {
    scoresElement.parentElement.removeChild(scoresElement); 
  }
  try {
    const evaluation = await simulations.evaluate(configuration.evaluation, simulation, evaluators, log, evaluationScoreHandler);
    chatBubbleHandler("info")()("Evaluation ended");

    const chatElement = document.getElementById("chat");
    chatElement.scrollTo({top: chatElement.scrollHeight, behavior: "smooth"});

    return evaluation;
  } catch (error) {
    chatBubbleHandler("error")()("ERROR during evaluation: " + error.message);
    addRestart(executeBoth);
    throw(error);
  }
}



// EXECUTION

let currentSimulation = null;
let currentEvaluation = null;

function addRestart(call) {
  const buttonsElement = document.createElement("div");
  buttonsElement.classList.add("buttons");
  document.querySelector(".bubble:last-child").appendChild(buttonsElement);

  const restartButtonElement = document.createElement("a");
  restartButtonElement.textContent = "restart";
  restartButtonElement.addEventListener("click", evt => {
    buttonsElement.parentElement.parentElement.removeChild(buttonsElement.parentElement);
    call();
  });
  buttonsElement.appendChild(restartButtonElement);

  const chatElement = document.getElementById("chat");
  chatElement.scrollTo({top: chatElement.scrollHeight, behavior: "smooth"});

  const startButton = document.getElementById("start");
  startButton.removeAttribute("disabled");
}

function addDownload(data, type) {
  const buttonsElement = document.createElement("div");
  buttonsElement.classList.add("buttons");
  document.querySelector(".bubble:last-child").appendChild(buttonsElement);

  const downloadButtonElement = document.createElement("a");
  downloadButtonElement.textContent = "download " + type;
  const dataEncoded = encodeURIComponent(JSON.stringify(data, null, 2));
  downloadButtonElement.setAttribute("href", "data:text/json;charset=utf8," + dataEncoded);
  const date = new Date().toJSON().replaceAll(/[:.]/g, "-");
  downloadButtonElement.setAttribute("download", type + "-" + date + ".json");
  buttonsElement.appendChild(downloadButtonElement);

  const chatElement = document.getElementById("chat");
  chatElement.scrollTo({top: chatElement.scrollHeight, behavior: "smooth"});
}

async function executeSimulation(configuration) {
  const startButton = document.getElementById("start");
  startButton.setAttribute("disabled", "true");
  currentSimulation = await simulate(configuration || getConfiguration());
  addDownload(currentSimulation, "simulation");
  startButton.removeAttribute("disabled");
}

async function executeEvaluation(configuration) {
  const startButton = document.getElementById("start");
  startButton.setAttribute("disabled", "true");
  currentEvaluation = await evaluateSimulation(configuration || getConfiguration(), currentSimulation);
  addDownload(currentEvaluation, "evaluation");
  startButton.removeAttribute("disabled");
}
