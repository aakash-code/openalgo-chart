/// <reference types="vite/client" />

export {};

// CSS Modules declarations
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.scss' {
  const content: string;
  export default content;
}

// Image imports
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.csv?raw' {
  const content: string;
  export default content;
}

declare module '*.csv' {
  const content: string;
  export default content;
}

// Global window extensions for chart debugging
declare global {
  interface Window {
    lineToolManager?: any;
    chartInstance?: any;
    seriesInstance?: any;
    __indicatorStore__?: any;
  }
}

// HTMLDivElement extensions for chart references
declare global {
  interface HTMLDivElement {
    __chartInstance__?: any;
    __indicatorTypesMap__?: any;
    __indicatorSeriesMap__?: any;
    __indicatorPanesMap__?: any;
    __mainSeriesRef__?: any;
  }
}
