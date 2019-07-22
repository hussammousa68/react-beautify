// @flow
import type { Id, DraggableDimension } from '../../../../src/types';
import type {
  Registry,
  DraggableEntry,
} from '../../../../src/state/registry/registry-types';
import createRegistry from '../../../../src/state/registry/create-registry';
import { getPreset } from '../../../utils/dimension';

const preset = getPreset();

function getDraggableEntry(uniqueId: Id, dimension: DraggableDimension) {
  return {
    uniqueId,
    descriptor: dimension.descriptor,
    options: {
      canDragInteractiveElements: true,
      shouldRespectForcePress: false,
      isEnabled: true,
    },
    getDimension: () => dimension,
  };
}

it('should allow registration', () => {
  const registry: Registry = createRegistry();
  const entry: DraggableEntry = getDraggableEntry('1', preset.inHome1);

  registry.draggable.register(entry);

  expect(registry.draggable.findById(entry.descriptor.id)).toBe(entry);
});

it('should allow unregistration', () => {
  const registry: Registry = createRegistry();
  const entry: DraggableEntry = getDraggableEntry('1', preset.inHome1);

  registry.draggable.register(entry);
  registry.draggable.unregister(entry);

  expect(registry.draggable.findById(entry.descriptor.id)).toBe(null);
});

it('should allow for updating existing entries', () => {
  const registry: Registry = createRegistry();
  const initial: DraggableEntry = getDraggableEntry('1', preset.inHome1);
  const updated: DraggableEntry = {
    uniqueId: initial.uniqueId,
    descriptor: preset.inHome1.descriptor,
    options: {
      canDragInteractiveElements: true,
      // updated
      shouldRespectForcePress: true,
      isEnabled: true,
    },
    getDimension: () => preset.inHome1,
  };

  registry.draggable.register(initial);
  registry.draggable.update(updated, initial);

  expect(registry.draggable.findById(updated.descriptor.id)).toBe(updated);
});

it('should throw away updates if the uniqueId is outdated', () => {
  const registry: Registry = createRegistry();
  const initial: DraggableEntry = getDraggableEntry('1', preset.inHome1);
  const updated: DraggableEntry = {
    // new uniqueId
    uniqueId: '2',
    descriptor: preset.inHome1.descriptor,
    options: {
      canDragInteractiveElements: true,
      // updated
      shouldRespectForcePress: true,
      isEnabled: true,
    },
    getDimension: () => preset.inHome1,
  };

  registry.draggable.register(initial);
  registry.draggable.update(updated, initial);

  expect(registry.draggable.findById(updated.descriptor.id)).toBe(initial);
});

it('should allow for entry overwriting', () => {
  const registry: Registry = createRegistry();
  const entry1: DraggableEntry = getDraggableEntry('1', preset.inHome1);
  const entry2: DraggableEntry = getDraggableEntry('1', preset.inHome1);

  registry.draggable.register(entry1);
  registry.draggable.register(entry2);

  // overwritten entry 2
  expect(registry.draggable.findById(entry1.descriptor.id)).toBe(entry2);
});

it('should not unregister with an outdated uniqueId', () => {
  const registry: Registry = createRegistry();
  const entry1: DraggableEntry = getDraggableEntry('1', preset.inHome1);
  const entry2: DraggableEntry = getDraggableEntry('2', preset.inHome1);

  registry.draggable.register(entry1);
  registry.draggable.register(entry2);

  // overwritten entry 1

  expect(registry.draggable.findById(entry1.descriptor.id)).toBe(entry2);

  // entry 1 is now outdated, so this won't be removed
  registry.draggable.unregister(entry1);
  expect(registry.draggable.findById(entry1.descriptor.id)).toBe(entry2);
});
