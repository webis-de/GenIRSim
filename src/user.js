import { Logbook } from "./logbook.js";

/**
 * Object that represents a user's turn in the simulated conversation with at
 * least the user's utterance.
 * @typedef {Object} UserTurn
 * @property {string} utterance - The simulated utterance of the user
 */

/**
 * Constants for {@link UserTurn} property names.
 */
export const USER_TURN = {
  /**
   * The utterance sent from the user to the system.
   */
  UTTERANCE: "utterance"
};

/**
 * Abstract class for simulators of a user of a generative information retrieval
 * system.
 *
 * Users can be stateful. Calling {@link User#start} is equivalent to starting
 * a new conversation. Simple users might reset at the start of that method,
 * whereas others might have a cross-conversation state. In any case, that
 * method must be called at least once before calling {@link User#followUp}.
 *
 * @class User
 * @param {Object} configuration - The configuration for the user
 * @param {Logbook} log - A function that takes log messages
 */
export class User {

  constructor(configuration, logbook) {
    this.configuration = configuration;
    this.logbook = logbook;
  }

  /**
   * Starts a new simulation for the specified topic.
   *
   * Users can be stateful. Calling this method is equivalent to starting a new
   * conversation. Simple users might reset at the start of this method, whereas
   * others might have a cross-conversation state. In any case, this method must
   * be called at least once before calling {@link User#followUp}.
   *
   * @property {Topic} topic - The topic
   * @returns {UserTurn} - The turn with at least the `utterance` set
   */
  async start(topic) { throw new Error("Not implemented"); }

  /**
   * Follows up on a system response to a previous utterance.
   *
   * Users can be stateful. The method @{link User#start} must be called at
   * least once before calling this method.
   *
   * @property {SystemResponse} response - The latest response of the system
   * @returns {UserTurn} - The turn with at least the `utterance` set
   */
  async followUp(systemResponse) { throw new Error("Not implemented"); }

}

