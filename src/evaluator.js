import { Logbook } from "./logbook.js";

/**
 * @class Evaluator
 * @param {Object} configuration - The configuration for the evaluator.
 * @param {Logbook} log - A function that takes log messages.
 */
export class Evaluator {

  constructor(configuration, logbook) {
    this.configuration = configuration;
    this.logbook = logbook;
  }

  /**
   * Object returned by {@link Evaluator#evaluate} with at least a score.
   * @typedef {Object} EvaluationResult
   * @property {number} score - A number between 0 and 1, with higher values
   * indicating better responses
   */

  /**
   * Evaluates one specific turn or the entire conversation.
   *
   * Evaluators might be stateful. This method must always be called first to
   * evaluate each turn, in order, starting with 0, and then to evaluate the
   * entire conversation (leaving the turnIndex undefined). Evaluators must not
   * be re-used to evaluate multiple conversations.
   *
   * @param {Object} simulation - The simulation object returned by
   * {@link TODO}
   * @param {number} [turnIndex] - Index of the user's turn (or rather the
   * response to that turn) to be evaluated, starting with 0, or undefined to
   * evaluate the entire conversation
   * @returns {(EvaluationResult|null)} - The result of the evaluation, with
   * at least the score property, or null if the Evaluator does not evaluate
   * single turns or the complete conversation and that is what was asked
   */
  async evaluate(simulation, turnIndex) {
    return null;
  }

}

