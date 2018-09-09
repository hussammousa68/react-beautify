// @flow
import type { Position } from 'css-box-model';
import getDragImpact from '../get-drag-impact';
import { add, subtract } from '../position';
import getDimensionMapWithPlaceholder from './get-dimension-map-with-placeholder';
import getUserDirection from '../user-direction/get-user-direction';
import type {
  DraggableDimension,
  DraggingState,
  ClientPositions,
  PagePositions,
  DragPositions,
  CollectingState,
  DragImpact,
  Viewport,
  DimensionMap,
  UserDirection,
} from '../../types';

type MoveArgs = {|
  state: DraggingState | CollectingState,
  clientSelection: Position,
  shouldAnimate: boolean,
  viewport?: Viewport,
  // force a custom drag impact
  impact?: ?DragImpact,
  // provide a scroll jump request (optionally provided - and can be null)
  scrollJumpRequest?: ?Position,
|};

export default ({
  state,
  clientSelection,
  shouldAnimate,
  viewport,
  impact: forcedImpact,
  scrollJumpRequest,
}: MoveArgs): CollectingState | DraggingState => {
  // DRAGGING: can update position and impact
  // COLLECTING: can update position but cannot update impact

  const newViewport: Viewport = viewport || state.viewport;
  const currentWindowScroll: Position = newViewport.scroll.current;

  const offset: Position = subtract(
    clientSelection,
    state.initial.client.selection,
  );

  const client: ClientPositions = {
    offset,
    selection: clientSelection,
    borderBoxCenter: add(state.initial.client.borderBoxCenter, offset),
  };

  const page: PagePositions = {
    selection: add(client.selection, currentWindowScroll),
    borderBoxCenter: add(client.borderBoxCenter, currentWindowScroll),
  };

  const current: DragPositions = {
    client,
    page,
  };

  const direction: UserDirection = getUserDirection(
    state.direction,
    state.current.page.borderBoxCenter,
    current.page.borderBoxCenter,
  );

  // Not updating impact while bulk collecting
  if (state.phase === 'COLLECTING') {
    return {
      // adding phase to appease flow (even though it will be overwritten by spread)
      phase: 'COLLECTING',
      ...state,
      current,
      direction,
    };
  }

  const draggable: DraggableDimension =
    state.dimensions.draggables[state.critical.draggable.id];

  const newImpact: DragImpact =
    forcedImpact ||
    getDragImpact({
      pageBorderBoxCenter: page.borderBoxCenter,
      draggable,
      draggables: state.dimensions.draggables,
      droppables: state.dimensions.droppables,
      previousImpact: state.impact,
      viewport: newViewport,
      direction,
    });

  const dimensions: DimensionMap = getDimensionMapWithPlaceholder({
    state,
    draggable,
    impact: newImpact,
  });

  // dragging!
  const result: DraggingState = {
    ...state,
    current,
    shouldAnimate,
    direction,
    dimensions,
    impact: newImpact,
    scrollJumpRequest: scrollJumpRequest || null,
    viewport: newViewport,
  };

  return result;
};
