[![genirsim logo](./static/img/genirsim-logo.png "Logo of GenIRSim: Generated by Midjourney")](./static/img/genirsim-logo.png)

# GenIRSim

Flexible simulation and evaluation framework for generative IR.
[[demo](https://genirsim.webis.de/)] [[docs](https://webis-de.github.io/GenIRSim/)]

[![latest version](https://img.shields.io/github/v/tag/webis-de/GenIRSim?label=latest&sort=semver)](https://github.com/webis-de/GenIRSim)
[![npm workflow](https://img.shields.io/github/actions/workflow/status/webis-de/GenIRSim/npm.yml?label=nodejs)](https://www.npmjs.com/package/@webis-de/gen-ir-sim)
[![docker workflow](https://img.shields.io/github/actions/workflow/status/webis-de/GenIRSim/ghcr.yml?label=docker)](https://github.com/webis-de/GenIRSim/pkgs/container/GenIRSim)
[![license](https://img.shields.io/github/license/webis-de/GenIRSim)](https://github.com/webis-de/GenIRSim/blob/main/LICENSE)

<sup>Tested in node 21.7.2 with npm 10.5.0</sup>

## Quickstart

If you are not within the Webis network, you first need to replace all occurrences of the URL `https://llm.srv.webis.de/api/chat` and the `model` (`default`) in the [configuration](static/configurations) with the values for a server you have access to (OpenAI-compatible API). Then,
```
npm install
node bin/genirsim static/configurations/discussion.json > eval.json
```

To run the [web server](http://localhost:8000):
```
npm install
node bin/genirsim-server
```
or
```
GENIRSIM_VERSION=$(jq -r '.version' package.json)
docker run --rm -it -p 8000:8000 ghcr.io/webis-de/genirsim:${GENIRSIM_VERSION}
```


## Citation

If you use GenIRSim in your publication, cite it using the following publication:
```
Johannes Kiesel, Marcel Gohsen, Nailia Mirzakhmedova, Matthias Hagen, and Benno Stein.
Who Will Evaluate the Evaluators? Exploring the Gen-IR User Simulation Space.
In Lorraine Goeuriot et al., editors, Experimental IR Meets Multilinguality, Multimodality, and Interaction.
15th International Conference of the CLEF Association (CLEF 2024),
volume 14958 of Lecture Notes in Computer Science, pages 166–171, September 2024. Springer.
```
See [the paper's entry on the Webis publication page](https://webis.de/publications.html#kiesel_2024c) for the BibTeX entry, additional links, and the paper itself.

