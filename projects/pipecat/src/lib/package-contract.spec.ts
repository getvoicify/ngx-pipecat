import dailyTransportPackageJson from '../../../../node_modules/@pipecat-ai/daily-transport/package.json';
import releasePleaseConfig from '../../../../release-please-config.json';
import packageJson from '../../package.json';

/**
 * Two-sided guard on the published `@pipecat-ai/client-js` peer range.
 *
 * Every official Pipecat transport pins `client-js` with a tilde:
 *   npm view @pipecat-ai/small-webrtc-transport@1.10.6 peerDependencies
 *     -> { '@pipecat-ai/client-js': '~1.13.0' }
 *   npm view @pipecat-ai/daily-transport@1.6.8 peerDependencies
 *     -> { '@pipecat-ai/client-js': '~1.13.0' }
 *
 * Our range has to track the transport's exactly, and it can drift away in two
 * directions. Widen it (a caret, say) and a consumer can resolve `client-js`
 * 1.14.x, satisfying us while violating the transport, with no signal from
 * this package. Leave it behind when the transport moves on and we strand
 * consumers on a `client-js` the transport no longer accepts.
 *
 * One assertion per direction, neither redundant with the other:
 *
 *  1. The frozen constant catches an accidental widening in a dependency-bump
 *     PR. It never consults the transport, so it cannot drift along with one.
 *  2. The comparison against the *installed* transport catches the transport
 *     moving (to `~1.14.0`, say) without us following. It reads a live fact,
 *     so it goes red on the bump commit instead of staying green forever
 *     against a string frozen at the time of writing.
 *
 * `@pipecat-ai/daily-transport` does not list `./package.json` in its
 * `exports` map, so its manifest is read by relative path into `node_modules`
 * rather than by package specifier.
 */
const EXPECTED_CLIENT_JS_PEER_RANGE = '~1.13.0';

describe('@getvoicify/pipecat package contract', () => {
  it('declares the @pipecat-ai/client-js peer range as a tilde range that excludes 1.14.x', () => {
    expect(packageJson.peerDependencies['@pipecat-ai/client-js']).toBe(
      EXPECTED_CLIENT_JS_PEER_RANGE,
    );
  });

  it('matches the @pipecat-ai/client-js peer range declared by the installed daily transport', () => {
    expect(packageJson.peerDependencies['@pipecat-ai/client-js']).toBe(
      dailyTransportPackageJson.peerDependencies['@pipecat-ai/client-js'],
    );
  });

  /**
   * The version this package is allowed to reach on its own is part of the
   * published contract, so the release-please policy is guarded here beside
   * the peer range.
   *
   * `bump-minor-pre-major` is what keeps a breaking change on the 0.x track.
   * From `DefaultVersioningStrategy.determineReleaseType`:
   *
   *   if (breaking > 0) {
   *     if (version.isPreMajor && this.bumpMinorPreMajor) {
   *       return new MinorVersionUpdate();
   *     } else {
   *       return new MajorVersionUpdate();
   *     }
   *   }
   *
   * `isPreMajor()` is `this.major < 1`, so at 0.2.0 a `feat!:` /
   * `BREAKING CHANGE:` cuts 0.3.0 with the flag on and 1.0.0 with it off.
   * The flag has no default of its own: the constructor reads
   * `options.bumpMinorPreMajor === true`, so an absent key is `false` and the
   * next breaking commit declares this library 1.0 stable while its API is
   * still being designed. Deleting the key is therefore silent — nothing else
   * in the repo would go red — which is what this assertion is for.
   *
   * Deliberately NOT paired with `bump-patch-for-minor-pre-major`. That is a
   * separate option covering the `features > 0` branch, and turning it on
   * would demote ordinary non-breaking `feat:` commits from a minor to a
   * patch (0.2.0 -> 0.2.1 instead of 0.3.0). We want the breaking-change
   * guard only.
   *
   * Reaching 1.0.0 stays possible, but only deliberately: flip this flag, or
   * land a `Release-As: 1.0.0` commit.
   *
   * The config is read through a widened record on purpose. TypeScript infers
   * a JSON import's exact literal shape, so indexing the key directly makes a
   * *deleted* key a TS7053 compile error rather than a failing assertion --
   * the removal would still be caught, but as a build break in an unrelated
   * error class instead of a red test naming the policy. Widening keeps both
   * ways of losing the guard (key deleted, value flipped to `false`) landing
   * on this assertion. Do not narrow it back.
   */
  it('keeps release-please bumping the minor, not the major, for breaking changes below 1.0.0', () => {
    const options: Readonly<Record<string, unknown>> = releasePleaseConfig;

    expect(options['bump-minor-pre-major']).toBe(true);
  });
});
