[![genirsim logo](./docs/img/genirsim-logo.png "Logo of GenIRSim: Generated by Midjourney")](./docs/img/genirsim-logo.png)

# GenIRSim

Flexible and easy-to-use simulation and evaluation framework for generative IR.

[![latest version](https://img.shields.io/github/v/tag/webis-de/GenIRSim?label=latest&sort=semver)](https://github.com/webis-de/GenIRSim)
[![api-docs](https://img.shields.io/badge/jsdoc-published-green)](https://webis-de.github.io/GenIRSim/)
[![npm workflow](https://img.shields.io/github/actions/workflow/status/webis-de/GenIRSim/npm.yml?label=nodejs)](https://www.npmjs.com/package/@webis-de/gen-ir-sim)
[![docker workflow](https://img.shields.io/github/actions/workflow/status/webis-de/GenIRSim/ghcr.yml?label=docker)](https://github.com/webis-de/GenIRSim/pkgs/container/GenIRSim)
[![license](https://img.shields.io/github/license/webis-de/GenIRSim)](https://github.com/webis-de/GenIRSim/blob/main/LICENSE)

Quickstart:
```
npm install
npm exec genirsim configurations/default-configuration.json > eval.json
```

To run the [web server](http://localhost:8000):
```
npm install
npm exec genirsim-server
```
or
```
docker run --rm -it -v 8000:8000 ghcr.io/webis-de/genirsim:$(jq -r '.version' package.json)
```


