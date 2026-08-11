import { Layer, Line, Text } from "react-konva";
import type {
  BoardObject,
  Tool,
} from "./boardTypes";

type BoardObjectsLayerProps = {
  objects: BoardObject[];
  deletedActionIds: Set<number>;
  tool: Tool;
  selectedActionId: number | null;
  onSelect: (id: number) => void;
  onMoveLine: (
    id: number,
    offsetX: number,
    offsetY: number,
  ) => void;
  onMoveText: (
    id: number,
    offsetX: number,
    offsetY: number,
  ) => void;
};

export default function BoardObjectsLayer({
  objects,
  deletedActionIds,
  tool,
  selectedActionId,
  onSelect,
  onMoveLine,
  onMoveText,
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
          const selectLine = () => {
            if (
              tool === "select" &&
              object.lineTool === "draw"
            ) {
              onSelect(object.id);
            }
          };

          return (
            <Line
              key={object.id}
              points={object.points}
              stroke={object.color}
              strokeWidth={object.width}
              lineCap="round"
              lineJoin="round"
              tension={0.4}
              hitStrokeWidth={20}
              globalCompositeOperation={
                object.lineTool === "erase"
                  ? "destination-out"
                  : "source-over"
              }
              draggable={
                tool === "select" &&
                isSelected &&
                object.lineTool === "draw"
              }
              shadowColor={
                isSelected ? "#2563eb" : undefined
              }
              shadowBlur={isSelected ? 8 : 0}
              shadowOpacity={isSelected ? 0.8 : 0}
              onClick={(event) => {
                if (
                  tool !== "select" ||
                  object.lineTool !== "draw"
                ) {
                  return;
                }

                event.cancelBubble = true;
                selectLine();
              }}
              onTap={(event) => {
                if (
                  tool !== "select" ||
                  object.lineTool !== "draw"
                ) {
                  return;
                }

                event.cancelBubble = true;
                selectLine();
              }}
              onDragEnd={(event) => {
                onMoveLine(
                  object.id,
                  event.target.x(),
                  event.target.y(),
                );

                event.target.position({ x: 0, y: 0 });
              }}
            />
          );
        }

        const selectText = () => {
          if (tool === "select") {
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
            fontSize={object.fontSize}
            fontFamily="Segoe Print, Comic Sans MS, cursive"
            draggable={tool === "select" && isSelected}
            shadowColor={
              isSelected ? "#2563eb" : undefined
            }
            shadowBlur={isSelected ? 8 : 0}
            shadowOpacity={isSelected ? 0.8 : 0}
            onClick={(event) => {
              if (tool !== "select") {
                return;
              }

              event.cancelBubble = true;
              selectText();
            }}
            onTap={(event) => {
              if (tool !== "select") {
                return;
              }

              event.cancelBubble = true;
              selectText();
            }}
            onDragEnd={(event) => {
              onMoveText(
                object.id,
                event.target.x() - object.x,
                event.target.y() - object.y,
              );
            }}
          />
        );
      })}
    </Layer>
  );
}
