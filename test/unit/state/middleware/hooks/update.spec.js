// @flow
import invariant from 'tiny-invariant';
import {
  initialPublish,
  move,
  moveDown,
  type MoveArgs,
} from '../../../../../src/state/action-creators';
import middleware from '../../../../../src/state/middleware/hooks';
import { add } from '../../../../../src/state/position';
import {
  getDragStart,
  initialPublishArgs,
} from '../../../../utils/preset-action-args';
import createStore from '../util/create-store';
import getAnnounce from './util/get-announce-stub';
import createHooks from './util/get-hooks-stub';
import type { Hooks, State, DragUpdate } from '../../../../../src/types';
import type { Store, Dispatch } from '../../../../../src/state/store-types';

const start = (dispatch: Dispatch) => {
  dispatch(initialPublish(initialPublishArgs));
  requestAnimationFrame.step();
};

it('should call onDragUpdate if the position has changed on move', () => {
  const hooks: Hooks = createHooks();
  const store: Store = createStore(middleware(() => hooks, getAnnounce()));

  start(store.dispatch);
  expect(hooks.onDragStart).toHaveBeenCalledTimes(1);
  expect(hooks.onDragUpdate).not.toHaveBeenCalled();

  // Okay let's move it
  store.dispatch(moveDown());
  const update: DragUpdate = {
    ...getDragStart(),
    combine: null,
    destination: {
      droppableId: initialPublishArgs.critical.droppable.id,
      index: initialPublishArgs.critical.draggable.index + 1,
    },
  };
  expect(hooks.onDragUpdate).toHaveBeenCalledWith(update, expect.any(Object));
});

it('should not call onDragUpdate if there is no movement from the last update', () => {
  const hooks: Hooks = createHooks();
  const store: Store = createStore(middleware(() => hooks, getAnnounce()));

  start(store.dispatch);
  expect(hooks.onDragStart).toHaveBeenCalledTimes(1);
  expect(hooks.onDragUpdate).not.toHaveBeenCalled();

  // A movement to the same index is not causing an update
  const moveArgs: MoveArgs = {
    // tiny change
    client: add(initialPublishArgs.client.selection, { x: 1, y: 1 }),
    shouldAnimate: true,
  };
  store.dispatch(move(moveArgs));

  expect(hooks.onDragUpdate).not.toHaveBeenCalled();

  // Triggering an actual movement
  store.dispatch(moveDown());
  expect(hooks.onDragUpdate).toHaveBeenCalledTimes(1);

  const state: State = store.getState();
  invariant(
    state.phase === 'DRAGGING',
    'Expecting state to be in dragging phase',
  );

  // A small movement that should not trigger any index changes
  store.dispatch(
    move({
      client: add(state.current.client.selection, { x: -1, y: -1 }),
      shouldAnimate: true,
    }),
  );

  expect(hooks.onDragUpdate).toHaveBeenCalledTimes(1);
});
