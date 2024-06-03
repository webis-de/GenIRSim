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

  async evaluate(simulation, turnIndex) { }

}
