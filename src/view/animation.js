// @flow
import type { Position } from 'css-box-model';
import type { DropReason } from '../types';
import { distance, isEqual, origin } from '../state/position';

type GetDropDurationArgs = {|
  current: Position,
  destination: Position,
  reason: DropReason,
|};

// For debug
// const min: number = 5;
// const max: number = 10;

const drop = (() => {
  const min: number = 0.33;
  const max: number = 0.55;

  return {
    min,
    max,
    range: max - min,
    maxAtDistance: 1500,
  };
})();

// will bring a time lower - which makes it faster
const faster: number = 0.6;

export const getDropDuration = ({
  current,
  destination,
  reason,
}: GetDropDurationArgs): number => {
  if (isEqual(current, destination)) {
    return 0;
  }

  const value: number = distance(current, destination);

  if (value === 0) {
    return drop.min;
  }

  if (value >= drop.maxAtDistance) {
    return drop.max;
  }

  // * range from:
  // 0px = 0.33s
  // 1500px and over = 0.55s
  // * If reason === 'CANCEL' then speeding up the animation by 30%
  // * round to 2 decimal points

  const percentage: number = value / drop.maxAtDistance;
  const duration: number = drop.min + drop.range * percentage;

  const withDuration: number =
    reason === 'CANCEL' ? duration * faster : duration;
  // To two decimal points by converting to string and back
  return Number(withDuration.toFixed(2));
};

const durations = {
  slide: 0.2,
};

const curves = {
  outOfTheWay: 'cubic-bezier(0.2, 0, 0, 1)',
  drop: 'cubic-bezier(.2,1,.1,1)',
};

// TODO
export const scale = {
  dropOntoGroupTarget: 0.75,
  groupTarget: 1.04,
};

export const opacity = {
  isCombiningWith: 0.7,
};

export const transitions = {
  opacity: `opacity ${durations.slide}s ${curves.outOfTheWay}`,
  snapTo: `transform ${durations.slide}s ${curves.drop}`,
  outOfTheWay: `transform ${durations.slide}s ${curves.outOfTheWay}`,
  isDropping: (duration: number): string =>
    `transform ${duration}s ${curves.drop}, opacity ${duration}s ${
      curves.outOfTheWay
    }`,
};
