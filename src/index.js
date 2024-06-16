import { Logbook } from "./logbook.js";
import * as templates from "./templates.js";

import { USER_TURN } from "./user.js";
import { StaticUser } from "./users/static-user.js";
const users = {
  StaticUser
}

import { GenerativeElasticSystem } from "./systems/generative-elastic-system.js";
const systems = {
  GenerativeElasticSystem
}

import { ReadabilityEvaluator } from "./evaluators/readability-evaluator.js";
const evaluators = {
  ReadabilityEvaluator
}

const defaultLogCallback = entry => console.error(JSON.stringify(entry));

/**
 * Object that represents a topic (or task, information need).
 * @typedef {Object} Topic
 * @property {string} description - A natural language description of the
 * information task to be accomplished
 */

/**
 * Object that represents a completed simulation.
 * @typedef {Object} Simulation
 * @property {Object} configuration - The configuration of the simulation
 * @property {Array} turns - List of simulated {@link UserTurn}s (each one
 * includes the system's response)
 */

/**
 * Object that represents the evaluation of a simulation.
 * @typedef {Object} Evaluation
 * @property {Object} configuration - The configuration of the evaluation
 * @property {Simulation} simulation - The simulation that was evaluated
 * @property {Array} userTurnsEvaluations - For each user turn of the
 * simulation, in order, an object where the keys are the names of the
 * configured evaluators (if they evaluated the specific turn of the simulation)
 * and the values are the respective {@link EvaluationResult}s
 * @property {Object} overallEvaluations - An object where the keys are the
 * names of the configured evaluators (if they evaluated the overall simulation)
 * and the values are the respective {@link EvaluationResult}s
 */

/**
 * Simulates an interaction with a generative information retrieval system.
 *
 * Unless you do not want to evaluate, use {@link run} instead.
 *
 * @param {Object} configuration - The configuration for the simulation
 * @param {Topic} configuration.topic - The topic for the simulation
 * @param {Object} configuration.user - The configuration passed to the user in
 * the constructor
 * @param {string} configuration.user.class - The name of the user class, either
 * one of the standard classes of GenIRSim or one in `additionalUsers`
 * @param {Object} configuration.system - The configuration passed to the system
 * in the constructor
 * @param {string} configuration.system.class - The name of the system class,
 * either one of the standard classes of GenIRSim or one in `additionalSystems`
 * @param {number} [configuration.maxTurns] - The maximum number of user turns
 * to simulate (default: 3)
 * @param {Object} [options] -
 * @param {function} [options.logCallback] - The function to consume all
 * {@link LogbookEntry} of the simulation
 * @param {Object} [options.additionalUsers] - Object that contains non-standard
 * {User} classes as values; if `configuration.user.class` is the same as a key
 * of this object, the corresponding class will be instantiated and used
 * @param {Object} [options.additionalSystems] - Object that contains
 * non-standard {System} classes as values; if `configuration.system.class` is
 * the same as a key of this object, the corresponding class will be
 * instantiated and used
 * @returns {Simulation} - The simulation object
 */
