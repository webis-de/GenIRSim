import { Logbook } from "./logbook.js";

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
 * @param {function} [logCallback] - The function to consume all
 * {@link LogbookEntry} of the simulation
 * @param {Object} [additionalUsers] - Object that contains non-standard {User}
 * classes as values; if `configuration.user.class` is the same as a key of this
 * object, the corresponding class will be instantiated and used
 * @param {Object} [additionalSystems] - Object that contains non-standard
 * {System} classes as values; if `configuration.system.class` is the same as a
 * key of this object, the corresponding class will be instantiated and used
 * @returns {Simulation} - The simulation object
 */
export async function simulate(
    configuration, logCallback = console.log,
    additionalUsers = {}, additionalSystems = {}) {
  const logbook = new Logbook("controller", logCallback);
  logbook.log("simulate");
  const availableUsers =
    Object.assign(Object.assign({}, users), additionalUsers || {});
  const availableSystems =
    Object.assign(Object.assign({}, systems), additionalSystems || {});

  const user = new availableUsers[configuration.user.class](
    configuration.user, new Logbook("user", logCallback));
  const system = new availableSystems[configuration.system.class](
    configuration.system, new Logbook("system", logCallback));
  const simulation = { configuration: Object.assign({}, configuration) };

  // first turn
  let userTurn = await user.start(configuration.topic);
  simulation.userTurns = [userTurn];
  userTurn.systemResponse = await system.search(userTurn);

  // follow-up userTurns
  const maxTurns = (configuration.maxTurns || 3);
  for (let t = 2; t <= configuration.maxTurns; t += 1) {
    userTurn = await user.followup(userTurn.systemResponse);
    simulation.userTurns.push(userTurn);
    userTurn[USER_TURN.SYSTEM_RESPONSE] = await system.search(userTurn);
  }

  return simulation;
}

async function evaluateTurn(instantiatedEvaluators, logbook, simulation, userTurnIndex) {
  const evaluations = {};
  for (const [name, evaluator] of Object.entries(instantiatedEvaluators)) {
    const evaluation = await evaluator.evaluate(simulation, userTurnIndex);
    if (evaluation !== null) {
      logbook.log("evaluated",
        {userTurn: userTurnIndex, evaluator: name, result: evaluation});
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
 * @param {function} [logCallback] - The function to consume all
 * {@link LogbookEntry} of the evaluation
 * @param {Object} [additionalEvaluators] - Object that contains non-standard
 * {Evaluator} classes as values; if
 * `configuration.evaluators.[evaluatorName].class` is the same as a key of this
 * object, the corresponding class will be instantiated and used
 * @returns {Evaluation} - The evaluation object
 */
export async function evaluate(
    simulation, configuration, logCallback = console.log,
    additionalEvaluators = {}) {
  const logbook = new Logbook("evaluation", logCallback);
  logbook.log("evaluate");
  const availableEvaluators =
    Object.assign(Object.assign({}, evaluators), additionalEvaluators || {});

  const instantiatedEvaluators = {};
  Object.keys(configuration.evaluators || {}).forEach(name => {
    const evaluatorLogbook = new Logbook("evaluator." + name, logCallback);
    const evaluatorConfiguration = configuration.evaluators[name];
    instantiatedEvaluators[name] = new availableEvaluators[evaluatorConfiguration.class](
      evaluatorConfiguration, evaluatorLogbook);
  });

  const userTurnsEvaluations = [];
  for (let userTurnIndex = 0; userTurnIndex < simulation.userTurns.length; userTurnIndex += 1) {
    logbook.log("evaluate", {userTurn: userTurnIndex});
    if (simulation.userTurns[userTurnIndex].systemResponse !== undefined) {
      const evaluations = await evaluateTurn(instantiatedEvaluators, logbook, simulation, userTurnIndex);
      userTurnsEvaluations.push(evaluations);
    }
  }
  logbook.log("evaluate", "overall");
  const overallEvaluations = await evaluateTurn(instantiatedEvaluators, logbook, simulation);

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
 * @param {Object} configuration - The configuration for the simulation and
 * evaluation
 * @param {Object} configuration.simulation - The configuration for the
 * simulation, see {@link simulate}
 * @param {Object} configuration.evaluation - The configuration for the
 * evaluation, see {@link evaluate}
 * @param {function} [logCallback] - The function to consume all
 * {@link LogbookEntry} of the simulation and evaluation
 * @param {Object} [additionalUsers] - Object that contains non-standard {User}
 * classes as values; if `configuration.simulation.user.class` is the same as a
 * key of this object, the corresponding class will be instantiated and used
 * @param {Object} [additionalSystems] - Object that contains non-standard
 * {System} classes as values; if `configuration.simulation.system.class` is the
 * same as a key of this object, the corresponding class will be instantiated
 * and used
 * @param {Object} [additionalEvaluators] - Object that contains non-standard
 * {Evaluator} classes as values; if
 * `configuration.evaluation.evaluators.[evaluatorName].class` is the same as a
 * key of this object, the corresponding class will be instantiated and used
 * @returns {Evaluation} - The evaluation object
 */
export async function run(configuration, logCallback = console.log,
    additionalUsers = {}, additionalSystems = {},
    additionalEvaluators = {}) {
  const simulation = await simulate(configuration.simulation, logCallback,
    additionalUsers, additionalSystems);
  const evaluation = await evaluate(simulation, configuration.evaluation,
    logCallback, additionalEvaluators);
  return evaluation;
}

import { Evaluator, EVALUATION_RESULT } from "./evaluator.js";
import { LogbookEntry } from "./logbook.js";
import { System, SYSTEM_RESPONSE } from "./system.js";
import { User } from "./user.js";
import { LLM } from "./llm.js";
import * as templates from "./templates.js";

export {
  User, USER_TURN,
  System, SYSTEM_RESPONSE,
  Evaluator, EVALUATION_RESULT,
  Logbook,
  LogbookEntry,
  LLM,
  templates
}

