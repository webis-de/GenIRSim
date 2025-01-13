import { Logbook } from "../logbook.js";
import { System, SYSTEM_RESPONSE } from "../system.js";

/**
 * A blackbox retrieval system that implements a basic chat API.
 *
 * The API needs to consume a JSON object that has at least the property
 * `messages`, which is an array of message objects. Each message object has
 * the string property `role`, which is either `assistant` or `user`, and the
 * string property `content` that contains the message text.
 *
 * The API produces a JSON object that has at least the property `message`,
 * which is the response message (thus `role` has to be `assistant`).
 *
 * @class BasicChatSystem
 * @param {Object} configuration - The configuration for the system
 * @param {string} configuration.url - The URL of the chat endpoint
 * @param {string} configuration.request - The object that is sent to the
 * endpoint on each query with the messages added
 * @param {Logbook} log - A function that takes log messages
 */
export class BasicChatSystem extends System {

  constructor(configuration, logbook) {
    super(configuration);
    this.messages = [];
  }

  /**
   * Retrieves results for the user's query.
   *
   * @param {UserTurn} userTurn - The turn object with the user's utterance as
   * `utterance`
   * @param {Logbook} logbook - Uses its {@link Logbook#log|log function} to log
   * messages
   * @returns {SystemResponse} - The system's response with a least the
   * `utterance` set
   */
  async search(userTurn, logbook) {
    this.messages.push({role: "user", content: userTurn.utterance});

    const data = Object.assign({}, this.configuration.request || {});
    data.messages = this.messages;

    const body = JSON.stringify(data);
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    const params = { method: "POST", headers: headers, body: body };

    logbook.log("retrieval.query", {url: this.configuration.url, params: params});
    const response = await fetch(this.configuration.url, params);
    const responseJson = await response.json();
    if (!("message" in responseJson)) {
      throw new Error("Missing response message: " + JSON.stringify(responseJson));
    }
    logbook.log("retrieval.result", responseJson);

    const systemMessage = responseJson.message;
    this.messages.push(systemMessage);
    return systemMessage.content;
  }

}

