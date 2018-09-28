// @flow
import { offset, type Position, type BoxModel } from 'css-box-model';
import { vertical, horizontal } from '../../../../../src/state/axis';
import { getPreset } from '../../../../utils/dimension';
import type {
  Axis,
  DisplacedBy,
  Displacement,
  DragImpact,
  DraggableDimension,
} from '../../../../../src/types';
import getOffsetFromStart from '../../../../../src/state/middleware/drop/get-new-home-client-offset';
import noImpact from '../../../../../src/state/no-impact';
import getHomeImpact from '../../../../../src/state/get-home-impact';
import { origin, subtract } from '../../../../../src/state/position';
import getDisplacedBy from '../../../../../src/state/get-displaced-by';
import getDisplacementMap from '../../../../../src/state/get-displacement-map';
import { goAfter, goBefore } from '../../../../../src/state/move-relative-to';

const getDisplacement = (draggable: DraggableDimension): Displacement => ({
  isVisible: true,
  shouldAnimate: true,
  draggableId: draggable.descriptor.id,
});

[vertical, horizontal].forEach((axis: Axis) => {
  describe(`dropping on ${axis.direction} list`, () => {
    const preset = getPreset(axis);

    it('should return home position when not over anything', () => {
      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact: noImpact,
        draggable: preset.inHome1,
        dimensions: preset.dimensions,
        viewport: preset.viewport,
      });

      expect(result).toEqual(origin);
    });

    it('should return home position over home location', () => {
      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact: getHomeImpact(preset.inHome1, preset.home),
        draggable: preset.inHome1,
        dimensions: preset.dimensions,
        viewport: preset.viewport,
      });

      expect(result).toEqual(origin);
    });

    it('should drop in front of the closest backwards displaced item', () => {
      // inHome1 moving forward past inHome2 and inHome3
      const willDisplaceForward: boolean = false;
      // ordered by closest impacted
      const displaced: Displacement[] = [
        getDisplacement(preset.inHome3),
        getDisplacement(preset.inHome2),
      ];
      const displacedBy: DisplacedBy = getDisplacedBy(
        axis,
        preset.inHome1.displaceBy,
        willDisplaceForward,
      );
      const impact: DragImpact = {
        movement: {
          displaced,
          map: getDisplacementMap(displaced),
          willDisplaceForward,
          displacedBy,
        },
        direction: axis.direction,
        destination: {
          index: preset.inHome3.descriptor.index,
          droppableId: preset.home.descriptor.id,
        },
        merge: null,
      };

      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact,
        draggable: preset.inHome1,
        dimensions: preset.dimensions,
        viewport: preset.viewport,
      });

      const displacedInHome3: BoxModel = offset(
        preset.inHome3.client,
        displacedBy.point,
      );
      const expectedCenter: Position = goAfter({
        axis,
        moveRelativeTo: displacedInHome3,
        isMoving: preset.inHome1.client,
      });
      const original: Position = preset.inHome1.client.borderBox.center;
      const expectedOffset: Position = subtract(expectedCenter, original);
      expect(result).toEqual(expectedOffset);
    });

    it('should drop in behind of the closest forwards displaced item', () => {
      // inHome3 moving backward past inHome1 and inHome2
      const willDisplaceForward: boolean = true;
      // ordered by closest impacted
      const displaced: Displacement[] = [
        getDisplacement(preset.inHome1),
        getDisplacement(preset.inHome2),
      ];
      const displacedBy: DisplacedBy = getDisplacedBy(
        axis,
        preset.inHome3.displaceBy,
        willDisplaceForward,
      );
      const impact: DragImpact = {
        movement: {
          displaced,
          map: getDisplacementMap(displaced),
          willDisplaceForward,
          displacedBy,
        },
        direction: axis.direction,
        // moving into the first position
        destination: {
          index: 0,
          droppableId: preset.home.descriptor.id,
        },
        merge: null,
      };

      const result: Position = getOffsetFromStart({
        reason: 'DROP',
        impact,
        draggable: preset.inHome3,
        dimensions: preset.dimensions,
        viewport: preset.viewport,
      });

      const displacedInHome1: BoxModel = offset(
        preset.inHome1.client,
        displacedBy.point,
      );
      const expectedCenter: Position = goBefore({
        axis,
        moveRelativeTo: displacedInHome1,
        isMoving: preset.inHome3.client,
      });
      const original: Position = preset.inHome3.client.borderBox.center;
      const expectedOffset: Position = subtract(expectedCenter, original);
      expect(result).toEqual(expectedOffset);
    });

    it('should drop after the last item in a list if nothing is displaced', () => {});

    it('should drop into the center of an item that is being combined with', () => {});

    it('should drop into the center of a displaced combined item', () => {});

    it('should account for the scroll of the droppable you are over when reordering', () => {});

    it('should account for the scroll of the droppable you are over when combining', () => {});

    it('should account for the scroll of your home list if you are not over any list', () => {});

    it('should account for any changes in the window scroll', () => {});
  });
});
