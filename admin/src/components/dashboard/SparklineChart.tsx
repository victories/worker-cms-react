interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function SparklineChart({
  data,
  color = '#3b82f6',
  width = 100,
  height = 32,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * innerW;
    const y = padding + innerH - ((v - min) / range) * innerH;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  // Build the fill polygon: line points + bottom-right + bottom-left
  const lastX = padding + innerW;
  const firstX = padding;
  const bottom = height;
  const fillPath = `${polyline} ${lastX},${bottom} ${firstX},${bottom}`;

  const gradientId = `spark-${color.replace('#', '')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={fillPath} fill={`url(#${gradientId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
