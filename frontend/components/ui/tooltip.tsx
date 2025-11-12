import * as React from "react";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [visible, setVisible] = React.useState(false);
  return (
    <span className="relative inline-block">
      <span
        onMouseEnter={() => setVisible(true)}
        onFocus={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onBlur={() => setVisible(false)}
        tabIndex={0}
        aria-describedby="confidence-tooltip"
        className="outline-none"
      >
        {children}
      </span>
      {visible && (
        <span
          id="confidence-tooltip"
          role="tooltip"
          className="absolute z-10 left-1/2 -translate-x-1/2 mt-2 px-3 py-2 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap"
        >
          {content}
        </span>
      )}
    </span>
  );
};
