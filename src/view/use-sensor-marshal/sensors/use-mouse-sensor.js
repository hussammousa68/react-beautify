// @flow
import invariant from 'tiny-invariant';
import { useEffect, useRef } from 'react';
import { useCallback, useMemo } from 'use-memo-one';
import type { Position } from 'css-box-model';
import type { MovementCallbacks } from '../sensor-types';
import type { EventBinding, EventOptions } from './util/event-types';
import bindEvents from './util/bind-events';
import isSloppyClickThresholdExceeded from './util/is-sloppy-click-threshold-exceeded';
import * as keyCodes from '../../key-codes';
import preventStandardKeyEvents from './util/prevent-standard-key-events';
import supportedPageVisibilityEventName from './util/supported-page-visibility-event-name';
import { warning } from '../../../dev-warning';

// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
const primaryButton: number = 0;
function noop() {}

type MouseForceChangedEvent = MouseEvent & {
  webkitForce?: number,
};

type Idle = {|
  type: 'IDLE',
|};

type Pending = {|
  type: 'PENDING',
  point: Position,
  callbacks: MovementCallbacks,
|};

type Dragging = {|
  type: 'DRAGGING',
  callbacks: MovementCallbacks,
|};

type Phase = Idle | Pending | Dragging;

const idle: Idle = { type: 'IDLE' };

function getCaptureBindings(
  stop: () => void,
  cancel: () => void,
  getPhase: () => Phase,
  setPhase: (phase: Phase) => void,
): EventBinding[] {
  return [
    {
      eventName: 'mousemove',
      fn: (event: MouseEvent) => {
        const { button, clientX, clientY } = event;
        if (button !== primaryButton) {
          return;
        }

        const point: Position = {
          x: clientX,
          y: clientY,
        };

        const phase: Phase = getPhase();

        // Already dragging
        if (phase.type === 'DRAGGING') {
          // preventing default as we are using this event
          event.preventDefault();
          phase.callbacks.onMove(point);
          return;
        }

        // There should be a pending drag at this point
        invariant(phase.type === 'PENDING', 'Cannot be IDLE');
        const pending: Position = phase.point;

        // threshold not yet exceeded
        if (!isSloppyClickThresholdExceeded(pending, point)) {
          return;
        }

        // preventing default as we are using this event
        event.preventDefault();

        setPhase({
          type: 'DRAGGING',
          callbacks: phase.callbacks,
        });

        phase.callbacks.onLift({
          clientSelection: pending,
          mode: 'FLUID',
        });
      },
    },
    {
      eventName: 'mouseup',
      fn: (event: MouseEvent) => {
        const phase: Phase = getPhase();

        if (phase.type === 'DRAGGING') {
          // preventing default as we are using this event
          event.preventDefault();
          phase.callbacks.onDrop({ shouldBlockNextClick: true });
        }

        stop();
      },
    },
    {
      eventName: 'mousedown',
      fn: (event: MouseEvent) => {
        // this can happen during a drag when the user clicks a button
        // other than the primary mouse button
        if (getPhase().type === 'DRAGGING') {
          event.preventDefault();
        }

        cancel();
      },
    },
    {
      eventName: 'keydown',
      fn: (event: KeyboardEvent) => {
        const phase: Phase = getPhase();
        // Abort if any keystrokes while a drag is pending
        if (phase.type === 'PENDING') {
          stop();
          return;
        }

        // cancelling a drag
        if (event.keyCode === keyCodes.escape) {
          event.preventDefault();
          cancel();
          return;
        }

        preventStandardKeyEvents(event);
      },
    },
    {
      eventName: 'resize',
      fn: cancel,
    },
    {
      eventName: 'scroll',
      // ## Passive: true
      // Eventual consistency is fine because we use position: fixed on the item
      // ## Capture: false
      // Scroll events on elements do not bubble, but they go through the capture phase
      // https://twitter.com/alexandereardon/status/985994224867819520
      // Using capture: false here as we want to avoid intercepting droppable scroll requests
      // TODO: can result in awkward drop position
      options: { passive: true, capture: false },
      fn: (event: UIEvent) => {
        // IE11 fix:
        // Scrollable events still bubble up and are caught by this handler in ie11.
        // We can ignore this event
        if (event.currentTarget !== window) {
          return;
        }

        const phase: Phase = getPhase();
        if (phase.type === 'DRAGGING') {
          phase.callbacks.onWindowScroll();
          return;
        }
        // stop a pending drag
        stop();
      },
    },
    // Need to opt out of dragging if the user is a force press
    // Only for safari which has decided to introduce its own custom way of doing things
    // https://developer.apple.com/library/content/documentation/AppleApplications/Conceptual/SafariJSProgTopics/RespondingtoForceTouchEventsfromJavaScript.html
    {
      eventName: 'webkitmouseforcechanged',
      fn: (event: MouseForceChangedEvent) => {
        if (
          event.webkitForce == null ||
          (MouseEvent: any).WEBKIT_FORCE_AT_FORCE_MOUSE_DOWN == null
        ) {
          warning(
            'handling a mouse force changed event when it is not supported',
          );
          return;
        }

        const forcePressThreshold: number = (MouseEvent: any)
          .WEBKIT_FORCE_AT_FORCE_MOUSE_DOWN;
        const isForcePressing: boolean =
          event.webkitForce >= forcePressThreshold;

        const phase: Phase = getPhase();
        invariant(phase.type !== 'IDLE', 'Unexpected phase');

        // might not be respecting force press
        if (!phase.callbacks.shouldRespectForcePress()) {
          event.preventDefault();
          return;
        }

        if (isForcePressing) {
          // it is considered a indirect cancel so we do not
          // prevent default in any situation.
          cancel();
        }
      },
    },
    // Cancel on page visibility change
    {
      eventName: supportedPageVisibilityEventName,
      fn: cancel,
    },
  ];
}

