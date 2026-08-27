import packageJson from '../../package.json';

/**
 * The published `@pipecat-ai/client-js` peer range must stay a tilde range.
 *
 * Every official Pipecat transport pins `client-js` with a tilde:
 *   npm view @pipecat-ai/small-webrtc-transport@1.10.6 peerDependencies
 *     -> { '@pipecat-ai/client-js': '~1.13.0' }
 *   npm view @pipecat-ai/daily-transport@1.6.8 peerDependencies
 *     -> { '@pipecat-ai/client-js': '~1.13.0' }
 *
 * A caret would make our range looser than the transport's: a consumer could
 * resolve `client-js` 1.14.x, satisfying us while violating the transport,
 * with no signal from this package.
 */
const EXPECTED_CLIENT_JS_PEER_RANGE = '~1.13.0';

describe('@getvoicify/pipecat package contract', () => {
  it('declares the @pipecat-ai/client-js peer range as a tilde range that excludes 1.14.x', () => {
    expect(packageJson.peerDependencies['@pipecat-ai/client-js']).toBe(
      EXPECTED_CLIENT_JS_PEER_RANGE,
    );
  });

  it('does not widen the @pipecat-ai/client-js peer range with a caret', () => {
    expect(packageJson.peerDependencies['@pipecat-ai/client-js'].startsWith('^')).toBe(false);
  });
});
