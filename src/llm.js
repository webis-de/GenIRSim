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
 * Configuration for an LLM.
 *
 * Properties are `url` (see below) and all paramters for the chat completion
 * endpoint, which includes the required `model`, but also optional parameters
 * like `options.temperature` (see the
 * {@link https://github.com/ollama/ollama/blob/main/docs/modelfile.md#parameter|modelfile parameter}
 * of Ollama).
 *
 * @typedef {Object} LLMConfiguration
 * @property {string} url - The complete URL of the LLM's chat API endpoint
 * @property {string} model - The large language model name as per the API
 */


/**
 * A large language model.
 *
 * @class
 * @param {LLMConfiguration} configuration - The configuration object 
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

  /**
   * Generates a chat completion.
   * @param {Array} messages - The message history for the completion, use
   * {@link LLM#createSystemMessage}, {@link LLM#createUserMessage}, and
   * {@link LLM#createAssistantMessage} to create these
   * @param {string} action - Name of the action for which the text is
   * generated, used for logging
   * @returns {string} - The completion
   */
  async chat(messages, action) {
    return await generate(messages, this.configuration, this.logbook, action);
  }

  /**
   * Generates a chat completion in JSON format.
   * @param {Array} messages - The message history for the completion, use
   * {@link LLM#createSystemMessage}, {@link LLM#createUserMessage}, and
   * {@link LLM#createAssistantMessage} to create these
   * @param {string} action - Name of the action for which the text is
   * generated, used for logging
   * @param {Array} [requiredKeys] - Names of properties that the parsed JSON
   * completion must have
   * @param {number} [maxRetries] - Maximum number of times to retry the
   * completion (if it can not be parsed and is missing a required key) before
   * throwing an error
   * @returns {Object} - The completion as parsed object
   */
  async json(messages, action, requiredKeys = [], maxRetries = 3) {
    retryLoop: for (let retry = 0; retry <= maxRetries; retry += 1) {
      const message = (await this.chat(messages, action))
        .trim()
        .replace(/^```json/, "").replace(/```$/, "").trim();
      try {
        const parsedMessage = JSON.parse(message);
        for (const key of requiredKeys) {
          if (!(key in parsedMessage)) {
            this.logbook.log(action + " [failed " + (retry+1) + "/" + (maxRetries+1) + "]",
              "Missing key '" + key + "'");
            continue retryLoop;
          }
        }
        return parsedMessage;
      } catch (error) {
        this.logbook.log(action + " [failed " + (retry+1) + "/" + (maxRetries+1) + "]",
          "Failed parsing JSON");
        continue retryLoop;
      }
    }
    const error = "Getting JSON failed after " + (maxRetries+1) + " attempts";
    throw new Error(error);
  }

}

