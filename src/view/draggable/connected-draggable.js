// @flow
import { type Position } from 'css-box-model';
import { type Node } from 'react';
import memoizeOne from 'memoize-one';
import { connect } from 'react-redux';
import Draggable from './draggable';
import { storeKey } from '../context-keys';
import { origin } from '../../state/position';
import isStrictEqual from '../is-strict-equal';
import {
  lift as liftAction,
  move as moveAction,
  moveUp as moveUpAction,
  moveDown as moveDownAction,
  moveLeft as moveLeftAction,
  moveRight as moveRightAction,
  drop as dropAction,
  dropAnimationFinished as dropAnimationFinishedAction,
  moveByWindowScroll as moveByWindowScrollAction,
} from '../../state/action-creators';
import type {
  State,
  DraggableId,
  DroppableId,
  DragMovement,
  DraggableDimension,
  CombineImpact,
  Displacement,
  PendingDrop,
  DragImpact,
  DisplacementMap,
  DropReason,
} from '../../types';
import type {
  MapProps,
  OwnProps,
  DefaultProps,
  DispatchProps,
  Selector,
} from './draggable-types';

const defaultMapProps: MapProps = {
  isDragging: false,
  dropping: null,
  offset: origin,
  shouldAnimateDragMovement: false,
  // This is set to true by default so that as soon as Draggable
  // needs to be displaced it can without needing to change this flag
  shouldAnimateDisplacement: true,
  // these properties are only populated when the item is dragging
  dimension: null,
  draggingOver: null,
  combineWith: null,
  combineTargetFor: null,
};

