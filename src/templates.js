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
 * @param {any} text - The template string or an object or array structure that
 * contains template strings (among others)
 * @param {Object} context - The values of the variables that can be referenced
 * @param {Object} [options] - Replacement options
 * @param {boolean} [options.ignoreMissing] - Whether to ignore if a reference
 * variable does not exist in the context (not changing the text) instead of
 * throwing an error
 * @memberof templates
 */
export function render(text, context, options = undefined) {
  if (Array.isArray(context)) {
    return context.map(singleContext => render(text, singleContext, options));
  } else {
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
                if (options !== undefined && options.ignoreMissing) {
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
                output += render("- " + scope.join("\\n- "), context, options);
              }
            } else {
              output += render(scope, context, options);
            }
          }
        }
        return output;
      case "object":
        if (Array.isArray(text)) {
          return text.map(entry => render(entry, context, options));
        } else {
          const clone = Object.assign({}, text);
          for (const [key, value] of Object.entries(text)) {
            clone[key] = render(value, context, options);
          }
          return clone;
        }
      default:
        return text;
    }
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
  return Object.keys(object).map(key => {
    if (keys === undefined || keySet.has(key)) {
      return key + ": " + object[key];
    }
  }).filter(text => (text !== undefined)).join("\n");
}

/**
 * Converts each row of a tab-separated values text (except the header) to a
 * context object.
 * @param {string} tsv - Contents of a tab-separated values file (no
 * quotations), first line is treated as header that specifies the keys and
 * the values in the other lines are then the respective values, each line then
 * being converted to a context object
 * @returns {Array} - Array of the created context objects
 * @memberof templates
 */
export function tsv2Contexts(tsv) {
  const lines = tsv
    .replace(/(\r\n|\n)$/, "")
    .split(/\r\n|\n/)
    .map(line => line.split("\t"));
  if (lines.length === 0) { throw new Error("empty file"); }
  const header = lines[0];
  const rows = lines.splice(1);
  return rows.map(row => {
    const context = {};
    for (const [headerIndex, key] of header.entries()) {
      context[key] = row[headerIndex];
    }
    return context;
  });
}

