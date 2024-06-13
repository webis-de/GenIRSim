import { Logbook } from "./logbook.js";

import { StaticUser } from "./users/static-user.js"
const users = {
  StaticUser
}

import { GenerativeElasticSystem } from "./systems/generative-elastic-system.js"
const systems = {
  GenerativeElasticSystem
}

import { ReadabilityEvaluator } from "./evaluators/readability-evaluator.js"
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
  simulation.turns = [userTurn];
  userTurn.systemResponse = await system.search(userTurn);

  // follow-up turns
  const maxTurns = (configuration.maxTurns || 3);
  for (let t = 2; t <= configuration.maxTurns; t += 1) {
    userTurn = await user.followup(userTurn.systemResponse);
    simulation.turns.push(userTurn);
    userTurn.systemResponse = await system.search(userTurn);
  }

  return simulation;
}

async function evaluateTurn(instantiatedEvaluators, logbook, simulation, turnIndex) {
  const evaluations = {};
  for (const [name, evaluator] of Object.entries(instantiatedEvaluators)) {
    if (turnIndex !== undefined) {
      logbook.log("evaluate.turn" + turnIndex + "." + name,
        {turn: turnIndex, evaluator: name});
    } else {
      logbook.log("evaluate.overall." + name, {evaluator: name});
    }
    const evaluation = await evaluator.evaluate(simulation, turnIndex);
    if (evaluation !== null) {
      logbook.log("evaluated",
        {turn: turnIndex, evaluator: name, result: evaluation});
      evaluations[name] = evaluation;
    }
  }
  return evaluations;
}

/**
 * Evaluates a simulated interaction with a generative information retrieval system.
 *
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

  const turnsEvaluations = [];
  for (let turnIndex = 0; turnIndex < simulation.turns.length; turnIndex += 1) {
    if (simulation.turns[turnIndex].response !== undefined) {
      turnsEvaluations.push(evaluateTurn(instantiatedEvaluators, logbook, simulation, turnIndex));
    }
  }
  const overallEvaluations = evaluateTurn(instantiatedEvaluators, logbook, simulation);

  return {
    configuration: configuration,
    simulation: simulation,
    turnsEvaluations: turnsEvaluations,
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

import { Evaluator } from "./evaluator.js";
import { LogbookEntry } from "./logbook.js";
import { System } from "./system.js";
import { User } from "./user.js";
import { LLM } from "./llm.js";
import * as templates from "./templates.js";

export {
  User,
  System,
  Evaluator,
  Logbook,
  LogbookEntry,
  LLM,
  templates
}

