// @flow
import { useLayoutEffect, useRef, useMemo, useState, useCallback } from 'react';
import invariant from 'tiny-invariant';
import type { Args, DragHandleProps } from './drag-handle-types';
import getWindowFromEl from '../window/get-window-from-el';
import useRequiredContext from '../use-required-context';
import AppContext, { type AppContextValue } from '../context/app-context';
import focusRetainer from './util/focus-retainer';
import useMouseSensor, {
  type Args as MouseSensorArgs,
} from './sensor/use-mouse-sensor';
import shouldAllowDraggingFromTarget from './util/should-allow-dragging-from-target';
import getDragHandleRef from './util/get-drag-handle-ref';
import useKeyboardSensor, {
  type Args as KeyboardSensorArgs,
} from './sensor/use-keyboard-sensor';
import useTouchSensor, {
  type Args as TouchSensorArgs,
} from './sensor/use-touch-sensor';

function preventHtml5Dnd(event: DragEvent) {
  event.preventDefault();
}

export default function useDragHandle(args: Args): DragHandleProps {
  // Capturing
  const isAnythingCapturingRef = useRef<boolean>(false);
  const [shouldAbortCapture, setShouldAbortCapture] = useState<boolean>(false);
  const recordCapture = useCallback((isCapturingList: boolean[]) => {
    isAnythingCapturingRef.current = isCapturingList.some(
      (isCapturing: boolean) => isCapturing,
    );
  }, []);

  const { canLift, style: styleContext }: AppContextValue = useRequiredContext(
    AppContext,
  );
  const {
    isDragging,
    isDropAnimating,
    isEnabled,
    draggableId,
    callbacks,
    getDraggableRef,
    getShouldRespectForceTouch,
    canDragInteractiveElements,
  } = args;

  const getWindow = useCallback(
    (): HTMLElement => getWindowFromEl(getDraggableRef()),
    [getDraggableRef],
  );

  const isFocusedRef = useRef<boolean>(false);
  const onFocus = useCallback(() => {
    isFocusedRef.current = true;
  }, []);
  const onBlur = useCallback(() => {
    isFocusedRef.current = false;
  }, []);

  const canStartCapturing = useCallback(
    (event: Event) => {
      // Something on this element might be capturing but a drag has not started yet
      // We want to prevent anything else from capturing
      if (isAnythingCapturingRef.current) {
        return false;
      }
      // Do not drag if anything else in the system is dragging
      if (!canLift(draggableId)) {
        return false;
      }

      // Check if we are dragging an interactive element
      return shouldAllowDraggingFromTarget(event, canDragInteractiveElements);
    },
    [canDragInteractiveElements, canLift, draggableId],
  );

  const mouseArgs: MouseSensorArgs = useMemo(
    () => ({
      callbacks,
      getDraggableRef,
      getWindow,
      canStartCapturing,
      getShouldRespectForceTouch,
      shouldAbortCapture,
    }),
    [
      shouldAbortCapture,
      callbacks,
      canStartCapturing,
      getDraggableRef,
      getShouldRespectForceTouch,
      getWindow,
    ],
  );
  const { isCapturing: isMouseCapturing, onMouseDown } = useMouseSensor(
    mouseArgs,
  );

  const keyboardArgs: KeyboardSensorArgs = useMemo(
    () => ({
      callbacks,
      getDraggableRef,
      getWindow,
      canStartCapturing,
      shouldAbortCapture,
    }),
    [
      callbacks,
      canStartCapturing,
      getDraggableRef,
      getWindow,
      shouldAbortCapture,
    ],
  );
  const { isCapturing: isKeyboardCapturing, onKeyDown } = useKeyboardSensor(
    keyboardArgs,
  );
  const touchArgs: TouchSensorArgs = useMemo(
    () => ({
      callbacks,
      getDraggableRef,
      getWindow,
      canStartCapturing,
      getShouldRespectForceTouch,
      shouldAbortCapture,
    }),
    [
      shouldAbortCapture,
      callbacks,
      canStartCapturing,
      getDraggableRef,
      getShouldRespectForceTouch,
      getWindow,
    ],
  );
  const { isCapturing: isTouchCapturing, onTouchStart } = useTouchSensor(
    touchArgs,
  );
  recordCapture([isMouseCapturing, isKeyboardCapturing, isTouchCapturing]);

  // mounting focus retention
  useLayoutEffect(() => {});

  // handle aborting
  useLayoutEffect(() => {
    // No longer dragging but still capturing: need to abort
    if (!isDragging && isAnythingCapturingRef.current) {
      setShouldAbortCapture(true);
    }
  }, [isDragging]);

  // handle is being disabled
  useLayoutEffect(() => {
    // No longer enabled but still capturing: need to abort
    if (!isEnabled && isAnythingCapturingRef.current) {
      setShouldAbortCapture(true);
    }
  }, [isEnabled]);

  // flip the abort capture flag back to true after use
  useLayoutEffect(() => {
    if (shouldAbortCapture) {
      setShouldAbortCapture(false);
    }
  }, [shouldAbortCapture]);

  const props: DragHandleProps = useMemo(
    () => ({
      onMouseDown,
      onKeyDown,
      onTouchStart,
      onFocus,
      onBlur,
      tabIndex: 0,
      'data-react-beautiful-dnd-drag-handle': styleContext,
      // English default. Consumers are welcome to add their own start instruction
      'aria-roledescription': 'Draggable item. Press space bar to lift',
      // Opting out of html5 drag and drops
      draggable: false,
      onDragStart: preventHtml5Dnd,
    }),
    [onBlur, onFocus, onKeyDown, onMouseDown, onTouchStart, styleContext],
  );

  return props;
}
