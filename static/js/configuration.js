import * as dropZone from "./drop-zone.js";

function makeFoldable(title, open = false) {
  const element = document.createElement("details");
  const titleElement = document.createElement("summary");
  titleElement.innerText = title;
  element.appendChild(titleElement);
  if (open) { element.setAttribute("open", ""); }
  return element;
}

function makeInput(path, configuration) {
  const element = makeFoldable(path);
  let inputElement = null;
  if (typeof(configuration) === "object") {
    inputElement = document.createElement("textarea");
    inputElement.value = JSON.stringify(configuration, null, 2);
  } else {
    inputElement = document.createElement("input");
    inputElement.setAttribute("type", "text");
    inputElement.value = configuration;
  }
  inputElement.setAttribute("data-configuration", path);
  inputElement.setAttribute("data-type", typeof(configuration));
  element.appendChild(inputElement);
  return element;
}

function keysAre(configuration, keys) {
  if (Object.keys(configuration).length !== keys.length) { return false; }
  for (const key of keys) {
    if (configuration[key] === undefined) { return false; }
  }
  return true;
}

export function load(configuration) {
  if (keysAre(configuration, ["simulation", "evaluation"])
      || keysAre(configuration, ["simulation"])
      || keysAre(configuration, ["evaluation"])) {
    const editorElement = document.querySelector("#editor");
    editorElement.innerHTML = "";
    console.log("Loading configuration:\n" + JSON.stringify(configuration, null, 1));

    for (const key of Object.keys(configuration)) {
      const topElement = makeFoldable(key, true);
      editorElement.appendChild(topElement);
      for (const [subKey, subConfiguration] of Object.entries(configuration[key])) {
        const subElement = makeInput(key + "." + subKey, subConfiguration);
        topElement.appendChild(subElement);
      }
    }

    if (configuration.simulation && configuration.evaluation) {
      document.getElementById("downloadConfiguration").removeAttribute("disabled");
      document.getElementById("run").removeAttribute("disabled");
    } else {
      document.getElementById("downloadConfiguration").setAttribute("disabled", "");
      document.getElementById("run").setAttribute("disabled", "");
    }
    if (configuration.simulation) {
      document.getElementById("downloadConfigurationSimulation").removeAttribute("disabled");
      document.getElementById("runSimulation").removeAttribute("disabled");
    } else {
      document.getElementById("downloadConfigurationSimulation").setAttribute("disabled", "");
      document.getElementById("runSimulation").setAttribute("disabled", "");
    }
    if (configuration.evaluation) {
      document.getElementById("downloadConfigurationEvaluation").removeAttribute("disabled");
    } else {
      document.getElementById("downloadConfigurationEvaluation").setAttribute("disabled", "");
    }
    return true;
  } else if (keysAre(configuration, ["topic", "user", "system", "maxTurns"])) {
    return load({simulation: configuration});
  } else if (keysAre(configuration, ["evaluators"])) {
    return load({evaluation: configuration});
  } else {
    console.error("Invalid configuration");
    return false;
  }
}

export async function loadFromUrl(url) {
  return fetch(url)
    .then(response => response.json())
    .then(configuration => load(configuration));
}

export function get() {
  const configuration = {};
  for (const element of Array.from(document.querySelectorAll("[data-configuration]"))) {
    let scope = configuration;
    const path = element.getAttribute("data-configuration").split(".");
    for (let p = 0; p < path.length - 1; p += 1) {
      if (!(path[p] in scope)) { scope[path[p]] = {}; }
      scope = scope[path[p]];
    }
    switch (element.getAttribute("data-type")) {
      case 'string':
        scope[path[path.length - 1]] = element.value;
        break;
      case 'number':
        scope[path[path.length - 1]] = parseFloat(element.value);
        break;
      case 'object':
        scope[path[path.length - 1]] = JSON.parse(element.value);
        break;
    }
  }
  return configuration;
}

export function download(configuration, suffix = "") {
  const downloadElement = document.createElement("a");
  downloadElement.style.display = "none";
  const data = encodeURIComponent(JSON.stringify(configuration, null, 2));
  downloadElement.setAttribute("href", "data:text/json;charset=utf8," + data);
  const date = new Date().toJSON().replaceAll(/[:.]/g, "-");
  downloadElement.setAttribute("download",
    "genirsim-configuration" + suffix + "-" + date + ".json");
  document.body.appendChild(downloadElement);
  downloadElement.click();
  document.body.removeChild(downloadElement);
}

export function createExampleSelectOptions(selectElement) {
  const configurationDropZone = document.querySelector(".drop-zone[data-target='configuration']");
  const baseValue = selectElement.firstElementChild.value;
  selectElement.value = baseValue;
  const configurationDirectory = "configurations";
  const defaultConfiguration = "discussion.json"
  loadFromUrl(configurationDirectory + "/" + defaultConfiguration);
  fetch(configurationDirectory)
    .then(response => response.json())
    .then(configurationFiles => {
        for (const configurationFile of configurationFiles) {
          const optionElement = document.createElement("option");
          optionElement.innerText = configurationFile.split(".")[0];
          optionElement.setAttribute("value", configurationFile);
          selectElement.appendChild(optionElement);
        }
        selectElement.addEventListener("change", async event => {
          const value = selectElement.value;
          if (value.match("\.json$")) {
            const success = await loadFromUrl(configurationDirectory + "/" + value);
            dropZone.fade(configurationDropZone, success);
            setTimeout(() => {
              selectElement.value = baseValue;
            }, 500);
          }
        });
      });
}

