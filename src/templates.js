/**
 * Static methods for filling in text templates.
 *
 * @module templates
 */

/**
 * Replaces occurrences of `{{path.to.variable}}` in the text with the
 * corresponding values in the context object (e.g., replace with
 * `context["path"]["to"]["variable"]`).
 *
 * If the input is not a string but an object or array, it is recursively cloned
 * and occurences in the contents are replaced. Numbers, boolean, etc. are
 * shallow copied.
 *
 * @param {any} text - The template text or an object or array structure that
 * contains template texts (among others)
 * @param {Object} context - The values of the variables that can be referenced
 * in the text
 * @param {boolean} [ignoreMissing] - Whether to ignore if a reference variable
 * does not exist in the context (not changing the text) instead of throwing an
 * error
 * @memberof templates
 */
export function render(text, context, ignoreMissing = false) {
  switch (typeof(text)) {
    case "string":
      let remainingText = text;
      let output = "";
      matchloop: while (true) {
        const matchStart = remainingText.search(/{{/);
        if (matchStart < 0) {
          output += remainingText;
          break;
        } else {
          output += remainingText.substr(0, matchStart);
          remainingText = remainingText.substr(matchStart + 2);

          const matchEnd = remainingText.search(/}}/);
          const path = remainingText.substr(0, matchEnd).trim().split(".");
          remainingText = remainingText.substr(matchEnd + 2);
          let scope = context;
          for (let p = 0; p < path.length; p += 1) {
            scope = scope[path[p]];
            if (scope === undefined) {
              if (ignoreMissing) {
                output += "{{" + path.join(".") + "}}";
                continue matchloop;
              } else {
                throw new Error("Context '" + path.join(".") + "' at position "
                  + p + " ('" + path[p] + "') does not exist in context");
              }
            }
          }
          if (Array.isArray(scope)) {
            if (scope.length > 0) {
              output += render("- " + scope.join("\\n- "), context, ignoreMissing);
            }
          } else {
            output += render(scope, context, ignoreMissing);
          }
        }
      }
      return output;
    case "object":
      if (Array.isArray(text)) {
        return text.map(entry => render(entry, context, ignoreMissing));
      } else {
        const clone = Object.assign({}, text);
        for ([key, value] of Object.entries(text)) {
          clone[key] = render(value, context, ignoreMissing);
        }
        return clone;
      }
    default:
      return text;
  }
}

/**
 * Converts the messages exchanged with an LLM into a single string.
 * @param {Array} messages - Messages for a chat API
 * @returns {string} - The converted messages
 * @memberof templates
 */
export function joinMessages(messages) {
  return messages
    .map(message => message.role + ": " + message.content)
    .join("\n");
}

/**
 * Converts the properties and values of an object into a single string.
 * @param {Object} object - The object to be converted
 * @param {Array} [keys] - The names of the properties to convert, if not all
 * (the default)
 * @returns {string} - The converted object
 * @memberof templates
 */
export function joinProperties(object, keys = undefined) {
  const keySet = new Set(keys);
  return Object.entries(object).map((key, value) => {
    if (keys === undefined || keySet.has(key)) {
      return key + ": " + value;
    }
  }).filter(text => (text !== undefined)).join("\n");
}

