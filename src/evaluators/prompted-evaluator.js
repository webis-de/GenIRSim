import { Evaluator, EVALUATION_RESULT } from "../evaluator.js";
import { LLM } from "../llm.js";
import { Logbook } from "../logbook.js";
import { render } from "../templates.js";
import { SYSTEM_RESPONSE } from "../system.js";
import { USER_TURN } from "../user.js";

/**
 * An evaluator that prompts a language model for a score.
 *
 * @class PromptedEvaluator
 * @param {Object} configuration - The configuration for the evaluator
 * @param {LLMConfiguration} configuration.llm - The configuration for the
 * language model to be prompted
 * @param {string} configuration.promt - Template for the prompt to evaluate
 * the system response. Variables:
 * - `{{x}}`: A property `x` of the configuration for the evaluator
 * - `{{variables.simulation}}`: The entire {@link Simulation}
 * - `{{variables.userTurn}}`: The specific user turn, especially with
 *   `variables.userTurn.utterance` and
 *   `variables.userTurn.SystemResponse.utterance`
* @param {Array} [configuration.requiredKeys] - The properties
 * that the language model's response must have (in addition to
 * {@link EVALUATION_RESULT.SCORE})
 * @param {Logbook} log - A function that takes log messages
 */
export class PromptedEvaluator extends Evaluator {

  constructor(configuration, logbook) {
    super(configuration);
  }

  async evaluate(simulation, userTurnIndex, logbook) {
    if (userTurnIndex === undefined) {
      return null; // does not evaluate overall simulation
    }

    const llm = new LLM(this.configuration.llm, logbook);
      
    const context = Object.assign({variables:{}}, this.configuration);
    context.variables.simulation = simulation;
    context.variables.userTurn = simulation.userTurns[userTurnIndex];
    const messages =
      [ llm.createUserMessage(render(this.configuration.prompt, context)) ];

    const requiredKeys = (this.configuration.requiredKeys || [])
      .concat([ EVALUATION_RESULT.SCORE ]);

    return await llm.json(messages, "prompting", requiredKeys);
  }

}

