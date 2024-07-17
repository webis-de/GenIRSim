import { Logbook } from "./logbook.js";

/**
 * Object returned by {@link Evaluator#evaluate} with at least a score.
 * @typedef {Object} EvaluationResult
 * @property {number} score - A number between 0 and 1, with higher values
 * indicating better responses
 * @property {number} [milliseconds] - Time taken for evaluation in milliseconds
 * (this property is automatically added by GenIRSim)
 */

/**
 * Constants for {@link EvaluationResult} property names.
 */
export const EVALUATION_RESULT = {
  /**
   * A number between 0 and 1, with higher values indicating better responses.
   */
  SCORE: "score",
  /**
   * A string explanation for the score.
   */
  EXPLANATION: "explanation"
};

/**
 * An evaluator to measure some quality score for single turns of a conversation
 * and/or an entire conversation.
 *
 * Evaluators can be stateful and must not be re-used between conversations.
 * The method {@link Evaluator#evaluate} must always be called first to
 * evaluate each turn, in order, starting with `turnIndex = 0`, and then to
 * evaluate the entire conversation (leaving the `turnIndex` undefined).
 *
 * The constructor of an evaluator must have two parameters:
 * - The `configuration` that has to be passed via `super(configuration)` and
 *   is then available via `this.configuration`.
 * - A {@link Logbook} that can be used to {@link Logbook#log|log} the
 *   initialization process.
 *
 * @class Evaluator
 * @param {Object} configuration - The configuration for the evaluator
 */
export class Evaluator {

  constructor(configuration) {
    this.configuration = configuration;
  }

  /**
   * Evaluates one specific turn or the entire conversation.
   *
   * Evaluators can be stateful. This method must always be called first to
   * evaluate each turn, in order, starting with 0, and then to evaluate the
   * entire conversation (leaving the `turnIndex` undefined). Evaluators must
   * not be re-used to evaluate multiple conversations.
   *
   * @param {Simulation} simulation - The simulation to evaluate
   * @param {number} turnIndex - Index of the user's turn (or rather the
   * response to that turn) to be evaluated, starting with 0, or undefined to
   * evaluate the entire conversation
   * @param {Logbook} logbook - Uses its {@link Logbook#log|log function} to log
   * messages
   * @returns {(EvaluationResult|null)} - The result of the evaluation, with
   * at least the score property, or `null` if the Evaluator does not evaluate
   * single turns or the complete conversation and that is what was asked
   */
  async evaluate(simulation, turnIndex, logbook) {
    throw new Error("Not implemented");
  }

}


