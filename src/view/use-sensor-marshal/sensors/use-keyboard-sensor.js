// @flow
import invariant from 'tiny-invariant';
import { useRef } from 'react';
import { useMemo, useCallback } from 'use-memo-one';
import type { PreDragActions, DragActions } from '../../../types';
import type {
  EventBinding,
  EventOptions,
} from '../../event-bindings/event-types';
import * as keyCodes from '../../key-codes';
import bindEvents from '../../event-bindings/bind-events';
import preventStandardKeyEvents from './util/prevent-standard-key-events';
import supportedPageVisibilityEventName from './util/supported-page-visibility-event-name';
import useLayoutEffect from '../../use-isomorphic-layout-effect';

function noop() {}

type KeyMap = {
  [key: number]: true,
};

const scrollJumpKeys: KeyMap = {
  [keyCodes.pageDown]: true,
  [keyCodes.pageUp]: true,
  [keyCodes.home]: true,
  [keyCodes.end]: true,
};

function getDraggingBindings(
  actions: DragActions,
  stop: () => void,
): EventBinding[] {
  function cancel() {
    stop();
    actions.cancel();
  }

  function drop() {
    stop();
    actions.drop();
  }

  return [
    {
      eventName: 'keydown',
      fn: (event: KeyboardEvent) => {
        if (event.keyCode === keyCodes.escape) {
          event.preventDefault();
          // Needed to stop focus loss :(
          event.stopPropagation();
          cancel();
          return;
        }

        // Dropping
        if (event.keyCode === keyCodes.space) {
          // need to stop parent Draggable's thinking this is a lift
          event.preventDefault();
          drop();
          return;
        }

        // Movement

        if (event.keyCode === keyCodes.arrowDown) {
          event.preventDefault();
          actions.moveDown();
          return;
        }

        if (event.keyCode === keyCodes.arrowUp) {
          event.preventDefault();
          actions.moveUp();
          return;
        }

        if (event.keyCode === keyCodes.arrowRight) {
          event.preventDefault();
          actions.moveRight();
          return;
        }

        if (event.keyCode === keyCodes.arrowLeft) {
          event.preventDefault();
          actions.moveLeft();
          return;
        }

        // preventing scroll jumping at this time
        if (scrollJumpKeys[event.keyCode]) {
          event.preventDefault();
          return;
        }

        preventStandardKeyEvents(event);
      },
    },
    // any mouse actions kills a drag
    {
      eventName: 'mousedown',
      fn: cancel,
    },
    {
      eventName: 'mouseup',
      fn: cancel,
    },
    {
      eventName: 'click',
      fn: cancel,
    },
    {
      eventName: 'touchstart',
      fn: cancel,
    },
    // resizing the browser kills a drag
    {
      eventName: 'resize',
      fn: cancel,
    },
    // kill if the user is using the mouse wheel
    // We are not supporting wheel / trackpad scrolling with keyboard dragging
    {
      eventName: 'wheel',
      fn: cancel,
      // chrome says it is a violation for this to not be passive
      // it is fine for it to be passive as we just cancel as soon as we get
      // any event
      options: { passive: true },
    },
    // Cancel on page visibility change
    {
      eventName: supportedPageVisibilityEventName,
      fn: cancel,
    },
  ];
}

export default function useKeyboardSensor(
  tryStartCapturing: (
    source: Event | Element,
    abort: () => void,
  ) => ?PreDragActions,
) {
  const unbindEventsRef = useRef<() => void>(noop);

  const startCaptureBinding: EventBinding = useMemo(
    () => ({
      eventName: 'keydown',
      fn: function onKeyDown(event: KeyboardEvent) {
        // Event already used
        if (event.defaultPrevented) {
          console.log('unable default prevented');
          return;
        }

        // Need to start drag with a spacebar press
        if (event.keyCode !== keyCodes.space) {
          console.log('wrong code to start');
          return;
        }

        // abort function not defined yet
        // eslint-disable-next-line no-use-before-define
        const preDrag: ?PreDragActions = tryStartCapturing(event, stop);

        // Cannot start capturing at this time
        if (!preDrag) {
          console.log('unable to start');
          return;
        }

        console.log('starting drag');

        // we are consuming the event
        event.preventDefault();
        let isCapturing: boolean = true;

        // There is no pending period for a keyboard drag
        // We can lift immediately
        const actions: DragActions = preDrag.lift({
          mode: 'SNAP',
        });

        // unbind this listener
        unbindEventsRef.current();

        // setup our function to end everything
        function stop() {
          invariant(
            isCapturing,
            'Cannot stop capturing a keyboard drag when not capturing',
          );
          isCapturing = false;

          // unbind dragging bindings
          unbindEventsRef.current();
          // start listening for capture again
          // eslint-disable-next-line no-use-before-define
          listenForCapture();
        }

        // bind dragging listeners
        unbindEventsRef.current = bindEvents(
          window,
          getDraggingBindings(actions, stop),
          { capture: true, passive: false },
        );
      },
    }),
    // not including startPendingDrag as it is not defined initially
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tryStartCapturing],
  );

  const listenForCapture = useCallback(
    function tryStartCapture() {
      const options: EventOptions = {
        passive: false,
        capture: true,
      };

      unbindEventsRef.current = bindEvents(
        window,
        [startCaptureBinding],
        options,
      );
    },
    [startCaptureBinding],
  );

  useLayoutEffect(() => {
    listenForCapture();

    // kill any pending window events when unmounting
    return () => {
      unbindEventsRef.current();
    };
  });
}
