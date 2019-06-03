// @flow
import invariant from 'tiny-invariant';
import React from 'react';
import { render } from 'react-testing-library';
import type { TryGetLock, Sensor } from '../../../../../src/types';
import App from '../app';

it('should allow different locks in different DragDropContexts', () => {
  let first: TryGetLock;
  let second: TryGetLock;

  const a: Sensor = (tryGetLock: TryGetLock) => {
    first = tryGetLock;
  };
  const b: Sensor = (tryGetLock: TryGetLock) => {
    second = tryGetLock;
  };

  const { getAllByText } = render(
    <React.Fragment>
      <App sensors={[a]} />
      <App sensors={[b]} />
    </React.Fragment>,
  );

  const items: HTMLElement[] = getAllByText('item: 0');
  expect(items).toHaveLength(2);
  const [inFirst, inSecond] = items;
  expect(inFirst).not.toBe(inSecond);

  // each sensor can get a different lock
  invariant(first, 'expected first to be set');
  invariant(second, 'expected second to be set');
  expect(first(inFirst)).toBeTruthy();
  expect(second(inSecond)).toBeTruthy();
});
