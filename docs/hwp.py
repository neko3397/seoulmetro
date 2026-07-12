import os
import sys
import json
import argparse
import struct
from typing import List, Tuple, Optional, Union
from hwp_hwpx_parser.hwp5 import HWP5Reader, HWPTAG_TABLE, HWPTAG_LIST_HEADER
from hwp_hwpx_parser.models import TableData, ExtractOptions
from hwp_hwpx_parser.reader import Reader, FileType, OLEFILE_AVAILABLE
from hwp_hwpx_parser.hwpx import HWPXReader

class CustomHWP5Reader(HWP5Reader):
    def _extract_table_at(
        self,
        records: List[Tuple[int, int, bytes]],
        table_record_idx: int,
        options: ExtractOptions,
    ) -> Optional[TableData]:
        tag_id, level, record_data = records[table_record_idx]
        if tag_id != HWPTAG_TABLE:
            return None

        table_info = self._parse_table_record(record_data)
        if not table_info:
            return None

        rows, cols, row_counts = table_info
        total_cells = sum(row_counts)

        grid = [[None for _ in range(cols)] for _ in range(rows)]
        cell_idx = 0
        j = table_record_idx + 1
        note_section_level = None

        from hwp_hwpx_parser.hwp5 import CTRL_ID_FOOTNOTE, CTRL_ID_ENDNOTE

        while j < len(records) and cell_idx < total_cells:
            cell_tag, cell_level, cell_data = records[j]

            if note_section_level is not None:
                if cell_level <= note_section_level:
                    note_section_level = None
                else:
                    j += 1
                    continue

            if cell_tag == 55 + 0x10:  # HWPTAG_CTRL_HEADER
                ctrl_id = self._read_ctrl_id(cell_data)
                if ctrl_id in (CTRL_ID_FOOTNOTE, CTRL_ID_ENDNOTE):
                    note_section_level = cell_level
                    j += 1
                    continue

            if cell_tag == HWPTAG_LIST_HEADER:
                # Parse coordinates (2 bytes col, 2 bytes row, 2 bytes col_span, 2 bytes row_span)
                col_idx = struct.unpack_from("<H", cell_data, 8)[0]
                row_idx = struct.unpack_from("<H", cell_data, 10)[0]
                col_span = struct.unpack_from("<H", cell_data, 12)[0]
                row_span = struct.unpack_from("<H", cell_data, 14)[0]
                
                cell_text = self._extract_cell_text(records, j, options)
                
                # Place cell in grid
                for r in range(row_idx, row_idx + row_span):
                    for c in range(col_idx, col_idx + col_span):
                        if r < rows and c < cols:
                            if r == row_idx and c == col_idx:
                                grid[r][c] = cell_text
                            else:
                                grid[r][c] = ""
                                
                cell_idx += 1
            j += 1

        table_rows = []
        for r_idx in range(rows):
            row_cells = []
            for c_idx in range(cols):
                row_cells.append(grid[r_idx][c_idx] or "")
            table_rows.append(row_cells)

        return TableData(rows=table_rows)

    def _extract_tables_from_section(
        self, data: bytes, options: ExtractOptions
    ) -> List[TableData]:
        tables = []
        records = list(self._parse_records(data))
        table_ranges = self._find_table_ranges(records)
        
        i = 0
        while i < len(records):
            tag_id, level, record_data = records[i]
            if i in table_ranges:
                table_start, table_end = table_ranges[i]
                table_data = self._extract_table_at(records, table_start, options)
                if table_data and table_data.rows:
                    tables.append(table_data)
                i = table_end + 1
                continue
            i += 1
        return tables

class CustomReader(Reader):
    def _get_reader(self):
        if self._reader is not None:
            return self._reader

        if self._file_type == FileType.HWP5:
            if not OLEFILE_AVAILABLE:
                raise ImportError("olefile package required: pip install olefile")
            self._reader = CustomHWP5Reader(str(self.filepath))
        elif self._file_type == FileType.HWPX:
            self._reader = HWPXReader(str(self.filepath))
        else:
            raise ValueError(f"Unsupported file format: {self.filepath.suffix}")

        return self._reader

