// @flow
import React from 'react';
import { render } from '@testing-library/react';
import App from '../../utils/app';
import { isDragging } from '../../utils/helpers';
import { touch } from '../../utils/controls';
import { noop } from '../../../../../src/empty';

jest.useFakeTimers();

it('should cancel a pending drag when unmounted', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(noop);
  const { getByText, unmount } = render(<App />);
  const handle: HTMLElement = getByText('item: 0');

  touch.preLift(handle);

  unmount();

  // finish lift timer
  jest.runOnlyPendingTimers();

  expect(warn).not.toHaveBeenCalled();
  expect(isDragging(handle)).toBe(false);
  warn.mockRestore();
});
