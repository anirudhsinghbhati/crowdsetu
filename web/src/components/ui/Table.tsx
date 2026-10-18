import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ children, className = '', ...props }) => (
  <div className="w-full overflow-x-auto">
    <table className={`w-full text-left text-sm border-collapse ${className}`} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <thead className={`border-b border-border bg-bg/40 text-xs font-semibold text-muted uppercase tracking-wider ${className}`} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <tbody className={`divide-y divide-border/50 ${className}`} {...props}>
    {children}
  </tbody>
);

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isOffline?: boolean;
  isRedAlert?: boolean;
  clickable?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({
  children,
  isOffline = false,
  isRedAlert = false,
  clickable = false,
  className = '',
  ...props
}) => {
  let rowHighlight = 'hover:bg-border/20';
  if (isRedAlert) {
    rowHighlight = 'bg-status-red/10 border-l-4 border-l-status-red hover:bg-status-red/15';
  } else if (isOffline) {
    rowHighlight = 'bg-status-grey/10 border-l-2 border-l-status-grey opacity-75 hover:bg-status-grey/15';
  }

  return (
    <tr
      className={`transition-colors duration-150 ${rowHighlight} ${
        clickable ? 'cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <th className={`px-4 py-3 text-xs font-medium text-muted ${className}`} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <td className={`px-4 py-3.5 text-text align-middle tabular-nums ${className}`} {...props}>
    {children}
  </td>
);
