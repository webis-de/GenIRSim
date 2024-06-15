#!/usr/bin/env node

import * as genirsim from "../src/index.js";
import fs from "fs";

if (process.argv.length < 3 || process.argv.length > 4) {
  console.error("Usage: <configuration-file> [<parameter-file>]");
} else {
  const configuration = fs.readFileSync(process.argv[2], "utf8");
  const options = {};
  const replacements = (process.argv.length === 4)
    ? genirsim.templates.tsv2Contexts(fs.readFileSync(process.argv[3], "utf8"))
    : [{}];
  const evaluations = await genirsim.run(configuration, options, replacements);
  for (const evaluation of evaluations) {
    console.log(JSON.stringify(evaluation));
  }
}