// Returning a function to ensure each
// Draggable gets its own selector
export const makeMapStateToProps = (): Selector => {
  const memoizedOffset = memoizeOne(
    (x: number, y: number): Position => ({ x, y }),
  );

  const getSecondaryProps = memoizeOne(
    (
      offset: Position,
      combineTargetFor: ?DraggableId = null,
      shouldAnimateDisplacement: boolean,
    ): MapProps => ({
      ...defaultMapProps,
      offset,
      combineTargetFor,
      shouldAnimateDisplacement,
    }),
  );

  const getDraggingProps = memoizeOne(
    (
      offset: Position,
      shouldAnimateDragMovement: boolean,
      dimension: DraggableDimension,
      // the id of the droppable you are over
      draggingOver: ?DroppableId,
      // the id of a draggable you are grouping with
      combineWith: ?DraggableId,
    ): MapProps => ({
      isDragging: true,
      dropping: null,
      shouldAnimateDisplacement: false,
      offset,
      shouldAnimateDragMovement,
      dimension,
      draggingOver,
      combineWith,
      combineTargetFor: null,
    }),
  );

  const getSecondaryMovement = (
    ownId: DraggableId,
    draggingId: DraggableId,
    impact: DragImpact,
  ): ?MapProps => {
    // Doing this cuts 50% of the time to move
    // Otherwise need to loop over every item in every selector (yuck!)
    const map: DisplacementMap = impact.movement.map;
    const displacement: ?Displacement = map[ownId];
    const movement: DragMovement = impact.movement;
    const combine: ?CombineImpact = impact.combine;
    const isCombinedWith: boolean = Boolean(
      combine && combine.combineWith.draggableId === ownId,
    );
    const displacedBy: Position = movement.displacedBy.point;
    const offset: Position = memoizedOffset(displacedBy.x, displacedBy.y);

    if (isCombinedWith) {
      return getSecondaryProps(
        displacement ? offset : origin,
        draggingId,
        displacement
          ? displacement.shouldAnimate
          : defaultMapProps.shouldAnimateDisplacement,
      );
    }

    // does not need to move
    if (!displacement) {
      return null;
    }

    // do not need to do anything
    if (!displacement.isVisible) {
      return null;
    }

    return getSecondaryProps(offset, null, displacement.shouldAnimate);
  };

  const draggingSelector = (state: State, ownProps: OwnProps): ?MapProps => {
    // Dragging
    if (state.isDragging) {
      // not the dragging item
      if (state.critical.draggable.id !== ownProps.draggableId) {
        return null;
      }

      const offset: Position = state.current.client.offset;
      const dimension: DraggableDimension =
        state.dimensions.draggables[ownProps.draggableId];
      const shouldAnimateDragMovement: boolean = state.shouldAnimate;
      const draggingOver: ?DroppableId = state.impact.destination
        ? state.impact.destination.droppableId
        : null;

      const combineWith: ?DraggableId = state.impact.combine
        ? state.impact.combine.combineWith.draggableId
        : null;

      return getDraggingProps(
        memoizedOffset(offset.x, offset.y),
        shouldAnimateDragMovement,
        dimension,
        draggingOver,
        combineWith,
      );
    }

    // Dropping
    if (state.phase === 'DROP_ANIMATING') {
      const pending: PendingDrop = state.pending;
      if (pending.result.draggableId !== ownProps.draggableId) {
        return null;
      }

      const draggingOver: ?DroppableId = pending.result.destination
        ? pending.result.destination.droppableId
        : null;

      const combineWith: ?DraggableId = pending.result.combine
        ? pending.result.combine.draggableId
        : null;

      const duration: number = pending.dropDuration;
      const reason: DropReason = pending.result.reason;

      // not memoized as it is the only execution
      return {
        isDragging: false,
        dropping: {
          duration,
          reason,
        },
        offset: pending.newHomeOffset,
        // still need to provide the dimension for the placeholder
        dimension: state.dimensions.draggables[ownProps.draggableId],
        draggingOver,
        // animation will be controlled by the isDropAnimating flag
        shouldAnimateDragMovement: false,
        // Combining
        combineWith,
        combineTargetFor: null,
        // not relevant,
        shouldAnimateDisplacement: false,
      };
    }

    return null;
  };

  const notDraggingSelector = (state: State, ownProps: OwnProps): ?MapProps => {
    // Dragging
    if (state.isDragging) {
      // we do not care about the dragging item
      if (state.critical.draggable.id === ownProps.draggableId) {
        return null;
      }

      return getSecondaryMovement(
        ownProps.draggableId,
        state.critical.draggable.id,
        state.impact,
      );
    }

    // Dropping
    if (state.phase === 'DROP_ANIMATING') {
      // do nothing if this was the dragging item
      if (state.pending.result.draggableId === ownProps.draggableId) {
        return null;
      }
      return getSecondaryMovement(
        ownProps.draggableId,
        state.pending.result.draggableId,
        state.pending.impact,
      );
    }

    // Otherwise
    return null;
  };

  const selector = (state: State, ownProps: OwnProps): MapProps =>
    draggingSelector(state, ownProps) ||
    notDraggingSelector(state, ownProps) ||
    defaultMapProps;

  return selector;
};

const mapDispatchToProps: DispatchProps = {
  lift: liftAction,
  move: moveAction,
  moveUp: moveUpAction,
  moveDown: moveDownAction,
  moveLeft: moveLeftAction,
  moveRight: moveRightAction,
  moveByWindowScroll: moveByWindowScrollAction,
  drop: dropAction,
  dropAnimationFinished: dropAnimationFinishedAction,
};

// Leaning heavily on the default shallow equality checking
// that `connect` provides.
// It avoids needing to do it own within `Draggable`
const ConnectedDraggable: OwnProps => Node = (connect(
  // returning a function so each component can do its own memoization
  makeMapStateToProps,
  (mapDispatchToProps: any),
  // mergeProps: use default
  null,
  // options
  {
    // Using our own store key.
    // This allows consumers to also use redux
    // Note: the default store key is 'store'
    storeKey,
    // Default value, but being really clear
    pure: true,
    // When pure, compares the result of mapStateToProps to its previous value.
    // Default value: shallowEqual
    // Switching to a strictEqual as we return a memoized object on changes
    areStatePropsEqual: isStrictEqual,
  },
): any)(Draggable);

ConnectedDraggable.defaultProps = ({
  isDragDisabled: false,
  // cannot drag interactive elements by default
  disableInteractiveElementBlocking: false,
}: DefaultProps);

export default ConnectedDraggable;
