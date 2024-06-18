import { Logbook } from "./logbook.js";

/**
 * Object that represents a user's turn in the simulated conversation with at
 * least the user's utterance.
 * @typedef {Object} UserTurn
 * @property {string} utterance - The simulated utterance sent from the user to
 * the system
 * @property {SystemResponse} systemResponse - The response sent from the system
 * to the user as a reply
 */

/**
 * Constants for {@link UserTurn} property names.
 */
export const USER_TURN = {
  /**
   * The simulated utterance sent from the user to the system.
   */
  UTTERANCE: "utterance",
  /**
   * The {@link SystemResponse} sent from the system to the user as a reply.
   */
  SYSTEM_RESPONSE: "systemResponse"
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
 * The constructor of a user must have two parameters:
 * - The `configuration` that has to be passed via `super(configuration)` and
 *   is then available via `this.configuration`.
 * - A {@link Logbook} that can be used to {@link Logbook#log|log} the
 *   initialization process.
 *
 * @class User
 * @param {Object} configuration - The configuration for the user
 */
export class User {

  constructor(configuration) {
    this.configuration = configuration;
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
   * @param {Logbook} logbook - Uses its {@link Logbook#log|log function} to log
   * messages
   * @returns {UserTurn} - The turn with at least the `utterance` set
   */
  async start(topic, logbook) { throw new Error("Not implemented"); }

  /**
   * Follows up on a system response to a previous utterance.
   *
   * Users can be stateful. The method @{link User#start} must be called at
   * least once before calling this method.
   *
   * @property {SystemResponse} response - The latest response of the system
   * @param {Logbook} logbook - Uses its {@link Logbook#log|log function} to log
   * messages
   * @returns {UserTurn} - The turn with at least the `utterance` set
   */
  async followUp(systemResponse, logbook) { throw new Error("Not implemented"); }

}