export default function useMouseSensor(
  tryStartCapturing: (event: Event) => ?MovementCallbacks,
) {
  const phaseRef = useRef<Phase>(idle);
  const unbindWindowEventsRef = useRef<() => void>(noop);

  const startCaptureBinding: EventBinding = useMemo(
    () => ({
      eventName: 'mousedown',
      fn: function onMouseDown(event: MouseEvent) {
        // only starting a drag if dragging with the primary mouse button
        if (event.button !== primaryButton) {
          return;
        }

        // Do not start a drag if any modifier key is pressed
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
          return;
        }

        const callbacks: ?MovementCallbacks = tryStartCapturing(event);

        if (!callbacks) {
          return;
        }

        event.preventDefault();

        const point: Position = {
          x: event.clientX,
          y: event.clientY,
        };

        // unbind this listener
        unbindWindowEventsRef.current();
        // using this function before it is defined as their is a circular usage pattern
        // eslint-disable-next-line no-use-before-define
        startPendingDrag(callbacks, point);
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

      unbindWindowEventsRef.current = bindEvents(
        window,
        [startCaptureBinding],
        options,
      );
    },
    [startCaptureBinding],
  );

  const stop = useCallback(() => {
    const current: Phase = phaseRef.current;
    if (current.type === 'IDLE') {
      return;
    }

    phaseRef.current = idle;
    unbindWindowEventsRef.current();

    listenForCapture();
  }, [listenForCapture]);

  const cancel = useCallback(() => {
    const phase: Phase = phaseRef.current;
    stop();
    if (phase.type === 'DRAGGING') {
      phase.callbacks.onCancel({ shouldBlockNextClick: true });
    }
    if (phase.type === 'PENDING') {
      phase.callbacks.onAbort();
    }
  }, [stop]);

  const bindCapturingEvents = useCallback(
    function bindCapturingEvents() {
      const options = { capture: true, passive: false };
      const bindings: EventBinding[] = getCaptureBindings(
        stop,
        cancel,
        () => phaseRef.current,
        (phase: Phase) => {
          phaseRef.current = phase;
        },
      );

      unbindWindowEventsRef.current = bindEvents(window, bindings, options);
    },
    [cancel, stop],
  );

  const startPendingDrag = useCallback(
    function startPendingDrag(callbacks: MovementCallbacks, point: Position) {
      invariant(
        phaseRef.current.type === 'IDLE',
        'Expected to move from IDLE to PENDING drag',
      );
      phaseRef.current = {
        type: 'PENDING',
        point,
        callbacks,
      };
      bindCapturingEvents();
    },
    [bindCapturingEvents],
  );

  useEffect(() => {
    listenForCapture();

    // kill any pending window events when unmounting
    return () => {
      unbindWindowEventsRef.current();
    };
  }, [listenForCapture]);
}
