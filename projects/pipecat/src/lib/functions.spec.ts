import { TestBed } from '@angular/core/testing';
import { PipecatFunctions } from './functions';
import { providePipecat } from './provider';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { FakeTransport } from './testing/fake-transport';

describe('PipecatFunctions', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function setup(transport: FakeTransport = new FakeTransport()) {
    TestBed.configureTestingModule({
      providers: [providePipecat(), { provide: PIPECAT_TRANSPORT, useValue: transport }],
    });
    return {
      functions: TestBed.inject(PipecatFunctions),
      client: TestBed.inject(PIPECAT_CLIENT),
      transport,
    };
  }

  describe('void delegation', () => {
    it('registerFunctionCallHandler() delegates to client.registerFunctionCallHandler() with the same name and callback', () => {
      const { functions, client } = setup();
      const spy = vi.spyOn(client, 'registerFunctionCallHandler').mockReturnValue(undefined);
      const callback = async () => ({ result: 'ok' });

      functions.registerFunctionCallHandler('my-function', callback);

      expect(spy).toHaveBeenCalledWith('my-function', callback);
    });

    it('unregisterFunctionCallHandler() delegates to client.unregisterFunctionCallHandler() with the same name', () => {
      const { functions, client } = setup();
      const spy = vi.spyOn(client, 'unregisterFunctionCallHandler').mockReturnValue(undefined);

      functions.unregisterFunctionCallHandler('my-function');

      expect(spy).toHaveBeenCalledWith('my-function');
    });

    it('unregisterAllFunctionCallHandlers() delegates to client.unregisterAllFunctionCallHandlers()', () => {
      const { functions, client } = setup();
      const spy = vi.spyOn(client, 'unregisterAllFunctionCallHandlers').mockReturnValue(undefined);

      functions.unregisterAllFunctionCallHandlers();

      expect(spy).toHaveBeenCalled();
    });
  });
});
