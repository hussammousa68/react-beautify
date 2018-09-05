// @flow
import { type Position } from 'css-box-model';
import { type Node } from 'react';
import type {
  DraggableId,
  DroppableId,
  DraggableDimension,
  ZIndex,
  State,
  DropReason,
} from '../../types';
import {
  lift,
  move,
  moveByWindowScroll,
  moveUp,
  moveDown,
  moveRight,
  moveLeft,
  drop,
  dropAnimationFinished,
} from '../../state/action-creators';
import type { DragHandleProps } from '../drag-handle/drag-handle-types';

export type DraggingStyle = {|
  position: 'fixed',
  top: number,
  left: number,
  boxSizing: 'border-box',
  width: number,
  height: number,
  transition: string, // 'none' or: drop animation and optional group into fade out
  transform: ?string,
  // we animate the opacity down to 0 when dropping while grouping
  opacity: ?number,
  zIndex: ZIndex,

  // Avoiding any processing of mouse events.
  // This is already applied by the shared styles during a drag.
  // During a drop it prevents a draggable from being dragged.
  // canStartDrag() will prevent drags in some cases for non primary draggable.
  // It is also a minor performance optimisation
  pointerEvents: 'none',
|};

export type NotDraggingStyle = {|
  transform: ?string,
  // null: use the global animation style
  // none: skip animation (used in certain displacement situations)
  transition: null | 'none',
|};

export type DraggableStyle = DraggingStyle | NotDraggingStyle;

export type ZIndexOptions = {|
  dragging: number,
  dropAnimating: number,
|};

// Props that can be spread onto the element directly
export type DraggableProps = {|
  // inline style
  style: ?DraggableStyle,
  // used for shared global styles
  'data-react-beautiful-dnd-draggable': string,
  // used to know when a transition ends
  onTransitionEnd: ?() => mixed,
|};

export type Provided = {|
  draggableProps: DraggableProps,
  // will be null if the draggable is disabled
  dragHandleProps: ?DragHandleProps,
  // The following props will be removed once we move to react 16
  innerRef: (?HTMLElement) => void,
|};

export type DroppingState = {|
  reason: DropReason,
  duration: number,
|};

export type StateSnapshot = {|
  isDragging: boolean,
  dropping: ?DroppingState,
  draggingOver: ?DroppableId,
  combineWith: ?DraggableId,
  combineTargetFor: ?DraggableId,
|};

export type DispatchProps = {|
  lift: typeof lift,
  move: typeof move,
  moveByWindowScroll: typeof moveByWindowScroll,
  moveUp: typeof moveUp,
  moveDown: typeof moveDown,
  moveRight: typeof moveRight,
  moveLeft: typeof moveLeft,
  drop: typeof drop,
  dropAnimationFinished: typeof dropAnimationFinished,
|};

export type MapProps = {|
  isDragging: boolean,
  // whether or not a drag movement should be animated
  // used for dropping and keyboard dragging
  shouldAnimateDragMovement: boolean,
  // when an item is being displaced by a dragging item,
  // we need to know if that movement should be animated
  shouldAnimateDisplacement: boolean,
  dropping: ?DroppingState,
  offset: Position,
  // only provided when dragging
  dimension: ?DraggableDimension,
  draggingOver: ?DroppableId,
  combineWith: ?DraggableId,
  combineTargetFor: ?DraggableId,
|};

export type OwnProps = {|
  draggableId: DraggableId,
  index: number,
  children: (Provided, StateSnapshot) => ?Node,
  isDragDisabled: boolean,
  disableInteractiveElementBlocking: boolean,
|};

export type DefaultProps = {|
  isDragDisabled: boolean,
  disableInteractiveElementBlocking: boolean,
|};

export type Props = {|
  ...MapProps,
  ...DispatchProps,
  ...OwnProps,
|};

export type Selector = (state: State, ownProps: OwnProps) => MapProps;
