// @flow
import type { Rect, Position } from 'css-box-model';
import type {
  DraggableId,
  Axis,
  UserDirection,
  DraggableDimension,
  DroppableDimension,
  CombineImpact,
  DragImpact,
  DisplacementMap,
} from '../../types';
import isWithin from '../is-within';
import { find } from '../../native-with-fallback';
import isUserMovingForward from '../user-direction/is-user-moving-forward';

const getDirectionForDetection = (
  id: DraggableId,
  currentDirection: UserDirection,
  oldMerge: ?CombineImpact,
): UserDirection => {
  if (!oldMerge) {
    return currentDirection;
  }
  if (id !== oldMerge.combine.draggableId) {
    return currentDirection;
  }
  return oldMerge.whenEntered;
};

type IsCombiningWithArgs = {|
  id: DraggableId,
  currentCenter: Position,
  axis: Axis,
  borderBox: Rect,
  displacedBy: number,
  currentDirection: UserDirection,
  oldMerge: ?CombineImpact,
|};

const isCombiningWith = ({
  id,
  currentCenter,
  axis,
  borderBox,
  displacedBy,
  currentDirection,
  oldMerge,
}: IsCombiningWithArgs): boolean => {
  const start: number = borderBox[axis.start] + displacedBy;
  const end: number = borderBox[axis.end] + displacedBy;
  const size: number = borderBox[axis.size];
  const oneThird: number = size * 0.333;

  const direction: UserDirection = getDirectionForDetection(
    id,
    currentDirection,
    oldMerge,
  );
  const isMovingForward: boolean = isUserMovingForward(axis, direction);

  // if moving forward then we will be hitting the start edge of the thing after us
  // if moving backwards we will be hitting the bottom edge of the thing behind us
  const adjustedStart: number = isMovingForward ? start : start + oneThird;
  const adjustedEnd: number = isMovingForward ? end - oneThird : end;

  return isWithin(adjustedStart, adjustedEnd)(currentCenter[axis.line]);
};

type Args = {|
  pageBorderBoxCenterWithDroppableScroll: Position,
  previousImpact: DragImpact,
  draggable: DraggableDimension,
  destination: DroppableDimension,
  insideDestination: DraggableDimension[],
  userDirection: UserDirection,
|};
export default ({
  pageBorderBoxCenterWithDroppableScroll: currentCenter,
  previousImpact,
  draggable,
  destination,
  insideDestination,
  userDirection,
}: Args): ?CombineImpact => {
  if (!destination.isCombineEnabled) {
    return null;
  }

  const axis: Axis = destination.axis;
  const map: DisplacementMap = previousImpact.movement.map;
  const canBeDisplacedBy: number = previousImpact.movement.displacedBy.value;
  const oldMerge: ?CombineImpact = previousImpact.merge;

  const target: ?DraggableDimension = find(
    insideDestination,
    (child: DraggableDimension): boolean => {
      // Cannot group with yourself
      const id: DraggableId = child.descriptor.id;
      if (id === draggable.descriptor.id) {
        return false;
      }

      const isDisplaced: boolean = Boolean(map[id]);
      const displacedBy: number = isDisplaced ? canBeDisplacedBy : 0;

      return isCombiningWith({
        id,
        currentCenter,
        axis,
        borderBox: child.page.borderBox,
        displacedBy,
        currentDirection: userDirection,
        oldMerge,
      });
    },
  );

  if (!target) {
    return null;
  }

  const result: CombineImpact = {
    whenEntered: getDirectionForDetection(
      target.descriptor.id,
      userDirection,
      oldMerge,
    ),
    combine: {
      draggableId: target.descriptor.id,
      droppableId: destination.descriptor.id,
    },
  };
  return result;
};
