// @flow
import invariant from 'tiny-invariant';
import {
  offset,
  withScroll,
  type Position,
  type BoxModel,
} from 'css-box-model';
import { add } from '../position';
import { toDroppableMap } from '../dimension-structures';
import type {
  Published,
  Viewport,
  DraggableDimension,
  DroppableDimension,
  Scrollable,
  DroppableDimensionMap,
  DroppableId,
} from '../../types';

type Args = {|
  published: Published,
  viewport: Viewport,
|};

export default ({ published, viewport }: Args): Published => {
  // We need to adjust collected draggables so that they
  // match the model we had when the drag started.
  // When a draggable is dynamically collected it does not have
  // the same relative client position. We need to unwind
  // any changes in window scroll and droppable scroll so that
  // the newly collected draggables fit in with our other draggables
  // and give the same dimensions that would have had if they were
  // collected at the start of the drag.

  // Need to undo the displacement caused by window scroll changes
  const windowScrollChange: Position = viewport.scroll.diff.value;
  const modifiedMap: DroppableDimensionMap = toDroppableMap(published.modified);

  const shifted: DraggableDimension[] = published.additions.map(
    (draggable: DraggableDimension): DraggableDimension => {
      const droppableId: DroppableId = draggable.descriptor.droppableId;
      const modified: DroppableDimension = modifiedMap[droppableId];
      const closest: ?Scrollable = modified.viewport.closestScrollable;

      invariant(closest);

      const droppableScrollChange: Position = closest.scroll.diff.value;

      const totalChange: Position = add(
        windowScrollChange,
        droppableScrollChange,
      );
      const client: BoxModel = offset(draggable.client, totalChange);
      const page: BoxModel = withScroll(client, viewport.scroll.initial);

      const moved: DraggableDimension = {
        ...draggable,
        placeholder: {
          ...draggable.placeholder,
          client,
        },
        client,
        page,
      };

      return moved;
    },
  );

  const updated: Published = {
    ...published,
    additions: shifted,
  };

  return updated;
};
