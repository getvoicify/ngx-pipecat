import { TestBed } from '@angular/core/testing';
import { RTVIEvent } from '@pipecat-ai/client-js';
import type {
  UIJobGroupStartedEnvelope,
  UIJobUpdateEnvelope,
  UIJobCompletedEnvelope,
  UIJobGroupCompletedEnvelope,
} from '@pipecat-ai/client-js';
import { PipecatUIJobGroups } from './ui-job-groups';
import { providePipecat } from './provider';
import { PIPECAT_CLIENT, PIPECAT_TRANSPORT } from './tokens';
import { FakeTransport } from './testing/fake-transport';

describe('PipecatUIJobGroups', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function setup(transport: FakeTransport = new FakeTransport()) {
    TestBed.configureTestingModule({
      providers: [providePipecat(), { provide: PIPECAT_TRANSPORT, useValue: transport }],
    });
    return {
      uiJobGroups: TestBed.inject(PipecatUIJobGroups),
      client: TestBed.inject(PIPECAT_CLIENT),
      transport,
    };
  }

  function groupStarted(overrides: Partial<UIJobGroupStartedEnvelope> = {}): UIJobGroupStartedEnvelope {
    return {
      kind: 'group_started',
      job_id: 'job-1',
      workers: ['worker-a', 'worker-b'],
      label: 'Doing work',
      cancellable: true,
      at: 1000,
      ...overrides,
    };
  }

  it('group_started creates a new entry in jobGroups() with all workers initialized', () => {
    const { uiJobGroups, client } = setup();

    client.emit(RTVIEvent.UIJobGroup, groupStarted());

    const group = uiJobGroups.jobGroups()['job-1'];
    expect(group).toEqual({
      jobId: 'job-1',
      label: 'Doing work',
      cancellable: true,
      startedAt: 1000,
      completedAt: null,
      workers: {
        'worker-a': { name: 'worker-a', status: 'running', latestUpdate: null, response: null },
        'worker-b': { name: 'worker-b', status: 'running', latestUpdate: null, response: null },
      },
    });
  });

  it('job_update for one worker updates only that worker latestUpdate, leaving others untouched', () => {
    const { uiJobGroups, client } = setup();
    client.emit(RTVIEvent.UIJobGroup, groupStarted());

    const update: UIJobUpdateEnvelope = {
      kind: 'job_update',
      job_id: 'job-1',
      worker_name: 'worker-a',
      data: { progress: 0.5 },
      at: 1100,
    };
    client.emit(RTVIEvent.UIJobGroup, update);

    const group = uiJobGroups.jobGroups()['job-1']!;
    expect(group.workers['worker-a']).toEqual({
      name: 'worker-a',
      status: 'running',
      latestUpdate: { progress: 0.5 },
      response: null,
    });
    expect(group.workers['worker-b']).toEqual({
      name: 'worker-b',
      status: 'running',
      latestUpdate: null,
      response: null,
    });
  });

  it('job_completed for one worker sets its status/response, leaving completedAt null and other workers untouched', () => {
    const { uiJobGroups, client } = setup();
    client.emit(RTVIEvent.UIJobGroup, groupStarted());

    const completed: UIJobCompletedEnvelope = {
      kind: 'job_completed',
      job_id: 'job-1',
      worker_name: 'worker-a',
      status: 'completed',
      response: { result: 42 },
      at: 1200,
    };
    client.emit(RTVIEvent.UIJobGroup, completed);

    const group = uiJobGroups.jobGroups()['job-1']!;
    expect(group.workers['worker-a']).toEqual({
      name: 'worker-a',
      status: 'completed',
      latestUpdate: null,
      response: { result: 42 },
    });
    expect(group.workers['worker-b']).toEqual({
      name: 'worker-b',
      status: 'running',
      latestUpdate: null,
      response: null,
    });
    expect(group.completedAt).toBeNull();
  });

  it('job_completed with no response sets response to null', () => {
    const { uiJobGroups, client } = setup();
    client.emit(RTVIEvent.UIJobGroup, groupStarted());

    const completed: UIJobCompletedEnvelope = {
      kind: 'job_completed',
      job_id: 'job-1',
      worker_name: 'worker-a',
      status: 'failed',
      at: 1200,
    };
    client.emit(RTVIEvent.UIJobGroup, completed);

    expect(uiJobGroups.jobGroups()['job-1']!.workers['worker-a'].response).toBeNull();
  });

  it('group_completed sets completedAt on the group, leaving worker states untouched', () => {
    const { uiJobGroups, client } = setup();
    client.emit(RTVIEvent.UIJobGroup, groupStarted());
    client.emit(RTVIEvent.UIJobGroup, {
      kind: 'job_update',
      job_id: 'job-1',
      worker_name: 'worker-a',
      data: { progress: 1 },
      at: 1150,
    } as UIJobUpdateEnvelope);

    const groupCompleted: UIJobGroupCompletedEnvelope = {
      kind: 'group_completed',
      job_id: 'job-1',
      at: 1300,
    };
    client.emit(RTVIEvent.UIJobGroup, groupCompleted);

    const group = uiJobGroups.jobGroups()['job-1']!;
    expect(group.completedAt).toBe(1300);
    expect(group.workers['worker-a'].latestUpdate).toEqual({ progress: 1 });
  });

  it('an envelope referencing an unknown job_id does not throw and does not add a spurious entry', () => {
    const { uiJobGroups, client } = setup();

    expect(() => {
      client.emit(RTVIEvent.UIJobGroup, {
        kind: 'job_update',
        job_id: 'unknown-job',
        worker_name: 'worker-a',
        data: { progress: 0.1 },
        at: 1000,
      } as UIJobUpdateEnvelope);
    }).not.toThrow();

    expect(() => {
      client.emit(RTVIEvent.UIJobGroup, {
        kind: 'job_completed',
        job_id: 'unknown-job',
        worker_name: 'worker-a',
        status: 'completed',
        at: 1000,
      } as UIJobCompletedEnvelope);
    }).not.toThrow();

    expect(() => {
      client.emit(RTVIEvent.UIJobGroup, {
        kind: 'group_completed',
        job_id: 'unknown-job',
        at: 1000,
      } as UIJobGroupCompletedEnvelope);
    }).not.toThrow();

    expect(uiJobGroups.jobGroups()).toEqual({});
  });

  it('clearJobGroup(jobId) removes exactly that group and leaves others intact', () => {
    const { uiJobGroups, client } = setup();
    client.emit(RTVIEvent.UIJobGroup, groupStarted({ job_id: 'job-1' }));
    client.emit(RTVIEvent.UIJobGroup, groupStarted({ job_id: 'job-2', workers: ['worker-c'] }));

    uiJobGroups.clearJobGroup('job-1');

    const groups = uiJobGroups.jobGroups();
    expect(groups['job-1']).toBeUndefined();
    expect(groups['job-2']).toBeDefined();
  });

  it('clearCompletedJobGroups() removes every group with a non-null completedAt and leaves incomplete ones intact', () => {
    const { uiJobGroups, client } = setup();
    client.emit(RTVIEvent.UIJobGroup, groupStarted({ job_id: 'job-1' }));
    client.emit(RTVIEvent.UIJobGroup, groupStarted({ job_id: 'job-2' }));
    client.emit(RTVIEvent.UIJobGroup, {
      kind: 'group_completed',
      job_id: 'job-1',
      at: 1300,
    } as UIJobGroupCompletedEnvelope);

    uiJobGroups.clearCompletedJobGroups();

    const groups = uiJobGroups.jobGroups();
    expect(groups['job-1']).toBeUndefined();
    expect(groups['job-2']).toBeDefined();
  });

  it('tracks multiple independent job groups concurrently without interference', () => {
    const { uiJobGroups, client } = setup();
    client.emit(RTVIEvent.UIJobGroup, groupStarted({ job_id: 'job-1', workers: ['worker-a'] }));
    client.emit(RTVIEvent.UIJobGroup, groupStarted({ job_id: 'job-2', workers: ['worker-x'] }));

    client.emit(RTVIEvent.UIJobGroup, {
      kind: 'job_update',
      job_id: 'job-1',
      worker_name: 'worker-a',
      data: { step: 1 },
      at: 1050,
    } as UIJobUpdateEnvelope);

    const groups = uiJobGroups.jobGroups();
    expect(groups['job-1']!.workers['worker-a'].latestUpdate).toEqual({ step: 1 });
    expect(groups['job-2']!.workers['worker-x'].latestUpdate).toBeNull();
    expect(groups['job-1']!.jobId).toBe('job-1');
    expect(groups['job-2']!.jobId).toBe('job-2');
  });
});
