import type { ReactNode } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export function SortableList<T>({ items, getId, onReorder, render, disabled }: {
  items: T[]; getId: (t: T) => string; onReorder: (ids: string[]) => void; render: (t: T) => ReactNode; disabled?: boolean;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = items.map(getId);
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        <ul className="space-y-2">{items.map((it) => <Row key={getId(it)} id={getId(it)} disabled={disabled}>{render(it)}</Row>)}</ul>
      </SortableContext>
    </DndContext>
  );
}

function Row({ id, children, disabled }: { id: string; children: ReactNode; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-2 rounded-lg border border-line bg-carbon p-2 ${isDragging ? "z-10 opacity-80 shadow-xl" : ""}`}>
      {!disabled && <button type="button" className="cursor-grab touch-none p-1 text-ash hover:text-chrome" aria-label="Drag to reorder" {...attributes} {...listeners}><GripVertical className="size-4" /></button>}
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}
