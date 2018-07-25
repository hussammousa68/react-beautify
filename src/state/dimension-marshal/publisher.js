// @flow
import invariant from 'tiny-invariant';
import type { Position } from 'css-box-model';
import type {
  DraggableId,
  DroppableId,
  Published,
  DraggableDimension,
  DroppableDimension,
  DroppableDimensionMap,
} from '../../types';
import type {
  Collection,
  Entries,
  DroppableEntry,
} from './dimension-marshal-types';
import * as timings from '../../debug/timings';
import { origin } from '../position';

export type Publisher = {|
  addDraggable: (id: DraggableId) => void,
  addDroppable: (id: DroppableId) => void,
  removeDraggable: (id: DraggableId) => void,
  removeDroppable: (id: DroppableId) => void,
  stop: () => void,
|};

type DraggableMap = {
  [id: DraggableId]: true,
};

type DroppableMap = {
  [id: DroppableId]: true,
};

type Map = {|
  draggables: DraggableMap,
  droppables: DroppableMap,
|};

export type Provided = {|
  entries: Entries,
  collection: Collection,
|};

type Callbacks = {|
  publish: (args: Published) => void,
  collectionStarting: () => void,
|};

type Args = {|
  getProvided: () => Provided,
  callbacks: Callbacks,
|};

const getEmptyMap = (): Map => ({
  draggables: {},
  droppables: {},
});

const timingKey: string = 'Publish collection from DOM';

export default ({ getProvided, callbacks }: Args): Publisher => {
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

      if (process.env.NODE_ENV === 'production') {
        return;
      }

      console.warn(
        `
        Advanced usage warning: you are adding or removing a dimension during a drag
        This an advanced feature used to support dynamic interactions such as lazy loading lists.

        Keep in mind the following restrictions:

        - Draggable's can only be added to Droppable's that are scroll containers
        - Adding a Droppable cannot impact the placement of other Droppables
          (it cannot push a Droppable on the page)

        (This warning will be stripped in production builds)
      `.trim(),
      );
    };
  })();

  let additions: Map = getEmptyMap();
  let removals: Map = getEmptyMap();
  let frameId: ?AnimationFrameID = null;

  const reset = () => {
    additions = getEmptyMap();
    removals = getEmptyMap();
  };

  const collect = () => {
    advancedUsageWarning();

    if (frameId) {
      return;
    }

    frameId = requestAnimationFrame(() => {
      frameId = null;
      callbacks.collectionStarting();
      timings.start(timingKey);

      const { entries, collection } = getProvided();
      // Using the origin as the window scroll. This will be adjusted when processing the published values
      const windowScroll: Position = origin;

      const draggables: DraggableDimension[] = Object.keys(
        additions.draggables,
      ).map(
        (id: DraggableId): DraggableDimension =>
          // TODO
          entries.draggables[id].getDimension(windowScroll),
      );

      const droppables: DroppableDimension[] = Object.keys(
        additions.droppables,
      ).map(
        (id: DroppableId): DroppableDimension =>
          entries.droppables[id].callbacks.getDimensionAndWatchScroll(
            windowScroll,
            collection.scrollOptions,
          ),
      );

      type UniqueMap = {
        [id: DroppableId]: DroppableEntry,
      };

      const existing: UniqueMap = draggables
        .map(
          (draggable: DraggableDimension): DroppableId =>
            draggable.descriptor.droppableId,
        )
        .reduce((map: UniqueMap, id: DroppableId) => {
          // was only newly added
          if (additions.droppables[id]) {
            return map;
          }

          // already collected
          if (map[id]) {
            return map;
          }

          const entry: ?DroppableEntry = entries.droppables[id];
          invariant(entry, 'Cannot find Droppable entry');

          map[id] = entry;
          return map;
        }, {});
      console.log('existing', existing);

      const modified: DroppableDimension[] = Object.keys(existing).map(
        (id: DroppableId): DroppableDimension =>
          existing[id].callbacks.recollect(),
      );

      const result: Published = {
        additions: {
          draggables,
          droppables,
        },
        removals: {
          draggables: Object.keys(removals.draggables),
          droppables: Object.keys(removals.droppables),
        },
        modified,
      };

      reset();

      timings.finish(timingKey);
      callbacks.publish(result);
    });
  };

  const addDraggable = (id: DraggableId) => {
    additions.draggables[id] = true;

    if (removals.draggables[id]) {
      delete removals.draggables[id];
    }
    collect();
  };

  const removeDraggable = (id: DraggableId) => {
    removals.draggables[id] = true;

    if (additions.draggables[id]) {
      delete additions.draggables[id];
    }
    collect();
  };

  const addDroppable = (id: DroppableId) => {
    additions.droppables[id] = true;

    if (removals.droppables[id]) {
      delete removals.droppables[id];
    }
    collect();
  };

  const removeDroppable = (id: DroppableId) => {
    removals.droppables[id] = true;

    if (additions.droppables[id]) {
      delete additions.droppables[id];
    }
    collect();
  };

  const stop = () => {
    if (!frameId) {
      return;
    }

    cancelAnimationFrame(frameId);
    frameId = null;
    reset();
  };

  return {
    addDraggable,
    removeDraggable,
    addDroppable,
    removeDroppable,
    stop,
  };
};
