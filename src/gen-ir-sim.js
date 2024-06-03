/**
 * @class Evaluator
 * @param {Object} configuration - The configuration for the evaluator.
 * @param {function} log - A function that takes log messages.
 */
export class Evaluator {

  constructor(configuration, logger) {
    this.configuration = configuration;
    this.logger = logger;
  }

  async evaluate(simulation, turnIndex) { }

}

export async function construct(parentClass, configuration, logger, restricted = true) {
  const module = configuration["module"];
  if (restricted && module.includes("://")) {
    throw new Error("Restricted construction forbids module names that contain '://', but was '" + module + "'");
  }
  const className = configuration["class"];
  const moduleNamespaceObject = await import(module);
  const object = new moduleNamespaceObject[className](configuration, logger);
  if (!object.prototype instanceof parentClass) {
    throw new Error("Created object of '" + className + "' from '" + module + "' is not a '" + parentClass + "'");
  }
  return object;
}

