// @flow
import { type Position } from 'css-box-model';
import type {
  DroppableId,
  DraggableDimension,
  DroppableDimension,
  DraggableDimensionMap,
  DroppableDimensionMap,
  UserDirection,
  DragImpact,
  CombineImpact,
  Viewport,
} from '../../types';
import getDroppableOver from '../get-droppable-over';
import getDraggablesInsideDroppable from '../get-draggables-inside-droppable';
import inHomeList from './in-home-list';
import inForeignList from './in-foreign-list';
import getCombineImpact from './get-combine-impact';
import noImpact from '../no-impact';
import withDroppableScroll from '../with-droppable-scroll';

type Args = {|
  pageBorderBoxCenter: Position,
  draggable: DraggableDimension,
  // all dimensions in system
  draggables: DraggableDimensionMap,
  droppables: DroppableDimensionMap,
  previousImpact: DragImpact,
  viewport: Viewport,
  direction: UserDirection,
|};

export default ({
  pageBorderBoxCenter,
  draggable,
  draggables,
  droppables,
  previousImpact,
  viewport,
  direction,
}: Args): DragImpact => {
  const destinationId: ?DroppableId = getDroppableOver({
    target: pageBorderBoxCenter,
    droppables,
  });

  // not dragging over anything
  if (!destinationId) {
    return noImpact;
  }

  const destination: DroppableDimension = droppables[destinationId];

  if (!destination.isEnabled) {
    return noImpact;
  }

  const isWithinHomeDroppable: boolean =
    draggable.descriptor.droppableId === destinationId;
  const insideDestination: DraggableDimension[] = getDraggablesInsideDroppable(
    destination,
    draggables,
  );
  // Where the element actually is now.
  // Need to take into account the change of scroll in the droppable
  const pageBorderBoxCenterWithDroppableScroll: Position = withDroppableScroll(
    destination,
    pageBorderBoxCenter,
  );

  const combine: ?CombineImpact = getCombineImpact({
    pageBorderBoxCenterWithDroppableScroll,
    previousImpact,
    draggable,
    destination,
    insideDestination,
    direction,
  });

  // If there is a combine impact then the displacement
  // cannot change displacement
  // TODO: what if entering a new list?
  if (combine) {
    const withGroup: DragImpact = {
      ...previousImpact,
      destination: null,
      combine,
    };
    return withGroup;
  }

  return isWithinHomeDroppable
    ? inHomeList({
        pageBorderBoxCenterWithDroppableScroll,
        draggable,
        home: destination,
        insideHome: insideDestination,
        previousImpact,
        viewport,
        direction,
      })
    : inForeignList({
        pageBorderBoxCenterWithDroppableScroll,
        draggable,
        destination,
        insideDestination,
        previousImpact,
        viewport,
        direction,
      });
};
