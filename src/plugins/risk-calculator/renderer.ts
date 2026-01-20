import { CanvasRenderingTarget2D } from 'lightweight-charts';
import { RendererData } from './types';

export class RiskCalculatorRenderer {
  private _data: RendererData | null;

  constructor(data: RendererData | null) {
    this._data = data;
  }

  draw(target: CanvasRenderingTarget2D): void {
    if (!this._data) return;

    target.useBitmapCoordinateSpace(scope => {
      const ctx = scope.context;
      const pixelRatio = scope.horizontalPixelRatio;
      const width = this._data!.width;

    // Helper to brighten color on hover
    const brightenColor = (color: string, amount: number = 20): string => {
      const hex = color.replace('#', '');
      const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + amount);
      const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + amount);
      const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + amount);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    // Helper to draw shaded zones (profit/loss areas)
    const drawShadedZones = () => {
      const entryY = this._data!.entryY;
      const stopLossY = this._data!.stopLossY;
      const targetY = this._data!.targetY;

      if (entryY === null || stopLossY === null) return;

      const isBuy = this._data!.side === 'BUY';

      // Draw Loss Zone (red/pink area)
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#ef5350'; // Red color for loss
      ctx.fillRect(
        0,
        Math.min(entryY, stopLossY) * pixelRatio,
        width * pixelRatio,
        Math.abs(entryY - stopLossY) * pixelRatio
      );

      // Draw Profit Zone (green area)
      if (this._data!.showTarget && targetY !== null) {
        ctx.fillStyle = '#26a69a'; // Green color for profit
        ctx.fillRect(
          0,
          Math.min(entryY, targetY) * pixelRatio,
          width * pixelRatio,
          Math.abs(entryY - targetY) * pixelRatio
        );
      }

      ctx.globalAlpha = 1.0;
    };

    // Helper to draw draggable dot on line
    const drawDot = (
      y: number | null,
      color: string,
      lineType: 'entry' | 'stopLoss' | 'target'
    ) => {
      if (y === null) return;

      const isHovered = this._data?.hoveredLine === lineType;
      const isDragging = this._data?.draggingLine === lineType;
      const isActive = isHovered || isDragging;

      // Draw dot in the middle of the chart
      const dotX = width / 2;
      const dotY = y;
      const dotRadius = isActive ? 8 : 6;

      // Dot background (white)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dotX * pixelRatio, dotY * pixelRatio, dotRadius * pixelRatio, 0, Math.PI * 2);
      ctx.fill();

      // Dot border (line color)
      ctx.strokeStyle = color;
      ctx.lineWidth = (isActive ? 3 : 2) * pixelRatio;
      ctx.beginPath();
      ctx.arc(dotX * pixelRatio, dotY * pixelRatio, dotRadius * pixelRatio, 0, Math.PI * 2);
      ctx.stroke();
    };

    // Helper to draw line with label
    const drawLine = (
      y: number | null,
      color: string,
      lineType: 'entry' | 'stopLoss' | 'target',
      label: string,
      isDashed: boolean = false
    ) => {
      if (y === null) return;

      const isHovered = this._data?.hoveredLine === lineType;
      const isDragging = this._data?.draggingLine === lineType;
      const isActive = isHovered || isDragging;

      // Get current price (dragging price or actual price)
      let displayPrice = 0;
      if (isDragging && this._data?.dragPrices.has(lineType)) {
        displayPrice = this._data.dragPrices.get(lineType)!;
      } else {
        if (lineType === 'entry') displayPrice = this._data!.entryPrice;
        else if (lineType === 'stopLoss') displayPrice = this._data!.stopLossPrice;
        else if (lineType === 'target' && this._data!.targetPrice) displayPrice = this._data!.targetPrice;
      }

      // Line style
      ctx.strokeStyle = isActive ? brightenColor(color, 30) : color;
      ctx.lineWidth = (isActive ? 3 : this._data!.lineWidth) * pixelRatio;

      if (isDashed) {
        ctx.setLineDash([10 * pixelRatio, 5 * pixelRatio]);
      } else {
        ctx.setLineDash([]);
      }

      // Draw line
      ctx.beginPath();
      ctx.moveTo(0, y * pixelRatio);
      ctx.lineTo(width * pixelRatio, y * pixelRatio);
      ctx.stroke();

      // Draw label on right side
      const labelText = `${label} ₹${displayPrice.toFixed(2)}`;
      const labelPadding = 6 * pixelRatio;
      const labelHeight = 20 * pixelRatio;

      ctx.font = `${12 * pixelRatio}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const textMetrics = ctx.measureText(labelText);
      const labelWidth = textMetrics.width + labelPadding * 2;

      const labelX = width * pixelRatio - labelWidth - 10 * pixelRatio;
      const labelY = y * pixelRatio - labelHeight / 2;

      // Label background
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 1.0;
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, labelX + labelPadding, y * pixelRatio);

      ctx.setLineDash([]);
    };

      // Step 1: Draw shaded zones in background
      drawShadedZones();

      // Step 2: Draw the price lines
      // Draw Entry line
      drawLine(
        this._data!.entryY,
        this._data!.colors.entry,
        'entry',
        'Entry',
        false
      );

      // Draw Stop Loss line
      drawLine(
        this._data!.stopLossY,
        this._data!.colors.stopLoss,
        'stopLoss',
        'Stop Loss',
        false
      );

      // Draw Target line (dashed, read-only)
      if (this._data!.showTarget && this._data!.targetPrice !== null) {
        drawLine(
          this._data!.targetY,
          this._data!.colors.target,
          'target',
          'Target',
          true
        );
      }

      // Step 3: Draw draggable dots on top of lines
      drawDot(this._data!.entryY, this._data!.colors.entry, 'entry');
      drawDot(this._data!.stopLossY, this._data!.colors.stopLoss, 'stopLoss');
      // Target line is read-only, so no dot needed (or add a non-draggable dot)
    });
  }
}
