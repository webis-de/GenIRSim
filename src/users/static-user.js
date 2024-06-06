import { User, USER_TURN } from "../user.js";
import { LLM } from "../llm.js";
import { render } from "../templates.js";

/**
 * A basic user model that does not change during conversation and only looks at
 * the latest response for following up on it.
 *
 * @class StaticUser
 * @param {Object} configuration - The configuration for the user
 * @param {LLMConfiguration} configuration.llm - The configuration for the
 * language model employed during simulation
 * @param {string} configuration.start - Template for the prompt to simulate the
 * first message for a topic. Variables:
 * - `{{x}}`: A property `x` of the configuration for the user
 * - `{{variables.topic}}`: The {@link Topic} object
 * @param {string} configuration.followUp - Template for the prompt to simulate
 * a follow-up message to a system response. Variables:
 * - `{{x}}`: A property `x` of the configuration for the user
 * - `{{variables.topic}}`: The {@link Topic} object
 * - `{{variables.systemResponse}}`: The {@link SystemResponse} object of the
 *   response to follow-up on
 * @param {Logbook} log - A function that takes log messages
 */
export class StaticUser extends User {

  constructor(configuration, logbook) {
    super(configuration, logbook)
    this.llm = new LLM(this.configuration.llm, this.logbook);
    this.context = Object.assign({variables:{}}, this.configuration);
  }

  async ask(promptTemplate, context) {
    const message = this.llm.createUserMessage(render(promptTemplate, context));
    const turn = await this.llm.json([message], [ USER_TURN.UTTERANCE ]);
    return systemResponse;
  }

  async start(topic) {
    this.context.variables.topic = topic;
    return await this.ask(this.configuration.start, this.context);
  }

  async followUp(systemResponse) {
    const context = Object.assign({}, this.context);
    context.variables.systemResponse = systemResponse;
    return await this.ask(this.configuration.followUp, context);
  }

}