export async function simulate(configuration, options = undefined) {
  const logCallback = (options || {}).logCallback || defaultLogCallback;
  const additionalUsers = (options || {}).additionalUsers || {};
  const additionalSystems = (options || {}).additionalSystems || {};

  const controllerLogbook = new Logbook("controller", logCallback);
  controllerLogbook.log("simulate");
  const availableUsers =
    Object.assign(Object.assign({}, users), additionalUsers);
  const availableSystems =
    Object.assign(Object.assign({}, systems), additionalSystems);

  const userLogBook = new Logbook("user", logCallback);
  const user = new availableUsers[configuration.user.class](
    configuration.user, userLogBook);
  const systemLogBook = new Logbook("system", logCallback);
  const system = new availableSystems[configuration.system.class](
    configuration.system, systemLogBook);
  const simulation = { configuration: Object.assign({}, configuration) };

  // first turn
  let userTurn = await user.start(configuration.topic);
  simulation.userTurns = [userTurn];
  userLogBook.log("turn", userTurn);
  userTurn[USER_TURN.SYSTEM_RESPONSE] = await system.search(userTurn);
  systemLogBook.log("turn", userTurn[USER_TURN.SYSTEM_RESPONSE]);

  // follow-up userTurns
  const maxTurns = (configuration.maxTurns || 3);
  for (let t = 2; t <= configuration.maxTurns; t += 1) {
    userTurn = await user.followUp(userTurn.systemResponse);
    simulation.userTurns.push(userTurn);
    userLogBook.log("turn", userTurn);
    userTurn[USER_TURN.SYSTEM_RESPONSE] = await system.search(userTurn);
    systemLogBook.log("turn", userTurn[USER_TURN.SYSTEM_RESPONSE]);
  }

  controllerLogbook.log("done");
  return simulation;
}

async function evaluateTurn(instantiatedEvaluators, logbook, simulation, userTurnIndex) {
  const evaluations = {};
  for (const [name, evaluator] of Object.entries(instantiatedEvaluators)) {
    const evaluation = await evaluator.evaluate(simulation, userTurnIndex);
    if (evaluation !== null) {
      if (userTurnIndex !== undefined) {
        logbook.log("turn[" + userTurnIndex + "].result",
          {userTurnIndex, evaluator: name, result: evaluation});
      } else {
        logbook.log("overall.result",
          {evaluator: name, result: evaluation});
      }
      evaluations[name] = evaluation;
    }
  }
  return evaluations;
}

/**
 * Evaluates a simulated interaction with a generative information retrieval system.
 *
 * @param {Simulation} simulation - The simulation to evaluate
 * @param {Object} configuration - The configuration for the evaluation
 * @param {Object} configuration.evaluators - An object where each value is
 * another configuration object that (1) is passed to the respective evaluator
 * in the the constructor and (2) has a property `class` that is the name of the
 * evaluator class, either one of the standard classes of GenIRSim or one in
 * `additionalEvaluators`
 * @param {Object} [options] -
 * @param {function} [options.logCallback] - The function to consume all
 * {@link LogbookEntry} of the evaluation
 * @param {Object} [options.additionalEvaluators] - Object that contains
 * non-standard {Evaluator} classes as values; if
 * `configuration.evaluators.[evaluatorName].class` is the same as a key of this
 * object, the corresponding class will be instantiated and used
 * @returns {Evaluation} - The evaluation object
 */
export async function evaluate(simulation, configuration, options = undefined) {
  const logCallback = (options || {}).logCallback || defaultLogCallback;
  const additionalEvaluators = (options || {}).additionalEvaluators || {};
  const controllerLogbook = new Logbook("controller", logCallback);
  controllerLogbook.log("evaluate");

  const logbook = new Logbook("evaluation", logCallback);
  const availableEvaluators =
    Object.assign(Object.assign({}, evaluators), additionalEvaluators);

  const instantiatedEvaluators = {};
  Object.keys(configuration.evaluators || {}).forEach(name => {
    const evaluatorLogbook = new Logbook("evaluator." + name, logCallback);
    const evaluatorConfiguration = configuration.evaluators[name];
    instantiatedEvaluators[name] = new availableEvaluators[evaluatorConfiguration.class](
      evaluatorConfiguration, evaluatorLogbook);
  });

  const userTurnsEvaluations = [];
  for (let userTurnIndex = 0; userTurnIndex < simulation.userTurns.length; userTurnIndex += 1) {
    logbook.log("turn[" + userTurnIndex + "].evaluate");
    if (simulation.userTurns[userTurnIndex].systemResponse !== undefined) {
      const evaluations = await evaluateTurn(instantiatedEvaluators, logbook, simulation, userTurnIndex);
      userTurnsEvaluations.push(evaluations);
    }
  }
  logbook.log("overall.evaluate");
  const overallEvaluations = await evaluateTurn(instantiatedEvaluators, logbook, simulation);

  controllerLogbook.log("done");
  return {
    configuration: configuration,
    simulation: simulation,
    userTurnsEvaluations: userTurnsEvaluations,
    overallEvaluations: overallEvaluations
  };
}

