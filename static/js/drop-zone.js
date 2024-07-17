export function fade(dropZoneElement, success = true) {
  const className = success ? "success" : "error";
  dropZoneElement.classList.add(className);
  setTimeout(() => {
    dropZoneElement.classList.add("fade");
    dropZoneElement.classList.remove(className);
    setTimeout(() => {
      dropZoneElement.classList.remove("fade");
    }, 500);
  }, 100);
}

function loadFromFile(dropZoneElement, fileElement, loader) {
  const files = fileElement.files;
  if (files.length > 0) {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = fileEvent => {
      const text = reader.result;
      const success = loader(JSON.parse(text));
      fade(dropZoneElement, success);
    };
    reader.readAsText(file);
  }
}

export function createDropZone(element, loader) {
  element.addEventListener("dragenter", event => {
    event.stopPropagation();
    event.preventDefault();
    element.classList.add("active");
  }, false);
  element.addEventListener("dragleave", event => {
    event.stopPropagation();
    event.preventDefault();
    element.classList.remove("active");
  }, false);
  element.addEventListener("dragover", event => {
    event.stopPropagation();
    event.preventDefault();
    element.classList.add("active");
  }, false);
  element.addEventListener("drop", event => {
    event.stopPropagation();
    event.preventDefault();
    element.classList.remove("active");
    loadFromFile(element, event.dataTransfer, loader);
  }, false);
  
  const picker = element.querySelector("input[type='file']");
  if (picker !== null) {
    picker.addEventListener("change", (event) => {
      loadFromFile(element, picker, loader);
    });
  }
}
