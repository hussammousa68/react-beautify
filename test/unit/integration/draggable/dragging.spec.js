// @flow
import React from 'react';
import { render } from '@testing-library/react';
import App, {
  defaultItemRender,
  type RenderItem,
  type Item,
} from '../drag-handle/app';
import {
  type DraggableProvided,
  type DraggableStateSnapshot,
} from '../../../../src';
import { simpleLift, mouse, keyboard } from '../drag-handle/controls';
import { isDragging } from '../drag-handle/util';
import { transitions } from '../../../../src/animation';
import { zIndexOptions } from '../../../../src/view/draggable/get-style';

it('should move to a provided offset', () => {
  const { getByText } = render(<App />);
  const handle: HTMLElement = getByText('item: 0');

  simpleLift(mouse, handle);
  expect(isDragging(handle)).toBe(true);

  // no transform as we are at {x: 0, y: 0}
  expect(handle.style.transform).toBe('');
  expect(handle.style.transition).toBe(transitions.fluid);
  expect(handle.style.zIndex).toBe(`${zIndexOptions.dragging}`);

  mouse.move(handle);

  expect(handle.style.transform).toBe(`translate(0px, 1px)`);
  expect(handle.style.transition).toBe(transitions.fluid);
  expect(handle.style.zIndex).toBe(`${zIndexOptions.dragging}`);
});

it('should pass on the snapshot', () => {
  const capture = jest.fn();
  const items: Item[] = [
    {
      id: '0',
    },
  ];
  const renderItem: RenderItem = jest.fn((item: Item) => {
    const result = defaultItemRender(item);
    return (provided: DraggableProvided, snapshot: DraggableStateSnapshot) => {
      capture(snapshot);
      return result(provided, snapshot);
    };
  });

  expect(capture).toHaveBeenCalledTimes(0);
  const { getByText } = render(<App items={items} renderItem={renderItem} />);
  const handle: HTMLElement = getByText('item: 0');

  expect(capture).toHaveBeenCalledTimes(1);

  simpleLift(mouse, handle);
  expect(isDragging(handle)).toBe(true);
  expect(capture).toHaveBeenCalledTimes(2);

  const snapshot = capture.mock.calls[capture.mock.calls.length - 1][0];

  const expected: DraggableStateSnapshot = {
    isDragging: true,
    isDropAnimating: false,
    dropAnimation: null,
    draggingOver: 'droppable',
    combineWith: null,
    combineTargetFor: null,
    mode: 'FLUID',
  };
  expect(snapshot).toEqual(expected);
});

it('should animate movements when in snap mode', () => {
  const { getByText } = render(<App />);
  const handle: HTMLElement = getByText('item: 0');

  simpleLift(keyboard, handle);

  expect(isDragging(handle)).toBe(true);
  expect(handle.style.transition).toBe(transitions.snap);
});
