// @flow
import type {
  DraggableId,
  DroppableId,
  DraggableDescriptor,
  Published,
  DraggableDimension,
  DroppableDimension,
  DroppableIdMap,
  Critical,
  DraggableIdMap,
} from '../../types';
import type { RecollectDroppableOptions } from './dimension-marshal-types';
import type {
  DroppableEntry,
  Registry,
  DraggableEntry,
  DraggableEntryMap,
} from '../registry/registry-types';
import * as timings from '../../debug/timings';
import { origin } from '../position';
import { warning } from '../../dev-warning';

export type WhileDraggingPublisher = {|
  add: (entry: DraggableEntry) => void,
  remove: (entry: DraggableEntry) => void,
  stop: () => void,
|};

type Staging = {|
  additions: DraggableEntryMap,
  removals: DraggableIdMap,
  modified: DroppableIdMap,
|};

type Callbacks = {|
  publish: (args: Published) => mixed,
  collectionStarting: () => mixed,
  getCritical: () => Critical,
|};

type Args = {|
  registry: Registry,
  callbacks: Callbacks,
|};

const clean = (): Staging => ({
  additions: {},
  removals: {},
  modified: {},
});

const timingKey: string = 'Publish collection from DOM';

export default function createPublisher({
  registry,
  callbacks,
}: Args): WhileDraggingPublisher {
  const advancedUsageWarning = (() => {
    // noop for production
    if (process.env.NODE_ENV === 'production') {
      return () => {};
    }

    let hasAnnounced: boolean = false;

    return () => {
      if (hasAnnounced) {
        return;
      }

      hasAnnounced = true;

      warning(`
        Advanced usage warning: you are adding or removing a dimension during a drag
        This an advanced feature.

        More information: https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/guides/changes-while-dragging.md
      `);
    };
  })();

  let staging: Staging = clean();
  let frameId: ?AnimationFrameID = null;

  const collect = () => {
    advancedUsageWarning();

    if (frameId) {
      return;
    }

    callbacks.collectionStarting();
    frameId = requestAnimationFrame(() => {
      frameId = null;
      const critical: Critical = callbacks.getCritical();
      timings.start(timingKey);

      const { additions, removals, modified } = staging;

      const added: DraggableDimension[] = Object.keys(additions)
        .map(
          // Using the origin as the window scroll. This will be adjusted when processing the published values
          (id: DraggableId): DraggableDimension =>
            registry.draggable.getById(id).getDimension(origin),
        )
        // Dimensions are not guarenteed to be ordered in the same order as keys
        // So we need to sort them so they are in the correct order
        .sort(
          (a: DraggableDimension, b: DraggableDimension): number =>
            a.descriptor.index - b.descriptor.index,
        );

      const updated: DroppableDimension[] = Object.keys(modified).map(
        (id: DroppableId) => {
          const entry: DroppableEntry = registry.droppable.getById(id);
          const isHome: boolean = entry.descriptor.id === critical.droppable.id;

          // need to keep the placeholder when in home list
          const options: RecollectDroppableOptions = {
            withoutPlaceholder: !isHome,
          };
          return entry.callbacks.recollect(options);
        },
      );

      const result: Published = {
        additions: added,
        removals: Object.keys(removals),
        modified: updated,
      };

      staging = clean();

      timings.finish(timingKey);
      callbacks.publish(result);
    });
  };

  const add = (entry: DraggableEntry) => {
    const id: DraggableId = entry.descriptor.id;
    staging.additions[id] = entry;
    staging.modified[entry.descriptor.droppableId] = true;

    if (staging.removals[id]) {
      delete staging.removals[id];
    }
    collect();
  };

  const remove = (entry: DraggableEntry) => {
    const descriptor: DraggableDescriptor = entry.descriptor;
    staging.removals[descriptor.id] = true;
    staging.modified[descriptor.droppableId] = true;

    if (staging.additions[descriptor.id]) {
      delete staging.additions[descriptor.id];
    }
    collect();
  };

  const stop = () => {
    if (!frameId) {
      return;
    }

    cancelAnimationFrame(frameId);
    frameId = null;
    staging = clean();
  };

  return {
    add,
    remove,
    stop,
  };
}
