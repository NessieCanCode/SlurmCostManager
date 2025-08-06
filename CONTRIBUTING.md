# Contributing to SlurmCostManager

We welcome contributions of all kinds. Please take a moment to review these
guidelines to help us keep the process smooth for everyone.

## Community Support

Questions about using SlurmCostManager? Start a thread in
[GitHub Discussions](https://github.com/cockpit-project/SlurmCostManager/discussions).
See [SUPPORT.md](.github/SUPPORT.md) for more ways to get in touch.

## Code of Conduct

By participating in this project you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting Bugs and Requesting Features

Before filing an issue, search existing [issues](https://github.com/cockpit-project/SlurmCostManager/issues)
and [discussions](https://github.com/cockpit-project/SlurmCostManager/discussions) to avoid duplicates.
Use the provided templates when opening a bug report or feature request.

## Development Workflow

The project uses [Webpack](https://webpack.js.org/) to bundle and minify JavaScript and CSS assets.
Ensure you have a recent version of Node.js and `npm` installed.

1. Fork the repository and create a topic branch off `main`.
2. Make your changes, including tests and documentation when appropriate.
3. Run `npm install` if you haven't already to install the required build tools.
4. Run `make build` to generate the optimized assets in `dist/`.
5. Run `make check` and ensure all tests pass.
6. Commit with clear messages that describe your changes.
7. Submit a pull request using the template provided.

## Review & Approval

* CI checks must pass before a review will be taken.
* Every pull request requires approval from at least one maintainer.
* Reviewers may request additional changes or tests; please address all comments.
* Once approved and all checks pass, a maintainer will merge your pull request.

Thank you for helping to improve SlurmCostManager!
