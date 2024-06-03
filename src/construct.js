/**
 * Constructs a new object based on its class name that inherits from a specific class.
 * @param {Object} parentClass - The class object of the class to be inherited
 * @param {Object} configuration - The configuration for the object that is created
 * @param {string} configuration.module - The JavaScript module that contains the class to be instantiated
 * @param {string} configuration.class - The name of the class (inside the module) to be instantiated - the
 * constructor must take the sub-configuration and the logbook as its two only parameters
 * @param {Object} configuration.configuration - The sub-configuration that is passed to the constructor
 * @param {Logbook} logbook - The logbook to log
 * @param {boolean} restricted - Whether the module can be a full URL (allowing to construct classes from
 * other sources)
 */
export async function construct(parentClass, configuration, logbook, restricted = true) {
  const module = configuration["module"];
  if (module === undefined) {
    throw new Error("Configuration is missing 'module'. but was:\n" + JSON.stringify(configuration. null, 2));
  }
  if (restricted && module.includes("://")) {
    throw new Error("Restricted construction forbids module names that contain '://', but was '" + module + "'");
  }
  const className = configuration["class"];
  if (className === undefined) {
    throw new Error("Configuration is missing 'class'. but was:\n" + JSON.stringify(configuration. null, 2));
  }
  if (configuration["configuration"] === undefined) {
    throw new Error("Configuration is missing 'configuration'. but was:\n" + JSON.stringify(configuration. null, 2));
  }

  const moduleNamespaceObject = await import(module);
  const object = new moduleNamespaceObject[className](configuration["configuration"], logbook);
  if (!object.prototype instanceof parentClass) {
    throw new Error("Created object of '" + className + "' from '" + module + "' is not a '" + parentClass + "'");
  }
  return object;
}

