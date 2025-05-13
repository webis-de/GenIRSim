import { Evaluator, EVALUATION_RESULT } from "../evaluator.js";
import { Logbook } from "../logbook.js";

/**
 * An evaluator that uses a REST API for a score.
 *
 * @class ApiBasedEvaluator
 * @param {Object} configuration - The configuration for the evaluator
 * @param {string} configuration.url - The HTTP endpoint for scoring, which
 * takes as input a JSON object:
 * ```{json}
 * {
 *   "simulation": {...},
 *   "userTurnIndex": ...
 * }
 * ```
 * The properties should be the same as for {@link Evaluator#evaluate}. The
 * response object should be again the same as for {@link Evaluator#evaluate},
 * except that in the case the Evaluator does not evaluate single turns or the
 * complete conversation and that is what was asked, the response should be a
 * valid JSON object with the property {@link EVALUATION_RESULT.SCORE} set to
 * `null`.
 * @param {Logbook} log - A function that takes log messages
 */
export class ApiBasedEvaluator extends Evaluator {

  constructor(configuration, logbook) {
    super(configuration);
  }

  async evaluate(simulation, userTurnIndex, logbook) {
    const data = { simulation: simulation, userTurnIndex: userTurnIndex };
    const body = JSON.stringify(data);
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    const params = { method: "POST", headers: headers, body: body };

    logbook.log("evaluation.query", {url: this.configuration.url, params: params});
    const response = await fetch(this.configuration.url, params);
    const responseJson = await response.json();
    if (!(EVALUATION_RESULT.SCORE in responseJson)) {
      throw new Error("Missing score: " + JSON.stringify(responseJson));
    }
    logbook.log("evaluation.result", responseJson);
    if (responseJson[EVALUATION_RESULT.SCORE] === null) { return null; }
    return responseJson;
  }

}

