import { inject, Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { merge, Observable, Subject } from 'rxjs';
import { map, scan } from 'rxjs/operators';
import { JobStatus, RTVIEvent, UIJobGroupEnvelope } from '@pipecat-ai/client-js';
import { fromClientEvent } from './events';
import { PIPECAT_CLIENT } from './tokens';

export interface UIWorkerState {
  name: string;
  status: JobStatus;
  latestUpdate: unknown | null;
  response: unknown | null;
}

export interface UIJobGroupState {
  jobId: string;
  label: string | null;
  cancellable: boolean;
  startedAt: number;
  completedAt: number | null;
  workers: Record<string, UIWorkerState>;
}

type UIJobGroupsById = Record<string, UIJobGroupState>;

type ClearJobGroupAction = { type: 'clearJobGroup'; jobId: string };
type ClearCompletedJobGroupsAction = { type: 'clearCompletedJobGroups' };
type EnvelopeAction = { type: 'envelope'; envelope: UIJobGroupEnvelope };
type UIJobGroupsAction = EnvelopeAction | ClearJobGroupAction | ClearCompletedJobGroupsAction;

function reduceEnvelope(acc: UIJobGroupsById, envelope: UIJobGroupEnvelope): UIJobGroupsById {
  switch (envelope.kind) {
    case 'group_started': {
      const workers: Record<string, UIWorkerState> = {};
      for (const name of envelope.workers) {
        workers[name] = { name, status: 'running', latestUpdate: null, response: null };
      }
      return {
        ...acc,
        [envelope.job_id]: {
          jobId: envelope.job_id,
          label: envelope.label ?? null,
          cancellable: envelope.cancellable,
          startedAt: envelope.at,
          completedAt: null,
          workers,
        },
      };
    }
    case 'job_update': {
      const group = acc[envelope.job_id];
      const worker = group?.workers[envelope.worker_name];
      if (!group || !worker) {
        return acc;
      }
      return {
        ...acc,
        [envelope.job_id]: {
          ...group,
          workers: {
            ...group.workers,
            [envelope.worker_name]: { ...worker, latestUpdate: envelope.data },
          },
        },
      };
    }
    case 'job_completed': {
      const group = acc[envelope.job_id];
      const worker = group?.workers[envelope.worker_name];
      if (!group || !worker) {
        return acc;
      }
      return {
        ...acc,
        [envelope.job_id]: {
          ...group,
          workers: {
            ...group.workers,
            [envelope.worker_name]: {
              ...worker,
              status: envelope.status,
              response: envelope.response ?? null,
            },
          },
        },
      };
    }
    case 'group_completed': {
      const group = acc[envelope.job_id];
      if (!group) {
        return acc;
      }
      return {
        ...acc,
        [envelope.job_id]: { ...group, completedAt: envelope.at },
      };
    }
  }
}

function reduce(acc: UIJobGroupsById, action: UIJobGroupsAction): UIJobGroupsById {
  switch (action.type) {
    case 'envelope':
      return reduceEnvelope(acc, action.envelope);
    case 'clearJobGroup': {
      if (!(action.jobId in acc)) {
        return acc;
      }
      const next = { ...acc };
      delete next[action.jobId];
      return next;
    }
    case 'clearCompletedJobGroups': {
      const next: UIJobGroupsById = {};
      for (const [jobId, group] of Object.entries(acc)) {
        if (group.completedAt === null) {
          next[jobId] = group;
        }
      }
      return next;
    }
  }
}

/**
 * Aggregates the `RTVIEvent.UIJobGroup` envelope stream into queryable
 * signal state, keyed by `job_id`. Follows the same
 * `fromClientEvent` + `scan` + `toSignal` idiom as `Pipecat`'s private
 * `status$`/`status` signal in `pipecat.ts`.
 *
 * Completed groups are retained until explicitly cleared via
 * `clearJobGroup`/`clearCompletedJobGroups` — they are not auto-removed.
 */
@Injectable()
export class PipecatUIJobGroups {
  private readonly client = inject(PIPECAT_CLIENT);
  private readonly clear$ = new Subject<ClearJobGroupAction | ClearCompletedJobGroupsAction>();

  private readonly jobGroups$: Observable<UIJobGroupsById> = merge(
    fromClientEvent(this.client, RTVIEvent.UIJobGroup).pipe(
      map((envelope): UIJobGroupsAction => ({ type: 'envelope', envelope })),
    ),
    this.clear$,
  ).pipe(scan(reduce, {} as UIJobGroupsById));

  readonly jobGroups: Signal<UIJobGroupsById> = toSignal(this.jobGroups$, { initialValue: {} });

  clearJobGroup(jobId: string): void {
    this.clear$.next({ type: 'clearJobGroup', jobId });
  }

  clearCompletedJobGroups(): void {
    this.clear$.next({ type: 'clearCompletedJobGroups' });
  }
}
