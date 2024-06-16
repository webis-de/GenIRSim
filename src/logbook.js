/**
 * One entry for the logbook, issued by the source to log for the action.
 *
 * @class LogbookEntry
 * @param {string} source - The source that produced this entry
 * @param {string} action - The action for which this entry was produced
 * @param {(Object|string)} [data] - An optional object or string describing the
 * event that is logged
 */
export class LogbookEntry {

  constructor(source, action, data) {
    /**
     * The entry's creation date in milliseconds since epoch.
     * @type {number}
     */
    this.time = Date.now();
    /**
     * The source that produced this entry.
     * @type {string}
     */
    this.source = source;
    /**
     * The action for which this entry was produced.
     * @type {string}
     */
    this.action = action;
    /**
     * @param {(Object|string|undefined)} data - An optional object or string
     * that describes the event that is logged
     */
    this.data = data;
  }

  /**
   * Checks whether this entry is a continuation of the previous entry (both
   * belong to the same action).
   * @param {LogbookEntry} previousEntry - The previous entry for the logbook
   * @returns {boolean} - Whether it is
   */
  isContinuationOf(previousEntry) {
    return this.source === previousEntry.source
      && this.action === previousEntry.action;
  }

  /**
   * Checks whether this entry has some content.
   * @returns {boolean} - Whether it has
   */
  hasContent() {
    return this.object !== undefined;
  }

  /**
   * Checks whether this entry has some text content.
   * @returns {boolean} - Whether it has
   */
  hasTextContent() {
    return typeof(this.object) === "string";
  }

  /**
   * Gets the content as formatted string.
   * @returns {string} - The entry's content as string
   */
  getContent() {
    if (this.hasContent()) {
      if (this.hasTextContent()) {
        return this.object;
      } else {
        return JSON.stringify(this.object, null, 2);
      }
    } else {
      return undefined;
    }
  }

}

/**
 * A logbook to log actions specific to one source.
 *
 * @class Logbook
 * @param {string} source - The source for which to log entries
 * @param {function} callback - An optional function to call with each
 * {@link LogbookEntry} created on {@link Logbook#log}
 */
export class Logbook {

  constructor(source, callback = console.log) {
    this.source = source;
    this.callback = callback;
  }

  /**
   * Logs one entry to the logbook.
   * @param {string} action - The action for which to log
   * @param {(Object|string)} [object] - An optional object or string describing
   * the event that is logged
   * @returns {LogbookEntry} - The logged entry
   */
  log(action, object) {
    const entry = new LogbookEntry(this.source, action, object);
    this.callback(entry);
    return entry;
  }

}

