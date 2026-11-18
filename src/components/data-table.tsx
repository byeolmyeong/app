import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, Spacing } from '@/constants/theme';

export type DataTableColumn = {
  key: string;
  title?: string;
  align?: 'left' | 'right';
  /** 칸 너비 비율. 기본 1 */
  flex?: number;
  /** 이 칸의 글씨를 굵게 */
  bold?: boolean;
};

export type DataTableRow = { key: string } & Record<string, ReactNode>;

export type DataTableProps = {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  /** 머리줄을 그릴지. 기본 true */
  header?: boolean;
};

/** 옛 달력의 표처럼 읽히는 수치 표. 머리줄 아래 먹 선, 줄마다 옅은 선. */
export function DataTable({ columns, rows, header = true }: DataTableProps) {
  return (
    <View>
      {header ? (
        <View style={[styles.row, styles.headerRow]}>
          {columns.map((c) => (
            <Txt key={c.key} variant="label" color="gray" style={cellStyle(c)}>
              {c.title ?? ''}
            </Txt>
          ))}
        </View>
      ) : null}
      {rows.map((row) => (
        <View key={row.key} testID="data-table-row" style={[styles.row, styles.bodyRow]}>
          {columns.map((c) => {
            const cell = row[c.key];
            return typeof cell === 'string' || typeof cell === 'number' ? (
              <Txt key={c.key} variant="table" style={[cellStyle(c), c.bold && styles.bold]}>
                {cell}
              </Txt>
            ) : (
              <View key={c.key} style={{ flex: c.flex ?? 1 }}>
                {cell}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function cellStyle(c: DataTableColumn) {
  return { flex: c.flex ?? 1, textAlign: c.align ?? 'left' } as const;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs },
  headerRow: { paddingBottom: Spacing.xxs, borderBottomWidth: LineWidth, borderBottomColor: Colors.ink },
  bodyRow: { paddingVertical: Spacing.xs, borderBottomWidth: LineWidth, borderBottomColor: Colors.hair },
  bold: { fontWeight: FontWeight.semibold },
});
