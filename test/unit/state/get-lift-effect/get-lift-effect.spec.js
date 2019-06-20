// @flow
import type {
  DisplacedBy,
  DraggableDimension,
  DragImpact,
  DraggableId,
  DraggableIdMap,
  LiftEffect,
  DisplacementMap,
} from '../../../../src/types';
import getLiftEffect from '../../../../src/state/get-lift-effect';
import { getPreset } from '../../../utils/dimension';
import getDisplacedBy from '../../../../src/state/get-displaced-by';
import getHomeLocation from '../../../../src/state/get-home-location';

const preset = getPreset();

// TODO: pull out into helper file
function getDraggableIds(draggables: DraggableDimension[]): DraggableId[] {
  return draggables.map(d => d.descriptor.id);
}

function getDraggableIdMap(ids: DraggableId[]): DraggableIdMap {
  return ids.reduce((map: DraggableIdMap, id: DraggableId) => {
    map[id] = true;
    return map;
  }, {});
}

function getDisplacementMap(ids: DraggableId[]): DisplacementMap {
  return ids.reduce((map: DisplacementMap, id: DraggableId) => {
    map[id] = {
      draggableId: id,
      shouldAnimate: false,
    };
    return map;
  }, {});
}

it('should mark everything after the critical ', () => {
  const { impact, afterCritical } = getLiftEffect({
    draggable: preset.inHome2,
    home: preset.home,
    draggables: preset.draggables,
    viewport: preset.viewport,
  });

  // originally displacement
  const displacedBy: DisplacedBy = getDisplacedBy(
    preset.home.axis,
    preset.inHome2.displaceBy,
  );

  // ordered by closest impacted
  const all: DraggableId[] = getDraggableIds([preset.inHome3, preset.inHome4]);

  {
    const expected: LiftEffect = {
      inVirtualList: false,
      effected: getDraggableIdMap(all),
      displacedBy,
    };
    expect(afterCritical).toEqual(expected);
  }
  {
    const expected: DragImpact = {
      displaced: {
        visible: getDisplacementMap(all),
        all,
        invisible: {},
      },
      displacedBy,
      at: {
        type: 'REORDER',
        destination: getHomeLocation(preset.inHome2.descriptor),
      },
    };
    expect(impact).toEqual(expected);
  }
});
