#!/usr/bin/env node

import * as genirsim from "../src/index.js";
import fs from "fs";

async function run(configurationJson, replacements = undefined) {
  const configuration = JSON.parse(replacements === undefined
    ? configurationJson
    : genirsim.templates.texts.render(configurationJson, replacements, true));
  const evaluation = await genirsim.run(configuration,
    entry => console.error(JSON.stringify(entry)));
  console.log(JSON.stringify(evaluation));
}

async function runWithParameters(configurationJson, header, rows) {
  for (const [rowIndex, row] of rows.entries()) {
    const replacements = {};
    for (const [index, key] of header.entries()) {
      replacements[key] = row[index];
    }
    for (let attempts = 2; attempts >= 0; attempts -= 1) {
      try {
        await run(configurationJson, replacements);
        break;
      } catch (error) {
        console.error("Failed attempt for row " + (rowIndex+1) + "/" + rows.length + ", " + attempts + " attempts left.");
        if (attempts === 0) {
          console.log("{}");
        }
      }
    }
  }
}

if (process.argv.length < 3 || process.argv.length > 4) {
  console.error("Usage: " + process.argv[0] + " " + process.argv[1] + " <configuration-file> [<parameter-file>]");
} else {
  const configurationFile = process.argv[2];
  const configurationJson = fs.readFileSync(configurationFile, "utf8");
  if (process.argv.length === 3) {
    run(configurationJson);
  } else {
    const parameterFile = process.argv[3];
    const allRows = fs.readFileSync(parameterFile, "utf8").replace(/(\r\n|\n)$/, "").split(/\r\n|\n/).map(line => line.split("\t"));
    runWithParameters(configurationJson, allRows[0], allRows.splice(1));
  }
}

