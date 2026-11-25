import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

/**
 * Tableau de documentation : colonnes déclaratives (`columns`), lignes en
 * tableau de cellules (`rows`). Première colonne stylée en code par
 * convention (nom de champ, symptôme, option...).
 */
export function DocTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            {columns.map(column => (
              <TableHead key={column} className="font-semibold text-gray-700">{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className={cn(cellIndex === 0 && 'font-mono text-xs')}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
