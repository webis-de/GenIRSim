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

export function load(configuration) {
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
}

export async function loadFromUrl(url) {
  return fetch(url)
    .then(response => response.json())
    .then(configuration => load(configuration));
}

export function loadFromFile(fileElement) {
  const files = fileElement.files;
  if (files.length > 0) {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = fileEvent => {
      const configurationText = reader.result;
      load(JSON.parse(configurationText));
    };
    reader.readAsText(file);
  }
}

{
  const dropZone = document.querySelector(".drop-zone[data-target='configuration']");
  dropZone.addEventListener("dragenter", event => {
    event.stopPropagation();
    event.preventDefault();
    dropZone.classList.add("active");
  }, false);
  dropZone.addEventListener("dragleave", event => {
    event.stopPropagation();
    event.preventDefault();
    dropZone.classList.remove("active");
  }, false);
  dropZone.addEventListener("dragover", event => {
    event.stopPropagation();
    event.preventDefault();
    dropZone.classList.add("active");
  }, false);
  dropZone.addEventListener("drop", event => {
    event.stopPropagation();
    event.preventDefault();
    dropZone.classList.remove("active");
    loadFromFile(event.dataTransfer);
  }, false);
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

export function download() {
  const downloadElement = document.createElement("a");
  downloadElement.style.display = "none";
  const data = encodeURIComponent(JSON.stringify(get(), null, 2));
  downloadElement.setAttribute("href", "data:text/json;charset=utf8," + data);
  const date = new Date().toJSON().replaceAll(/[:.]/g, "-");
  downloadElement.setAttribute("download", "genirsim-configuration-" + date + ".json");
  document.body.appendChild(downloadElement);
  downloadElement.click();
  document.body.removeChild(downloadElement);
}

