import { Circle, Group } from "react-konva";

type GridProps = {
  width: number;
  height: number;
};

export default function Grid({ width, height }: GridProps) {
  const dots = [];
  const spacing = 40;

  for (let x = -width; x <= width * 2; x += spacing) {
    for (let y = -height; y <= height * 2; y += spacing) {
      dots.push(
        <Circle
          key={`${x}-${y}`}
          x={x}
          y={y}
          radius={2}
          fill="#b8b8b8"
          listening={false}
        />,
      );
    }
  }

  return <Group listening={false}>{dots}</Group>;
}