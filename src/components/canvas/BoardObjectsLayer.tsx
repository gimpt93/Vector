import { Group, Layer, Line, Text } from "react-konva";
import type {
  BoardObject,
} from "./boardTypes";

type BoardObjectsLayerProps = {
  objects: BoardObject[];
  deletedActionIds: Set<number>;
  isControlPressed: boolean;
  selectedActionId: number | null;
  onSelect: (id: number) => void;
  onMoveLine: (
    id: number,
    newPoints: number[],
  ) => void;
  onMoveText: (
    id: number,
    nextX: number,
    nextY: number,
  ) => void;
  onEditText: (text: Extract<BoardObject, { type: "text" }>) => void;
};

type StrokeSection = {
  points: number[];
  width: number;
};

function createStrokeSections(
  points: number[],
  targetWidth: number,
): StrokeSection[] {
  if (points.length < 4) {
    return [];
  }

  const taperLength = Math.max(18, targetWidth * 4);
  const sections: StrokeSection[] = [];
  let distance = 0;
  let fullWidthStart = 0;

  for (let index = 2; index < points.length; index += 2) {
    const startX = points[index - 2];
    const startY = points[index - 1];
    const endX = points[index];
    const endY = points[index + 1];
    const segmentLength = Math.hypot(endX - startX, endY - startY);
    const segmentEndDistance = distance + segmentLength;

    if (distance < taperLength) {
      const progress = Math.min(1, segmentEndDistance / taperLength);
      const easedProgress = 1 - Math.pow(1 - progress, 2);
      sections.push({
        points: [startX, startY, endX, endY],
        width: Math.max(0.65, targetWidth * easedProgress),
      });
      fullWidthStart = index;
    }

    distance = segmentEndDistance;

    if (distance >= taperLength) {
      break;
    }
  }

  if (distance < taperLength) {
    return sections;
  }

  sections.push({
    points: points.slice(Math.max(0, fullWidthStart - 2)),
    width: targetWidth,
  });

  return sections;
}

export default function BoardObjectsLayer({
  objects,
  deletedActionIds,
  isControlPressed,
  selectedActionId,
  onSelect,
  onMoveLine,
  onMoveText,
  onEditText,
}: BoardObjectsLayerProps) {
  return (
    <Layer>
      {objects.map((object) => {
        if (deletedActionIds.has(object.id)) {
          return null;
        }

        const isSelected =
          selectedActionId === object.id;

        if (object.type === "line") {
          const strokeSections = createStrokeSections(
            object.points,
            object.width,
          );
          const selectLine = () => {
            if (
              isControlPressed &&
              object.lineTool === "draw"
            ) {
              onSelect(object.id);
            }
          };

          return (
            <Group
              key={object.id}
              draggable={
                isControlPressed &&
                object.lineTool === "draw"
              }
              shadowColor={
                isSelected ? "#2563eb" : undefined
              }
              shadowBlur={isSelected ? 8 : 0}
              shadowOpacity={isSelected ? 0.8 : 0}
              onMouseDown={(event) => {
                if (
                  !isControlPressed ||
                  object.lineTool !== "draw"
                ) {
                  return;
                }

                event.cancelBubble = true;
                selectLine();
              }}
              onTouchStart={(event) => {
                if (
                  !isControlPressed ||
                  object.lineTool !== "draw"
                ) {
                  return;
                }

                event.cancelBubble = true;
                selectLine();
              }}
              onClick={(event) => {
                if (
                  !isControlPressed ||
                  object.lineTool !== "draw"
                ) {
                  return;
                }

                event.cancelBubble = true;
                selectLine();
              }}
              onTap={(event) => {
                if (
                  !isControlPressed ||
                  object.lineTool !== "draw"
                ) {
                  return;
                }

                event.cancelBubble = true;
                selectLine();
              }}
              onDragEnd={(event) => {
                // Translate the line's points by the drag offset and
                // hand the absolute point set up to the parent, so the
                // action log captures final positions instead of deltas.
                const offsetX = event.target.x();
                const offsetY = event.target.y();
                const newPoints = object.points.map(
                  (coordinate, index) =>
                    coordinate +
                    (index % 2 === 0
                      ? offsetX
                      : offsetY),
                );
                onMoveLine(object.id, newPoints);
                event.target.position({ x: 0, y: 0 });
              }}
            >
              {strokeSections.map((section, index) => (
                <Line
                  key={`${object.id}-${index}`}
                  points={section.points}
                  stroke={object.color}
                  strokeWidth={section.width}
                  lineCap="round"
                  lineJoin="round"
                  tension={section.points.length > 4 ? 0.4 : 0}
                  hitStrokeWidth={20}
                  globalCompositeOperation={
                    object.lineTool === "erase"
                      ? "destination-out"
                      : "source-over"
                  }
                />
              ))}
            </Group>
          );
        }

        const selectText = () => {
          if (isControlPressed) {
            onSelect(object.id);
          }
        };

        return (
          <Text
            key={object.id}
            x={object.x}
            y={object.y}
            text={object.value}
            fill={object.color}
            fontSize={Math.max(object.fontSize, 36)}
            fontFamily="Segoe Print, Comic Sans MS, cursive"
            fontStyle={object.fontWeight ?? "bold"}
            stroke="#ffffff"
            strokeWidth={4}
            fillAfterStrokeEnabled
            draggable={isControlPressed}
            shadowColor={isSelected ? "#2563eb" : "#172033"}
            shadowBlur={isSelected ? 8 : 3}
            shadowOffsetY={isSelected ? 0 : 1}
            shadowOpacity={isSelected ? 0.8 : 0.16}
            lineHeight={1.15}
            onDblClick={(event) => {
              if (isControlPressed) return;
              event.cancelBubble = true;
              onEditText(object);
            }}
            onDblTap={(event) => {
              if (isControlPressed) return;
              event.cancelBubble = true;
              onEditText(object);
            }}
            onMouseDown={(event) => {
              if (!isControlPressed) {
                return;
              }

              event.cancelBubble = true;
              selectText();
            }}
            onTouchStart={(event) => {
              if (!isControlPressed) {
                return;
              }

              event.cancelBubble = true;
              selectText();
            }}
            onClick={(event) => {
              if (!isControlPressed) {
                return;
              }

              event.cancelBubble = true;
              selectText();
            }}
            onTap={(event) => {
              if (!isControlPressed) {
                return;
              }

              event.cancelBubble = true;
              selectText();
            }}
            onDragEnd={(event) => {
              // Konva's `target.x()` after a drag returns the *new*
              // absolute position of the text node (the prop x plus
              // the drag offset). We commit that as the object's
              // absolute x/y in the action log so the action log
              // stays self-contained. React-konva will reconcile the
              // prop change on the next render.
              const nextX = event.target.x();
              const nextY = event.target.y();
              onMoveText(object.id, nextX, nextY);
            }}
          />
        );
      })}
    </Layer>
  );
}
