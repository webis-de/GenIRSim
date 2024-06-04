/**
 * Object that represents a topic (or task, information need).
 * @typedef {Object} Topic
 * @property {string} description - A natural language description of the
 * information task to be accomplished
 */

import { Evaluator } from "./evaluator.js";
import { Logbook } from "./logbook.js";
import { System } from "./system.js";
import { User } from "./user.js";
import { construct } from "./construct.js";
import { templates } from "./templates.js";
