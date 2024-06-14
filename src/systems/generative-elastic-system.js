import { Logbook } from "../logbook.js";
import { System, SYSTEM_RESPONSE } from "../system.js";
import { render, joinMessages, joinProperties } from "../templates.js";
import { LLM } from "../llm.js"

async function queryElastic(query, searchConfiguration, logbook) {
  const data = {query: query};
  const body = JSON.stringify(data);
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  const params = { method: "POST", headers: headers, body: body };

  logbook.log("retrieve", query);
  const response = await fetch(
    searchConfiguration.url + "_search?size=" + searchConfiguration.size,
    params);
  const responseJson = await response.json();
  const results = responseJson.hits.hits.map((hit, index) => {
    const result = Object.assign({}, hit["_source"]);
    result.key = index + 1;
    result.id = hit["_id"];
    result.score = hit["_score"];
    logbook.log("result[" + index + "]", result);
    return result;
  });
  return results;
}

/**
 * A basic generative information retrieval system implemented using an
 * {@link LLM} and a Elasticsearch server.
 *
 * Properties of the {@link SystemResponse} objects that
 * {@link GenerativeElasticSystem#search} produces are determined by the
 * `configuration.generation.message` extended with
 * {@link SYSTEM_RESPONSE.RESULTS} and (the same as one string)
 * {@link SYSTEM_RESPONSE.RESULTS_PAGE}.
 *
 * @class GenerativeElasticSystem
 * @param {Object} configuration - The configuration for the system
 * @param {LLMConfiguration} configuration.llm - The configuration for the
 * language model employed during retrieval
 * @param {Object} [configuration.preprocessing] - No preprocessing if this
 * property is `undefined`
 * @param {string} [configuration.preprocessing.message] - Template for the
 * prompt to preprocess the user's utterance (no preprocessing will happen if
 * `configuration.preprocessing` is `undefined`). The LLM's response must be
 * formatted as JSON. Variables:
 * - `{{x}}`: A property `x` of the configuration for the system
 * - `{{variables.messages}}`: The previous exchange betbeen user and system
 *   (assistant) rendered as string ({@link templates#joinMessages})
 * - `{{variables.userTurn}}`: The last {@link UserTurn}, especially with
 *   `variables.userTurn.utterance`
 * @param {Array} [configuration.preprocessing.requiredKeys] - The properties
 * that the preprocessing response must have (none by default)
 * @param {string} configuration.search.query - The Elasticsearch query object
 * for retrieving results, but every string in it is treated as a template.
 * Variables are the same as for `configuration.preprocessing.message`, plus:
 * - `{{variables.preprocessing}}`: The parsed output of the preprocessing (if
 *   preprocessing was performed)
 * @param {Object} configuration.search
 * @param {string} configuration.search.url - The complete URL of the
 * Elasticsearch server's API endpoint (up to but excluding `_search`)
 * @param {number} configuration.search.size - The number of results to retrieve
 * @param {Object} configuration.generation
 * @param {string} configuration.generation.message - Template for the
 * prompt to generate a system response for the user's utterance from the
 * retrieved search results. The LLM's response must be formatted as JSON.
 * Variables are the same as for `configuration.search.query`, plus:
 * - `{{variables.results}}`: The retrieved results rendered as a string
 * @param {Array} [configuration.generation.searchResultKeys] - The properties
 * of each result that are used to render the result in the generation message
 * @param {Array} [configuration.generation.requiredKeys] - The properties
 * that the generation response must have (at least `utterance`)
 * @param {Logbook} log - A function that takes log messages
 */
export class GenerativeElasticSystem extends System {

  constructor(configuration, logbook) {
    super(configuration, logbook);
    this.llm = new LLM(configuration.llm, this.logbook);
    this.messages = [];
    this.searchResultKeys = configuration.generation.searchResultKeys;
  }

  /**
   * Retrieves results for the user's query.
   *
   * @param {UserTurn} userTurn - The turn object with the user's utterance as
   * `utterance`
   * @returns {SystemResponse} - The system's response with a least the
   * `utterance` set
   */
  async search(userTurn) {
    this.messages.push(this.llm.createUserMessage(userTurn.utterance));
    const context = Object.assign({
      variables: {
        messages: joinMessages(this.messages),
        userTurn: userTurn
      }
    }, this.configuration);

    if (this.configuration.preprocessing) {
      context.variables.preprocessing = await this.llm.json(
        [ this.llm.createUserMessage(render(this.configuration.preprocessing.message, context)) ],
        "preprocessing",
        this.configuration.preprocessing.requiredKeys || []);
    }

    const query = render(this.configuration.search.query, context);
    const results = await queryElastic(query, this.configuration.search, this.logbook);
    context.variables.results = results
      .map((result, index) => "[" + (index+1) + "]\n" + joinProperties(result, this.searchResultKeys))
      .join("\n\n");

    const systemResponse = await this.llm.json(
      [ this.llm.createUserMessage(render(this.configuration.generation.message, context)) ],
      "generation",
      (this.configuration.generation.requiredKeys || []).concat([ SYSTEM_RESPONSE.UTTERANCE ]));
    this.messages.push(this.llm.createAssistantMessage(systemResponse[SYSTEM_RESPONSE.UTTERANCE]));

    systemResponse[SYSTEM_RESPONSE.RESULTS] = results;
    systemResponse[SYSTEM_RESPONSE.RESULTS_PAGE] = context.variables.results;
    return systemResponse;
  }

}

