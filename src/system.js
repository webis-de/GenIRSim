import { Logbook } from "./logbook.js";

/**
 * Object that represents a system's respone to a user's utterance in the
 * simulated conversation with at least the system's utterance.
 * @typedef {Object} SystemResponse
 * @property {string} utterance - The utterance of the system
 */

/**
 * Constants for {@link SystemResponse} property names.
 */
export const SYSTEM_RESPONSE = {
  /**
   * The utterance displayed by the system back to the user.
   */
  UTTERANCE: "utterance",
  /**
   * The results that the system retrieved to answer the user's utterance.
   */
  RESULTS: "results",
  /**
   * The `results` as one string that represents the results page of the system.
   */
  RESULTS_PAGE: "resultsPage"
};

/**
 * A generative information retrieval system.
 *
 * Systems can be stateful. However, users are not differentiated: the system
 * can assume it is used by exactly one user. A separate system object must be
 * instantiated for each simulated user.
 *
 * The constructor of a system must have two parameters:
 * - The `configuration` that has to be passed via `super(configuration)` and
 *   is then available via `this.configuration`.
 * - A {@link Logbook} that can be used to {@link Logbook#log|log} the
 *   initialization process.
 *
 * @class System
 * @param {Object} configuration - The configuration for the system
 */
export class System {

  constructor(configuration) {
    this.configuration = configuration;
  }

  /**
   * Generates a response for the user's utterance.
   *
   * Systems can be stateful. However, users are not differentiated: the system
   * can assume it is used by exactly one user.
   *
   * @param {UserTurn} userTurn - The turn object with the user's utterance as
   * `utterance`
   * @param {Logbook} logbook - Uses its {@link Logbook#log|log function} to log
   * messages
   * @returns {SystemResponse} - The system's response with a least the
   * `utterance` set
   */
  async search(userTurn, logbook) { throw new Error("Not implemented"); }

}

