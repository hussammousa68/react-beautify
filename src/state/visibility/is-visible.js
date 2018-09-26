// @flow
import { type Position, type Spacing, type Rect } from 'css-box-model';
import isPartiallyVisibleThroughFrame from './is-partially-visible-through-frame';
import isTotallyVisibleThroughFrame from './is-totally-visible-through-frame';
import isTotallyVisibleThroughFrameOnAxis from './is-totally-visible-through-frame-on-axis';
import { offsetByPosition } from '../spacing';
import { origin } from '../position';
import type { DroppableDimension } from '../../types';

export type Args = {|
  target: Spacing,
  destination: DroppableDimension,
  viewport: Rect,
  withDroppableDisplacement: boolean,
|};

type HelperArgs = {|
  ...Args,
  isVisibleThroughFrameFn: (frame: Spacing) => (subject: Spacing) => boolean,
|};

const getDroppableDisplaced = (
  target: Spacing,
  destination: DroppableDimension,
) => {
  const displacement: Position = destination.frame
    ? destination.frame.scroll.diff.displacement
    : origin;

  return offsetByPosition(target, displacement);
};

const isVisible = ({
  target,
  destination,
  viewport,
  withDroppableDisplacement,
  isVisibleThroughFrameFn,
}: HelperArgs): boolean => {
  const withDisplacement = withDroppableDisplacement
    ? getDroppableDisplaced(target, destination)
    : target;

  // destination subject is totally hidden by frame
  // this should never happen - but just guarding against it
  if (!destination.subject.active) {
    return false;
  }

  // When considering if the target is visible in the droppable we need
  // to consider the change in scroll of the droppable. We need to
  // adjust for the scroll as the clipped viewport takes into account
  // the scroll of the droppable.
  const isVisibleInDroppable: boolean = isVisibleThroughFrameFn(
    destination.subject.active,
  )(withDisplacement);

  if (!isVisibleInDroppable) {
    return false;
  }

  // We also need to consider whether the destination scroll when detecting
  // if we are visible in the viewport.
  const isVisibleInViewport: boolean = isVisibleThroughFrameFn(viewport)(
    withDisplacement,
  );

  return isVisibleInViewport;
};

export const isPartiallyVisible = (args: Args): boolean =>
  isVisible({
    ...args,
    isVisibleThroughFrameFn: isPartiallyVisibleThroughFrame,
  });

export const isTotallyVisible = (args: Args): boolean =>
  isVisible({
    ...args,
    isVisibleThroughFrameFn: isTotallyVisibleThroughFrame,
  });

export const isTotallyVisibleOnAxis = (args: Args): boolean =>
  isVisible({
    ...args,
    isVisibleThroughFrameFn: isTotallyVisibleThroughFrameOnAxis(
      args.destination.axis,
    ),
  });
