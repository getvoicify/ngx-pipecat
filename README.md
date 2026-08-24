# ngx-pipecat

Workspace for [`@getvoicify/pipecat`](projects/pipecat/README.md), an
Angular-native wrapper around
[`@pipecat-ai/client-js`](https://www.npmjs.com/package/@pipecat-ai/client-js)
that exposes the Pipecat client SDK as injectable Angular services backed by
signals and observables. See [`projects/pipecat/README.md`](projects/pipecat/README.md)
for the library's install and usage docs — this file covers the workspace
itself, not the library's API.

Built on [Pipecat](https://github.com/pipecat-ai/pipecat).

## Repo structure

- `projects/pipecat/` — the published library, `@getvoicify/pipecat`.
- `src/` — a demo/dev-harness Angular app used during development; it is not
  published.

## Development

```bash
ng serve
```

Serves the demo app at `http://localhost:4200/`, reloading automatically
whenever you modify a source file under `src/`.

## Testing

```bash
ng test pipecat
```

Runs the library's unit tests with the [Vitest](https://vitest.dev/) test
runner (`@angular/build:unit-test`).

## Building

```bash
ng build pipecat
```

Builds the library with `ng-packagr`, producing the publishable package in
`dist/pipecat`.

## Contributing

Commits on `main` must follow [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `chore:`, `docs:`, etc.; a breaking change is `feat!:`/`fix!:`
or a `BREAKING CHANGE:` footer). PR titles are linted for the same convention
(`.github/workflows/lint-pr-title.yml`), and every conventional commit on
`main` feeds [release-please](https://github.com/googleapis/release-please),
which keeps an open release PR for `projects/pipecat` and cuts a release
(tag, `CHANGELOG.md`, and an automatic npm publish) when that PR is merged.
See [`projects/pipecat/README.md`](projects/pipecat/README.md#releasing) for
details.

## License

[BSD-2-Clause](./LICENSE)
