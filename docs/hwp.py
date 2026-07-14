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

def generate_custom_forms(images_dir):
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return
        
    os.makedirs(images_dir, exist_ok=True)
    
    font_paths = [
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
        "/System/Library/Fonts/AppleGothic.ttf"
    ]
    font_path = None
    for p in font_paths:
        if os.path.exists(p):
            font_path = p
            break
            
    def get_font(size):
        if font_path:
            try:
                return ImageFont.truetype(font_path, size)
            except Exception:
                pass
        return ImageFont.load_default()
        
    # Draw jidopyo_front
    img = Image.new("RGB", (360, 360), "#ffcccc")
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, 350, 350], outline="black", width=2)
    draw.text((180, 40), "지  도  표 (표면)", fill="black", font=get_font(24), anchor="ms")
    draw.text((30, 90), "제                호", fill="black", font=get_font(16))
    draw.text((30, 130), "명령번호 : 제            호", fill="black", font=get_font(16))
    draw.text((30, 170), "구    간 :            역 ~            역간", fill="black", font=get_font(16))
    draw.text((30, 210), "년      월      일 발행", fill="black", font=get_font(16))
    draw.text((30, 260), "발행 정거장 :                소장 (인)", fill="black", font=get_font(16))
    draw.text((30, 300), "상대 정거장 :                소장 (인)", fill="black", font=get_font(16))
    img.save(os.path.join(images_dir, "jidopyo_front.png"))

    # Draw jidopyo_back
    img = Image.new("RGB", (360, 360), "#ffcccc")
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, 350, 350], outline="black", width=2)
    draw.text((180, 40), "지  도  표 (이면)", fill="black", font=get_font(24), anchor="ms")
    draw.text((30, 100), "최초사용 : 제            열차", fill="black", font=get_font(16))
    draw.text((30, 150), "최후사용 : 제            열차", fill="black", font=get_font(16))
    draw.text((30, 200), "말소시각 :       년    월    일    시    분", fill="black", font=get_font(16))
    draw.text((30, 250), "말 소 자 :                소장 (인)", fill="black", font=get_font(16))
    img.save(os.path.join(images_dir, "jidopyo_back.png"))

    # Draw jidokwon
    img = Image.new("RGB", (300, 300), "white")
    draw = ImageDraw.Draw(img)
    draw.rectangle([8, 8, 292, 292], outline="red", width=2)
    draw.text((150, 35), "지  도  권", fill="red", font=get_font(22), anchor="ms")
    draw.text((25, 75), "제                호", fill="red", font=get_font(14))
    draw.text((25, 115), "구    간 :            역 ~            역간", fill="red", font=get_font(14))
    draw.text((25, 155), "열    차 : 제            열차", fill="red", font=get_font(14))
    draw.text((25, 195), "발    행 :       년    월    일", fill="red", font=get_font(14))
    draw.text((25, 235), "지도표 번호 : 제            호", fill="red", font=get_font(14))
    draw.text((150, 270), "발행 정거장 소장 (인)", fill="red", font=get_font(14), anchor="ms")
    img.save(os.path.join(images_dir, "jidokwon.png"))

    # Draw driving_order_form
    img = Image.new("RGB", (500, 300), "white")
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, 490, 290], outline="black", width=2)
    draw.line([320, 10, 320, 70], fill="black", width=1)
    draw.line([320, 40, 490, 40], fill="black", width=1)
    draw.line([370, 10, 370, 70], fill="black", width=1)
    draw.line([410, 10, 410, 70], fill="black", width=1)
    draw.line([450, 10, 450, 70], fill="black", width=1)
    draw.text((160, 40), "운 전 명 령 서", fill="black", font=get_font(20), anchor="ms")
    draw.text((345, 25), "결재", fill="black", font=get_font(12), anchor="ms")
    draw.text((390, 25), "담당", fill="black", font=get_font(12), anchor="ms")
    draw.text((430, 25), "부장", fill="black", font=get_font(12), anchor="ms")
    draw.text((470, 25), "소장", fill="black", font=get_font(12), anchor="ms")
    draw.text((25, 90), "번호 : 제            호", fill="black", font=get_font(14))
    draw.text((25, 125), "일시 :       년    월    일    시    분", fill="black", font=get_font(14))
    draw.text((25, 160), "취급자 :                    (인)", fill="black", font=get_font(14))
    draw.text((25, 195), "수신처 :            소속            성명", fill="black", font=get_font(14))
    draw.rectangle([25, 230, 475, 275], outline="black", width=1)
    draw.text((35, 245), "명령 내용 :", fill="black", font=get_font(14))
    img.save(os.path.join(images_dir, "driving_order_form.png"))

def convert_headings_to_markdown(text, title):
    import re
    text = text.replace("\u200b", "")
    # 1. Chapters: 제N장
    text = re.sub(r"\n(제\s*\d+\s*장\s+[^\n]+)(?=\n|$)", r"\n## \1", text)
    # 2. Sections: 제N절
    text = re.sub(r"\n(제\s*\d+\s*절\s+[^\n]+)(?=\n|$)", r"\n### \1", text)
    # 3. Articles: 제N조 or 제N조의M
    text = re.sub(r"\n(제\s*\d+\s*조(?:의\s*\d+)?\s*\([^\)]+\)[^\n]*)(?=\n|$)", r"\n### \1", text)
    # 4. Articles without parentheses: 제N조...
    text = re.sub(r"\n(제\s*\d+\s*조(?:의\s*\d+)?(?:\s+[^\n]*)(?=\n|$))", r"\n### \1", text)

    if "ato" in title.lower() or "고장조치" in title.lower():
        # Main headings: 01 | 기동요령
        text = re.sub(r"\n(\d{2}\s*\|\s*[^\n]+)(?=\n|$)", r"\n## \1", text)
        # Sub headings: 1단계, 현상, 조치요령, 참고 등
        sub_headers = ["1단계", "2단계", "3단계", "4단계", "5단계", "현상", "조치요령", "원인 및 조치", "참고"]
        for sh in sub_headers:
            text = re.sub(r"\n\s*(" + re.escape(sh) + r")\s*(?=\n|$)", r"\n### \1", text)

    return text

