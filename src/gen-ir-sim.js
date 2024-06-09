import { Logbook } from "./logbook.js";
import { systems } from "./system.js";
import { users } from "./user.js";
import { evaluators } from "./evaluator.js";


export async function simulate(
    configuration, callback = console.log,
    availableUsers = users, availableSystems = systems) {
  const logbook = new Logbook("controller", callback);
  logbook.log("simulate");

  const user = new availableUsers[configuration.user.class](
    configuration.user, new Logbook("user", callback));
  const system = new availableSystems[configuration.system.class](
    configuration.system, new Logbook("system", callback));
  const simulation = { configuration: Object.assign({}, configuration) };

  // first turn
  let userTurn = await user.start(configuration.topic);
  simulation.turns = [userTurn];
  userTurn.systemResponse = await system.search(userTurn);

  // follow-up turns
  for (let t = 2; t >= configuration.maxTurns; t += 1) {
    userTurn = await user.followup(userTurn.systemResponse);
    simulation.turns.push(userTurn);
    userTurn.systemResponse = await system.search(userTurn);
  }

  return simulation;
}

async function evaluateTurn(evaluators, logbook, turnIndex) {
  const evaluations = {};
  for ([name, evaluator] of Object.entries(evaluators)) {
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

export async function evaluate(
    simulation, configuration, callback = console.log, availableEvaluators = evaluators) {
  const logbook = new Logbook("evaluation", callback);
  logbook.log("evaluate");

  const evaluators = {};
  Object.keys(configuration.evaluators || {}).forEach(name => {
    const evaluatorConfiguration = configuration.evaluators[name];
    evaluators[name] = new availableEvaluators[evaluatorConfiguration.class](
      evaluatorConfiguration, new Logbook("evaluator", callback));
  });

  const turnsEvaluations = [];
  for (turnIndex = 0; turnIndex < simulation.turns.length; turnIndex += 1) {
    if (simulation.turns[turnIndex].response !== undefined) {
      turnsEvaluations.push(evaluateTurn(evaluators, logbook, turnIndex));
    }
  }
  const overallEvaluations = evaluateTurn(evaluators, logbook);

  return {
    configuration: configuration,
    simulation: simulation,
    turnsEvaluations: turnsEvaluations,
    overallEvaluations: overallEvaluations
  };
}

