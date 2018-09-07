// @flow
import invariant from 'tiny-invariant';
import { type Position, type BoxModel, offset } from 'css-box-model';
import type { Result } from '../move-cross-axis-types';
import getDisplacement from '../../../get-displacement';
import withDroppableDisplacement from '../../../with-droppable-displacement';
import getDisplacementMap from '../../../get-displacement-map';
import getDisplacedBy from '../../../get-displaced-by';
import { noMovement } from '../../../no-impact';
import { goIntoStart, goAfter, goBefore } from '../../../move-relative-to';
import type {
  Axis,
  DragImpact,
  DraggableDimension,
  DroppableDimension,
  DraggableDimensionMap,
  Displacement,
  Viewport,
  DisplacedBy,
} from '../../../../types';

type Args = {|
  pageBorderBoxCenter: Position,
  movingIntoIndexOf: ?DraggableDimension,
  insideDestination: DraggableDimension[],
  draggable: DraggableDimension,
  draggables: DraggableDimensionMap,
  destination: DroppableDimension,
  previousImpact: DragImpact,
  viewport: Viewport,
|};

export default ({
  pageBorderBoxCenter,
  movingIntoIndexOf,
  insideDestination,
  draggable,
  draggables,
  destination,
  previousImpact,
  viewport,
}: Args): Result => {
  const axis: Axis = destination.axis;

  // Moving to an empty list

  if (!movingIntoIndexOf || !insideDestination.length) {
    const newCenter: Position = goIntoStart({
      axis,
      // TODO: page!?
      moveInto: destination.client,
      isMoving: draggable.client,
    });

    const newImpact: DragImpact = {
      movement: noMovement,
      direction: axis.direction,
      destination: {
        droppableId: destination.descriptor.id,
        index: 0,
      },
      merge: null,
    };

    return {
      pageBorderBoxCenter: withDroppableDisplacement(destination, newCenter),
      impact: newImpact,
    };
  }

  // // Moving to a populated list

  const targetIndex: number = insideDestination.indexOf(movingIntoIndexOf);
  invariant(targetIndex !== -1);

  const isGoingBeforeTarget: boolean = Boolean(
    pageBorderBoxCenter[destination.axis.line] <
      movingIntoIndexOf.page.borderBox.center[destination.axis.line],
  );

  const proposedIndex: number = isGoingBeforeTarget
    ? targetIndex
    : targetIndex + 1;

  const displaced: Displacement[] = insideDestination.slice(proposedIndex).map(
    (dimension: DraggableDimension): Displacement =>
      getDisplacement({
        draggable: dimension,
        destination,
        viewport: viewport.frame,
        previousImpact,
      }),
  );

  const willDisplaceForward: boolean = true;
  const displacedBy: DisplacedBy = getDisplacedBy(
    destination.axis,
    draggable.displaceBy,
    willDisplaceForward,
  );

  const newCenter: Position = (() => {
    // nothing displaced, and not an empty list.
    // move below the last item
    if (!displaced.length) {
      const target: DraggableDimension =
        insideDestination[insideDestination.length - 1];
      return goAfter({
        axis,
        moveRelativeTo: target.page,
        isMoving: draggable.page,
      });
    }
    const first: DraggableDimension = draggables[displaced[0].draggableId];
    const withDisplacement: BoxModel = offset(first.page, displacedBy.point);
    return goBefore({
      axis,
      moveRelativeTo: withDisplacement,
      isMoving: draggable.page,
    });
  })();

  const newImpact: DragImpact = {
    movement: {
      displacedBy,
      displaced,
      map: getDisplacementMap(displaced),
      willDisplaceForward,
    },
    direction: axis.direction,
    destination: {
      droppableId: destination.descriptor.id,
      index: proposedIndex,
    },
    merge: null,
  };

  return {
    pageBorderBoxCenter: withDroppableDisplacement(destination, newCenter),
    impact: newImpact,
  };
};
