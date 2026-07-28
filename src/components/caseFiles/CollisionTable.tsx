interface Column<T> {
  label: string;
  render: (row: T) => string;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
}

export function CollisionTable<T>({ rows, columns }: Props<T>) {
  return (
    <div className="table-scroll">
      <table className="log-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.label}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col.label}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
