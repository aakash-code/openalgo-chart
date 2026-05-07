import { RendererData } from './types';

interface BitmapCoordinatesRenderingScope {
  context: CanvasRenderingContext2D;
  horizontalPixelRatio: number;
  verticalPixelRatio: number;
  bitmapSize: { width: number; height: number };
}

interface RenderTarget {
  useBitmapCoordinateSpace(cb: (scope: BitmapCoordinatesRenderingScope) => void): void;
}

export class RiskCalculatorRenderer {
  private _data: RendererData | null;

  constructor(data: RendererData | null) {
    this._data = data;
  }

  draw(target: RenderTarget): void {
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
      const targetYs = this._data!.targetYs;

      if (entryY === null || stopLossY === null) return;

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
      if (this._data!.showTarget) {
        ctx.fillStyle = '#26a69a'; // Green color for profit
        
        if (targetYs && targetYs.length > 0) {
          // Shade to the furthest target
          let furthestTargetY = entryY;
          targetYs.forEach(ty => {
            if (ty !== null) {
              if (Math.abs(ty - entryY) > Math.abs(furthestTargetY - entryY)) {
                furthestTargetY = ty;
              }
            }
          });
          
          ctx.fillRect(
            0,
            Math.min(entryY, furthestTargetY) * pixelRatio,
            width * pixelRatio,
            Math.abs(entryY - furthestTargetY) * pixelRatio
          );
        } else if (targetY !== null) {
          ctx.fillRect(
            0,
            Math.min(entryY, targetY) * pixelRatio,
            width * pixelRatio,
            Math.abs(entryY - targetY) * pixelRatio
          );
        }
      }

      ctx.globalAlpha = 1.0;
    };

    // Helper to draw draggable dot on line
    const drawDot = (
      y: number | null,
      color: string,
      lineType: string
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
      lineType: string,
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
        else if (lineType === 'target') displayPrice = this._data!.targetPrice || 0;
        else if (lineType.startsWith('target-')) {
          const idx = parseInt(lineType.split('-')[1]);
          displayPrice = this._data!.targets?.[idx]?.price || 0;
        }
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

      // Draw Target lines
      if (this._data!.showTarget) {
        // Draw legacy single target if it exists and no multi-targets
        if (this._data!.targetPrice !== null && (!this._data!.targetYs || this._data!.targetYs.length === 0)) {
          drawLine(
            this._data!.targetY,
            this._data!.colors.target,
            'target',
            'Target',
            true
          );
        }
        
        // Draw multi-targets
        if (this._data!.targetYs && this._data!.targetYs.length > 0) {
          this._data!.targetYs.forEach((ty, idx) => {
            if (ty !== null) {
              drawLine(
                ty,
                this._data!.colors.target,
                `target-${idx}`,
                `T${idx + 1} (${this._data!.targets![idx].exitPercent}%)`,
                true
              );
            }
          });
        }
      }

      // Step 3: Draw draggable dots on top of lines
      drawDot(this._data!.entryY, this._data!.colors.entry, 'entry');
      drawDot(this._data!.stopLossY, this._data!.colors.stopLoss, 'stopLoss');
      
      if (this._data!.showTarget) {
        if (this._data!.targetY !== null && (!this._data!.targetYs || this._data!.targetYs.length === 0)) {
          drawDot(this._data!.targetY, this._data!.colors.target, 'target');
        }
        
        if (this._data!.targetYs && this._data!.targetYs.length > 0) {
          this._data!.targetYs.forEach((ty, idx) => {
            if (ty !== null) {
              drawDot(ty, this._data!.colors.target, `target-${idx}`);
            }
          });
        }
      }
    });
  }
}
