import { Logbook } from "./logbook.js";

// https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/read#examples
async function* fetchLines(url, params) {
  const utf8Decoder = new TextDecoder("utf-8");
  let response = await fetch(url, params);
  let reader = response.body.getReader();
  let { value: chunk, done: readerDone } = await reader.read();
  chunk = chunk ? utf8Decoder.decode(chunk, { stream: true }) : "";

  let re = /\r\n|\n|\r/gm;
  let startIndex = 0;

  for (;;) {
    let result = re.exec(chunk);
    if (!result) {
      if (readerDone) {
        break;
      }
      let remainder = chunk.substr(startIndex);
      ({ value: chunk, done: readerDone } = await reader.read());
      chunk =
        remainder + (chunk ? utf8Decoder.decode(chunk, { stream: true }) : "");
      startIndex = re.lastIndex = 0;
      continue;
    }
    yield chunk.substring(startIndex, result.index);
    startIndex = re.lastIndex;
  }
  if (startIndex < chunk.length) {
    // last line didn't end in a newline char
    yield chunk.substr(startIndex);
  }
}

async function fetchJsonLines(url, params, handler) {
  for await (let line of fetchLines(url, params)) {
    handler(JSON.parse(line));
  }
}

async function generate(messages, configuration, logbook, action) {
  const url = configuration.url;
  const data = Object.assign({}, configuration);
  delete data.url;
  data.messages = messages;

  logbook.log(action + ".request", messages);
  return new Promise((resolve, reject) => {
    let responseMessage = ""
    const handler = (response) => {
      if (!response.done) {
        const content = response.message.content;
        logbook.log(action + ".response", content);
        responseMessage += content;
      } else {
        resolve(responseMessage);
      }
    };
    const body = JSON.stringify(data);
    fetchJsonLines(url, { method: "POST", body: body }, handler);
  });
}

/**
 * A large language model.
 *
 * @class
 * @param {Object} configuration - The configuration object 
 * @param {string} configuration.url - The complete URL of the LLM's chat
 * API
 * @param {Logbook} logbook - The logbook to log to
 */
export class LLM {

  constructor(configuration, logbook) {
    this.configuration = configuration;
    this.logbook = logbook;
  }

  /**
   * Creates a message object for a message from the assistant.
   * @param {string} message - The string message that the assistant says
   * @returns {Object} - The message object
   */
  createAssistantMessage(message) {
    return {role: "assistant", content: message};
  }

  /**
   * Creates a system prompt object.
   * @param {string} message - The string prompt
   * @returns {Object} - The message object
   */
  createSystemMessage(message) {
    return {role: "system", content: message};
  }

  /**
   * Creates a message object for a message from the user.
   * @param {string} message - The string message that the user says
   * @returns {Object} - The message object
   */
  createUserMessage(message) {
    return {role: "user", content: message};
  }

  async chat(messages, action) {
    return await generate(messages, this.configuration, this.logbook, action);
  }

  async json(messages, action, requiredKeys = [], maxRetries = 2) {
    retryLoop: for (let retry = 0; retry <= maxRetries; retry += 1) {
      const message = (await this.chat(messages, action))
        .trim()
        .replace(/^```json/, "").replace(/```$/, "").trim();
      try {
        const parsedMessage = JSON.parse(message);
        for (const key of requiredKeys) {
          if (!(key in parsedMessage)) {
            this.logbook.log(action + " [failed " + (retry+1) + "/" + (maxRetries+1) + "]",
              "Missing key '" + key + "'";
            continue retryLoop;
          }
        }
        return parsedMessage;
      } catch (error) {
        this.logbook.log(action + " [failed " + (retry+1) + "/" + (maxRetries+1) + "]",
          "Failed parsing JSON";
        continue retryLoop;
      }
    }
    const error = "Getting JSON failed after " + (maxRetries+1) + " attempts";
    throw new Error(error);
  }

}
