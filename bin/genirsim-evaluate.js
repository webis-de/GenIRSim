#!/usr/bin/env node

import * as genirsim from "../src/index.js";
import fs from "fs";

if (process.argv.length !== 4) {
  console.error("Usage: <configuration-file> <runs-file>");
} else {
  const configuration = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const runs = fs.readFileSync(process.argv[3], "utf8").trim().split("\n").map(JSON.parse);
  const options = {};
  const evaluations = await Promise.all(runs.map(async (run) => {
    return await genirsim.evaluate(run.simulation, configuration.evaluation, options);
  }));
  for (const evaluation of evaluations) {
    console.log(JSON.stringify(evaluation));
  }
}

