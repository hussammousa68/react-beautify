// @flow
import React from 'react';
import { createEvent, fireEvent, render } from 'react-testing-library';
import * as keyCodes from '../../../../../src/view/key-codes';
import { sloppyClickThreshold } from '../../../../../src/view/use-sensor-marshal/sensors/util/is-sloppy-click-threshold-exceeded';
import App from '../app';
import { isDragging } from '../util';
import { simpleLift } from './util';

it('should not prevent a subsequent click if aborting during a pending drag', () => {
  const { getByText } = render(<App />);
  const handle: HTMLElement = getByText('item: 0');

  fireEvent.mouseDown(handle);

  // abort
  fireEvent.keyDown(handle, { keyCode: keyCodes.escape });

  // would normally start
  fireEvent.mouseMove(handle, {
    clientX: 0,
    clientY: sloppyClickThreshold,
  });

  // drag not started
  expect(isDragging(handle)).toBe(false);

  const click: Event = createEvent.click(handle);
  fireEvent(handle, click);

  expect(click.defaultPrevented).toBe(false);
});

it('should prevent a subsequent click if cancelling a drag', () => {
  const { getByText } = render(<App />);
  const handle: HTMLElement = getByText('item: 0');

  simpleLift(handle);
  expect(isDragging(handle)).toBe(true);

  // cancel
  fireEvent.keyDown(handle, { keyCode: keyCodes.escape });

  // click event prevented
  const click: Event = createEvent.click(handle);
  fireEvent(handle, click);
  expect(click.defaultPrevented).toBe(true);
});

it('should prevent a subsequent click if dropping a drag', () => {
  const { getByText } = render(<App />);
  const handle: HTMLElement = getByText('item: 0');

  simpleLift(handle);
  expect(isDragging(handle)).toBe(true);

  // cancel
  fireEvent.mouseUp(handle);

  // click event prevented
  const click: Event = createEvent.click(handle);
  fireEvent(handle, click);
  expect(click.defaultPrevented).toBe(true);
});
