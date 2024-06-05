import { Logbook } from "../logbook.js";
import { System, SYSTEM_RESPONSE } from "../system.js";
import { render, joinMessages, joinProperties } from "../templates.js";

export async function queryElastic(query, searchConfiguration, logbook) {
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

export class GenerativeElasticSystem extends System {

  constructor(configuration, logbook) {
    super(configuration, logbook);
    this.llm = new llms.LLM(configuration.llm, this.log);
    this.messages = [];
  }

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
        this.configuration.preprocessing.requiredKeys | []);
    }

    const query = render(this.configuration.search.query, context);
    const results = await queryElastic(query, this.configuration.search, this.logbook);
    context.variables.results = results
      .map((result, index) => "[" + (index+1) + "]\n" + joinProperties(result["_source"]))
      .join("\n\n");

    const systemResponse = await this.llm.json(
      [ this.llm.createUserMessage(render(this.configuration.generation.message, context)) ],
      "generation",
      (this.configuration.message.requiredKeys | []).concat([ SYSTEM_RESPONSE.UTTERANCE ]));
    this.messages.push(this.llm.createAssistantMessage(systemResponse[SYSTEM_RESPONSE.UTTERANCE]));

    systemResponse[SYSTEM_RESPONSE.RESULTS] = results;
    systemResponse[SYSTEM_RESPONSE.RESULTS_PAGE] = context.variables.results;
    return systemResponse;
  }

}

