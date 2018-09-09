// @flow
import invariant from 'tiny-invariant';
import type { Position } from 'css-box-model';
import fromCombine, { type Result as FromCombineResult } from './from-combine';
import isTotallyVisibleInNewLocation from './is-totally-visible-in-new-location';
import { withFirstAdded, withFirstRemoved } from './get-forced-displacement';
import getDisplacedBy from '../../../get-displaced-by';
import getDisplacementMap from '../../../get-displacement-map';
import withDroppableDisplacement from '../../../with-droppable-displacement';
import { subtract } from '../../../position';
import getInListResult from './in-list';
import type { Result } from '../move-to-next-place-types';
import type { InListResult } from './move-to-next-index-types';
import type {
  Axis,
  DraggableDimension,
  Displacement,
  DroppableDimension,
  DraggableDimensionMap,
  DragImpact,
  Viewport,
  DisplacedBy,
  DraggableLocation,
} from '../../../../types';

export type Args = {|
  isMovingForward: boolean,
  isInHomeList: boolean,
  draggable: DraggableDimension,
  destination: DroppableDimension,
  draggables: DraggableDimensionMap,
  insideDestination: DraggableDimension[],
  previousImpact: DragImpact,
  previousPageBorderBoxCenter: Position,
  viewport: Viewport,
|};

export default ({
  isMovingForward,
  isInHomeList,
  draggable,
  destination,
  draggables,
  insideDestination,
  previousImpact,
  previousPageBorderBoxCenter,
  viewport,
}: Args): ?Result => {
  const location: ?DraggableLocation = previousImpact.destination;
  invariant(location, 'requires a previous location to move');

  const inList: ?InListResult = getInListResult({
    isMovingForward,
    isInHomeList,
    draggable,
    location,
    destination,
    draggables,
    previousImpact,
    insideDestination,
    previousPageBorderBoxCenter,
  });

  if (!inList) {
    return null;
  }

  const newPageBorderBoxCenter: Position = inList.newPageBorderBoxCenter;
  const willDisplaceForward: boolean = inList.willDisplaceForward;
  const proposedIndex: number = inList.proposedIndex;
  const axis: Axis = destination.axis;

  const isVisibleInNewLocation: boolean = isTotallyVisibleInNewLocation({
    draggable,
    destination,
    newPageBorderBoxCenter,
    viewport: viewport.frame,
    // not applying the displacement of the droppable for this check
    // we are only interested in the page location of the dragging item
    withDroppableDisplacement: false,
    // we only care about it being visible relative to the main axis
    // this is important with dynamic changes as scroll bar and toggle
    // on the cross axis during a drag
    onlyOnMainAxis: true,
  });

  const displaced: Displacement[] = inList.addToDisplacement
    ? withFirstAdded({
        add: inList.addToDisplacement,
        destination,
        draggables,
        previousImpact,
        viewport,
      })
    : withFirstRemoved({
        dragging: draggable,
        destination,
        isVisibleInNewLocation,
        previousImpact,
        draggables,
      });

  const displacedBy: DisplacedBy = getDisplacedBy(
    axis,
    draggable.displaceBy,
    willDisplaceForward,
  );

  const newImpact: DragImpact = {
    movement: {
      displacedBy,
      displaced,
      map: getDisplacementMap(displaced),
      willDisplaceForward,
    },
    destination: {
      droppableId: destination.descriptor.id,
      index: proposedIndex,
    },
    direction: axis.direction,
    merge: null,
  };

  if (isVisibleInNewLocation) {
    return {
      pageBorderBoxCenter: withDroppableDisplacement(
        destination,
        newPageBorderBoxCenter,
      ),
      impact: newImpact,
      scrollJumpRequest: null,
    };
  }

  // The full distance required to get from the previous page center to the new page center
  const distance: Position = subtract(
    newPageBorderBoxCenter,
    previousPageBorderBoxCenter,
  );

  return {
    pageBorderBoxCenter: previousPageBorderBoxCenter,
    impact: newImpact,
    scrollJumpRequest: distance,
  };
};
