// @flow
import invariant from 'tiny-invariant';
import type { Position } from 'css-box-model';
import type {
  DroppableDimension,
  DraggableDimension,
  StateWhenUpdatesAllowed,
  DroppableId,
  DimensionMap,
  DragImpact,
  Viewport,
} from '../../../../types';
import whatIsDraggedOver from '../../../droppable/what-is-dragged-over';
import recomputeDisplacementVisibility from './recompute-displacement-visibility';
import getClientBorderBoxCenter from '../../../get-center-from-impact/get-client-border-box-center';

type Args = {|
  state: StateWhenUpdatesAllowed,
  dimensions?: DimensionMap,
  viewport?: Viewport,
|};

export type Result = {|
  clientSelection: Position,
  impact: DragImpact,
|};

export default ({
  state,
  dimensions: forcedDimensions,
  viewport: forcedViewport,
}: Args): Result => {
  invariant(state.movementMode === 'SNAP');

  const viewport: Viewport = forcedViewport || state.viewport;
  const dimensions: DimensionMap = forcedDimensions || state.dimensions;
  const { draggables, droppables } = dimensions;

  const draggable: DraggableDimension = draggables[state.critical.draggable.id];
  const isOver: ?DroppableId = whatIsDraggedOver(state.impact);
  invariant(isOver, 'Must be over a destination in SNAP movement mode');
  const destination: DroppableDimension = droppables[isOver];

  const needsVisibilityCheck: DragImpact = state.impact;
  const impact: DragImpact = recomputeDisplacementVisibility({
    impact: needsVisibilityCheck,
    viewport,
    destination,
    draggables,
  });

  const clientSelection: Position = getClientBorderBoxCenter({
    impact,
    draggable,
    droppable: destination,
    draggables,
    viewport: state.viewport,
  });

  return { impact, clientSelection };
};