def parse_hwp_to_dict(file_path):
    with CustomReader(file_path) as r:
        # Get general metadata
        file_name = os.path.basename(file_path)
        title = os.path.splitext(file_name)[0]
        
        # Extract text and tables
        text = r.text
        tables_data = []
        for idx, table in enumerate(r.tables):
            try:
                markdown_str = table.to_markdown()
            except Exception:
                markdown_str = ""
                
            try:
                csv_str = table.to_csv()
            except Exception:
                csv_str = ""
                
            tables_data.append({
                "index": idx,
                "row_count": table.row_count,
                "col_count": table.col_count,
                "markdown": markdown_str,
                "csv": csv_str
            })
            
        memos_data = []
        try:
            memos = r.get_memos()
            for memo in memos:
                memos_data.append({
                    "memo_id": getattr(memo, "memo_id", None),
                    "author": getattr(memo, "author", None),
                    "referenced_text": getattr(memo, "referenced_text", None)
                })
        except Exception:
            pass

        # To optimize RAG performance, we construct a unified markdown content
        # by appending tables at the end or including them to keep their structures.
        markdown_content = text
        if tables_data:
            markdown_content += "\n\n### [Tables in Document]\n\n"
            for t in tables_data:
                if t["markdown"]:
                    markdown_content += f"#### Table {t['index'] + 1}\n{t['markdown']}\n\n"
                    
        return {
            "file_name": file_name,
            "title": title,
            "text": text,
            "markdown": markdown_content,
            "tables": tables_data,
            "memos": memos_data
        }

def main():
    parser = argparse.ArgumentParser(description="Hancom OpenDataLoader HWP Parser to JSON")
    parser.add_argument("--input", help="Path to input HWP/HWPX file")
    parser.add_argument("--output", help="Path to output JSON file")
    parser.add_argument("--input-dir", help="Path to directory containing HWP/HWPX files")
    parser.add_argument("--output-dir", help="Path to output directory for batch mode")
    
    args = parser.parse_args()
    
    docs_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Single file mode
    if args.input:
        if not os.path.exists(args.input):
            print(f"Error: Input file '{args.input}' does not exist.", file=sys.stderr)
            sys.exit(1)
            
        output_path = args.output
        if not output_path:
            # Default output name: <input_stem>.json in the same directory as input
            stem = os.path.splitext(os.path.basename(args.input))[0]
            output_path = os.path.join(os.path.dirname(args.input), f"{stem}.json")
            
        try:
            result = parse_hwp_to_dict(args.input)
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"Successfully parsed '{args.input}' and saved to '{output_path}'")
        except Exception as e:
            print(f"Error parsing file: {e}", file=sys.stderr)
            sys.exit(1)
            
    # 2. Batch mode
    else:
        # Determine input and output directories
        target_input_dir = args.input_dir if args.input_dir else docs_dir
        if not os.path.exists(target_input_dir):
            print(f"Error: Input directory '{target_input_dir}' does not exist.", file=sys.stderr)
            sys.exit(1)
            
        target_output_dir = args.output_dir if args.output_dir else os.path.join(docs_dir, "output")
        
        hwp_files = []
        for file in os.listdir(target_input_dir):
            if file.lower().endswith((".hwp", ".hwpx")):
                hwp_files.append(os.path.join(target_input_dir, file))
                
        if not hwp_files:
            print(f"No HWP or HWPX files found in '{target_input_dir}' directory to convert.", file=sys.stderr)
            return
            
        print(f"Discovered {len(hwp_files)} HWP/HWPX files to convert in '{target_input_dir}':")
        for hwp in hwp_files:
            print(f"  - {os.path.basename(hwp)}")
            
        os.makedirs(target_output_dir, exist_ok=True)
        
        for hwp_path in hwp_files:
            stem = os.path.splitext(os.path.basename(hwp_path))[0]
            json_output_path = os.path.join(target_output_dir, f"{stem}.json")
            md_output_path = os.path.join(target_output_dir, f"{stem}.md")
            
            try:
                result = parse_hwp_to_dict(hwp_path)
                
                # Write JSON
                with open(json_output_path, "w", encoding="utf-8") as f:
                    json.dump(result, f, ensure_ascii=False, indent=2)
                    
                # Write Markdown
                with open(md_output_path, "w", encoding="utf-8") as f:
                    f.write(result["markdown"])
                    
                print(f"Successfully processed: {os.path.basename(hwp_path)}")
            except Exception as e:
                print(f"Failed to process '{os.path.basename(hwp_path)}': {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