/**
 * Simulates and evaluates an interaction with a generative information
 * retrieval system.
 *
 * @param {(Object|string)} configuration - The configuration for the simulation
 * and evaluation, either as object or a JSON string
 * @param {Object} configuration.simulation - The configuration for the
 * simulation, see {@link simulate}
 * @param {Object} configuration.evaluation - The configuration for the
 * evaluation, see {@link evaluate}
 * @param {Object} [options] -
 * @param {function} [options.logCallback] - The function to consume all
 * {@link LogbookEntry} of the simulation and evaluation
 * @param {Object} [options.additionalUsers] - Object that contains non-standard {User}
 * classes as values; if `configuration.simulation.user.class` is the same as a
 * key of this object, the corresponding class will be instantiated and used
 * @param {Object} [options.additionalSystems] - Object that contains non-standard
 * {System} classes as values; if `configuration.simulation.system.class` is the
 * same as a key of this object, the corresponding class will be instantiated
 * and used
 * @param {Object} [options.additionalEvaluators] - Object that contains non-standard
 * {Evaluator} classes as values; if
 * `configuration.evaluation.evaluators.[evaluatorName].class` is the same as a
 * key of this object, the corresponding class will be instantiated and used
 * @param {(Object|Array|String)} [replacements] - An object that specifies
 * the value to replace template variables in the `configuration`
 * (`{{variable}}`) by. If the `configuration` is a `string`, the replacement
 * happens before JSON parsing, allowing to replace variables with JSON
 * structures. Variables in the `configuration` for which no value is specified
 * in `replacements` are ignored. If `replacements` is an array, this function
 * is executed for each of its elements and the resulting list of evaluation
 * objects is returned. If `replacements` is a string, it is treated as a
 * tab-separated values files that specifies an array of replacements: the first
 * line specifying the variable name of a column and the values in that column
 * in other lines being the respective replacement.
 * @returns {(Evaluation|Array)} - The evaluation object or an array of these if
 * `replacements` is an array or string; an empty object is returned in case of
 * an error
 */
export async function run(
    configuration,
    options = undefined,
    replacements = undefined) {
  const logCallback = (options || {}).logCallback || defaultLogCallback;
  const logbook = new Logbook("controller", logCallback);
  if (replacements === undefined) {
    if (typeof(configuration) === "string") {
      return await run(JSON.parse(configuration), options);
    } else {
      try {
        const simulation = await simulate(configuration.simulation, options);
        return await evaluate(simulation, configuration.evaluation, options);
      } catch (error) {
        logbook.log("error", error.toString());
        console.error(error);
        return {};
      }
    }
  } else if (typeof(replacements) === "object") {
    if (Array.isArray(replacements)) {
      return await Promise.all(replacements.map(
        async (singleReplacements, index) => {
          logbook.log("run", index);
          return await run(configuration, options, singleReplacements);
        }));
    } else {
      return await run(
        templates.render(configuration, replacements, { ignoreMissing: true }),
        options);
    }
  } else if (typeof(replacements) === "string") {
    return await run(configuration, options, templates.tsv2Contexts(replacements));
  } else {
    throw new Error("Replacements of type " + typeof(replacements)
      + " not supported");
  }
}

import { Evaluator, EVALUATION_RESULT } from "./evaluator.js";
import { LogbookEntry } from "./logbook.js";
import { System, SYSTEM_RESPONSE } from "./system.js";
import { User } from "./user.js";
import { LLM } from "./llm.js";

export {
  User, USER_TURN,
  System, SYSTEM_RESPONSE,
  Evaluator, EVALUATION_RESULT,
  Logbook,
  LogbookEntry,
  LLM,
  templates
}

