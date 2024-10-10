import { User, USER_TURN } from "../user.js";

/**
 * User model for the Touche 25 Retrieval-Augmented Debating task. A client tor
 * the corresponding server.
 *
 * @class Touche25RADUser
 * @param {Object} configuration - The configuration for the user
 * @param {string} configuration.url - The URL of the chat API
 * @param {string} configuration.model - The name of the user model
 * @param {Logbook} log - A function that takes log messages
 */
export class Touche25RADUser extends User {

  constructor(configuration, logbook) {
    super(configuration)
    if (!configuration.url) {
      this.configuration.url = "https://touche25-rad.webis.de/user-sim/api/chat";
    }
    if (!configuration.model) { this.configuration.model = "base-user"; }
    this.messages = [];
  }

  async ask(data, logbook) {
    logbook.log("user.request", data);

    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    const body = JSON.stringify(data);
    const params = { method: "POST", headers: headers, body: body };

    const response = await fetch(this.configuration.url, params);
    const responseJson = await response.json();
    logbook.log("user.response", responseJson);
    this.messages.push(responseJson.message);
    return { utterance: responseJson.message.content };
  }

  async start(topic, logbook) {
    const data = {
      model: this.configuration.model
    };
    if (topic.description) {
      data["options"] = { claim: topic.description };
    }
    return await this.ask(data, logbook);
  }

  async followUp(systemResponse, logbook) {
    this.messages.push({
      role: "user",
      content: systemResponse.utterance
    });
    const data = {
      model: this.configuration.model,
      messages: this.messages
    };
    return await this.ask(data, logbook);
  }

}

