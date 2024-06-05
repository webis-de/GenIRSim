import { Logbook } from "./logbook.js";

/**
 * Object that represents a system's respone to a user's utterance in the
 * simulated conversation with at least the system's utterance.
 * @typedef {Object} SystemResponse
 * @property {string} utterance - The utterance of the system
 */

export const SYSTEM_RESPONSE = {
  UTTERANCE: "utterance",
  RESULTS: "results",
  RESULTS_PAGE: "resultsPage"
};

/**
 * A generative information retrieval system.
 *
 * Systems can be stateful. However, users are not differentiated: the system
 * can assume it is used by exactly one user. A separate system object must be
 * instantiated for each simulated user.
 *
 * @class System
 * @param {Object} configuration - The configuration for the system
 * @param {Logbook} log - A function that takes log messages
 */
export class System {

  constructor(configuration, logbook) {
    this.configuration = configuration;
    this.logbook = logbook;
  }

  /**
   * Generates a response for the user's utterance.
   *
   * Systems can be stateful. However, users are not differentiated: the system
   * can assume it is used by exactly one user.
   *
   * @param {UserTurn} userTurn - The turn object with the user's utterance as
   * `utterance`
   * @returns {SystemResponse} - The system's response with a least the
   * `utterance` set
   */
  async search(userTurn) { throw new Error("Not implemented"); }

}

import { GenerativeElasticSystem } from "./systems/generative-elastic-system.js"

export const systems = {
  GenerativeElasticSystem
}

