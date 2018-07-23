// @flow

import type {
  DragImpact,
  DimensionMap,
  DraggingState,
  CollectingState,
  DropPendingState,
  Published,
  Critical,
  DraggableId,
  DraggableDimension,
  DroppableDimensionMap,
} from '../../types';
import * as timings from '../../debug/timings';
import getDragImpact from '../get-drag-impact';
import getHomeImpact from '../get-home-impact';
import getDimensionMap from './get-dimension-map';
import getDragPositions from './get-drag-positions';
import updateModifiedDroppables from './update-modified-droppables';
import adjustAdditionsForScrollChanges from './adjust-additions-for-scroll-changes';

type Args = {|
  state: CollectingState | DropPendingState,
  published: Published,
|};

const timingsKey: string = 'Massaging dynamic changes';

export default ({
  state,
  published,
}: Args): DraggingState | DropPendingState => {
  timings.start(timingsKey);
  // TODO: write validate that every removed draggable must have a removed droppable
  const withShifted: Published = adjustAdditionsForScrollChanges({
    published,
    droppables: state.dimensions.droppables,
    viewport: state.viewport,
  });

  // Change the client size of modified droppables
  const droppables: DroppableDimensionMap = updateModifiedDroppables({
    droppables: state.dimensions.droppables,
    modified: published.modified,
    initialWindowScroll: state.viewport.scroll.initial,
  });

  const patched: DimensionMap = {
    draggables: state.dimensions.draggables,
    droppables,
  };

  // Add, remove and shift dimensions
  const dimensions: DimensionMap = getDimensionMap({
    existing: patched,
    published: withShifted,
    initialWindowScroll: state.viewport.scroll.initial,
  });

  const dragging: DraggableId = state.critical.draggable.id;
  const original: DraggableDimension = state.dimensions.draggables[dragging];
  const updated: DraggableDimension = dimensions.draggables[dragging];

  const critical: Critical = {
    // droppable cannot change during a drag
    droppable: state.critical.droppable,
    // draggable index can change during a drag
    draggable: updated.descriptor,
  };

  // Get the updated drag positions to account for any
  // shift to the critical draggable
  const { initial, current } = getDragPositions({
    initial: state.initial,
    current: state.current,
    oldClientBorderBoxCenter: original.client.borderBox.center,
    newClientBorderBoxCenter: updated.client.borderBox.center,
    viewport: state.viewport,
  });

  // Get the impact of all of our changes
  const impact: DragImpact = getDragImpact({
    pageBorderBoxCenter: current.page.borderBoxCenter,
    draggable: dimensions.draggables[state.critical.draggable.id],
    draggables: dimensions.draggables,
    droppables: dimensions.droppables,
    previousImpact: getHomeImpact(state.critical, dimensions),
    viewport: state.viewport,
  });

  timings.finish(timingsKey);

  const draggingState: DraggingState = {
    // appeasing flow
    phase: 'DRAGGING',
    ...state,
    // eslint-disable-next-line
    phase: 'DRAGGING',
    critical,
    current,
    initial,
    impact,
    dimensions,
    // not animating this movement
    shouldAnimate: false,
  };

  if (state.phase === 'COLLECTING') {
    return draggingState;
  }

  // There was a DROP_PENDING
  // Staying in the DROP_PENDING phase
  // setting isWaiting for false

  const dropPending: DropPendingState = {
    // appeasing flow
    phase: 'DROP_PENDING',
    ...draggingState,
    // eslint-disable-next-line
    phase: 'DROP_PENDING',
    // No longer waiting
    reason: state.reason,
    isWaiting: false,
  };

  return dropPending;
};