def get_doc_slug(title):
    import unicodedata
    normalized = unicodedata.normalize("NFC", title).strip()
    
    slugs = {
        "1. 운전취급규정(24.12.03)": "driving_regulation",
        "3. 운전관계직원업무내규(24.12.03)-1": "employee_rules",
        "5. 차량기지운전취급내규(25.06.30)-1": "depot_rules",
        "ato 고장조치": "ato_troubleshooting"
    }
    
    for key, val in slugs.items():
        if key in normalized or val in normalized.lower():
            return val
            
    import re
    return re.sub(r'[^a-zA-Z0-9_-]', '_', title)

def parse_hwp_to_dict(file_path, output_dir=None):
    from hwp_hwpx_parser.models import ExtractOptions, ImageMarkerStyle
    options = ExtractOptions(image_marker=ImageMarkerStyle.WITH_NAME)
    
    with CustomReader(file_path) as r:
        # Get general metadata
        file_name = os.path.basename(file_path)
        title = os.path.splitext(file_name)[0]
        slug = get_doc_slug(title)
        
        # Extract text and tables
        text = r.extract_text(options)
        tables_data = []
        for idx, table in enumerate(r.get_tables(options)):
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

        # Save images and replace image markers
        if output_dir:
            images_dir = os.path.join(output_dir, "images", slug)
            os.makedirs(images_dir, exist_ok=True)
            
            # Save inline HWP images
            try:
                images = r.get_images()
                for img in images:
                    filename = img.filename or f"image_{img.index:03d}.{img.format}"
                    img_path = os.path.join(images_dir, filename)
                    img.save(img_path)
            except Exception as e:
                print(f"Error saving images: {e}", file=sys.stderr)

            # Generate custom form images
            generate_custom_forms(images_dir)

            # Replace [IMAGE: BIN000X.ext] with markdown image links
            import re
            def replace_marker(match):
                filename = match.group(1)
                return f"![{filename}](images/{slug}/{filename})"

            text = re.sub(r"\[IMAGE:\s*([^\]]+)\]", replace_marker, text)
            for t in tables_data:
                if t["markdown"]:
                    t["markdown"] = re.sub(r"\[IMAGE:\s*([^\]]+)\]", replace_marker, t["markdown"])
                if t["csv"]:
                    t["csv"] = re.sub(r"\[IMAGE:\s*([^\]]+)\]", replace_marker, t["csv"])

            # Post-process custom forms
            pat_front = r"\|\s*⌢\s*표\s*면\s*⌣\s*\|[^\n]+\n\|[^\n]+(?:\n|$)"
            rep_front = f"![지도표 표면](images/{slug}/jidopyo_front.png)\n"
            text = re.sub(pat_front, rep_front, text)
            
            pat_back = r"\|\s*⌢\s*이\s*면\s*⌣\s*\|[^\n]+\n\|[^\n]+(?:\n|$)"
            rep_back = f"![지도표 이면](images/{slug}/jidopyo_back.png)\n"
            text = re.sub(pat_back, rep_back, text)

            pat_jidokwon = r"\|\s*제\s*호\s*\|\s*\|\n\|[^\n]+\n(?:\|[^\n]+(?:\n|$))+"
            rep_jidokwon = f"![지도권](images/{slug}/jidokwon.png)\n"
            text = re.sub(pat_jidokwon, rep_jidokwon, text)

            pat_note = r"\|\s*비\s*고\s*1\.\s*규격은\s*가로[^\n]+\n\|[^\n]+(?:\n|$)"
            rep_note = "*규격: 가로, 세로 각 70mm / 지질: 두꺼운 백색종이 / 인쇄: 1면 적색문자*\n"
            text = re.sub(pat_note, rep_note, text)

            pat_order = r"\|\s*\|\s*\|\s*\|\s*\|\s*결\s*재\s*\|[^\n]+\n\|[^\n]+\n(?:\|[^\n]+(?:\n|$))+"
            rep_order = f"![운전명령서](images/{slug}/driving_order_form.png)\n"
            text = re.sub(pat_order, rep_order, text)

            # Replace inside tables markdown too
            for t in tables_data:
                if t["markdown"]:
                    t["markdown"] = re.sub(pat_front, rep_front, t["markdown"])
                    t["markdown"] = re.sub(pat_back, rep_back, t["markdown"])
                    t["markdown"] = re.sub(pat_jidokwon, rep_jidokwon, t["markdown"])
                    t["markdown"] = re.sub(pat_note, rep_note, t["markdown"])
                    t["markdown"] = re.sub(pat_order, rep_order, t["markdown"])

        # Convert headings to markdown structure for optimal hierarchical RAG indexing
        text = convert_headings_to_markdown("\n" + text, title).lstrip("\n")

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
            output_dir = os.path.dirname(os.path.abspath(output_path))
            result = parse_hwp_to_dict(args.input, output_dir=output_dir)
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
                result = parse_hwp_to_dict(hwp_path, output_dir=target_output_dir)
                
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
