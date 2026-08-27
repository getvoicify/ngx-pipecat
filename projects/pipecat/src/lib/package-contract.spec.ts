import dailyTransportPackageJson from '../../../../node_modules/@pipecat-ai/daily-transport/package.json';
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
});
