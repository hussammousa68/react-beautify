// @flow
import { getRect, type Rect, type Position } from 'css-box-model';
import type {
  DraggableDimension,
  DroppableDimension,
  Viewport,
  DraggableDimensionMap,
  DisplacementGroups,
  Axis,
} from '../../../../src/types';
import {
  getDroppableDimension,
  getDraggableDimension,
} from '../../../utils/dimension';
import { toDraggableMap } from '../../../../src/state/dimension-structures';
import getLiftEffect from '../../../../src/state/get-lift-effect';
import { createViewport } from '../../../utils/viewport';
import { origin, patch } from '../../../../src/state/position';
import { vertical, horizontal } from '../../../../src/state/axis';
import { offsetByPosition } from '../../../../src/state/spacing';
import { getForcedDisplacement } from '../../../utils/impact';

[vertical, horizontal].forEach((axis: Axis) => {
  it(`should overscan visibility on axis ${axis.direction}`, () => {
    const visibleArea: Rect = getRect({
      top: 0,
      right: 200,
      left: 0,
      bottom: 200,
    });
    const visibleSizeOnAxis: Position = patch(
      axis.line,
      visibleArea[axis.size],
    );

    const viewport: Viewport = createViewport({
      frame: visibleArea,
      scroll: origin,
      scrollHeight: visibleArea.height,
      scrollWidth: visibleArea.width,
    });

    const home: DroppableDimension = getDroppableDimension({
      descriptor: {
        id: 'drop',
        type: 'TYPE',
        mode: 'STANDARD',
      },
      direction: axis.direction,
      borderBox: {
        top: 0,
        left: 0,
        // massive
        right: 10000,
        bottom: 10000,
      },
    });

    const fillVisibleArea: DraggableDimension = getDraggableDimension({
      descriptor: {
        id: 'item-0',
        droppableId: home.descriptor.id,
        type: home.descriptor.type,
        index: 0,
      },
      borderBox: visibleArea,
    });

    const notVisible1: DraggableDimension = getDraggableDimension({
      descriptor: {
        id: 'not-visible-1',
        droppableId: home.descriptor.id,
        type: home.descriptor.type,
        index: 1,
      },
      // totally not visible initially
      // but will be within overscan of dragging item size
      borderBox: offsetByPosition(
        offsetByPosition(visibleArea, visibleSizeOnAxis),
        patch(axis.line, 1),
      ),
    });

    const notVisible2: DraggableDimension = getDraggableDimension({
      descriptor: {
        id: 'not-visible-2',
        droppableId: home.descriptor.id,
        type: home.descriptor.type,
        index: 1,
      },
      // totally not visible initially
      // not within overscan of dragging item size
      borderBox: offsetByPosition(
        notVisible1.client.borderBox,
        visibleSizeOnAxis,
      ),
    });

    const draggables: DraggableDimensionMap = toDraggableMap([
      fillVisibleArea,
      notVisible1,
      notVisible2,
    ]);

    const { impact: homeImpact } = getLiftEffect({
      draggable: fillVisibleArea,
      home,
      draggables,
      viewport,
    });

    const expected: DisplacementGroups = getForcedDisplacement({
      visible: [notVisible1],
      invisible: [notVisible2],
      animation: [false],
    });

    expect(homeImpact.displaced).toEqual(expected);
  });
});
