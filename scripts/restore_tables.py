import json
import re
import os

md_path = "/Users/kimseunghyun/Documents/seoulmetro/docs/law/output/3. 운전관계직원업무내규(24.12.03)-1.md"
json_path = "/Users/kimseunghyun/Documents/seoulmetro/docs/law/output/3. 운전관계직원업무내규(24.12.03)-1.json"

with open(md_path, "r", encoding="utf-8") as f:
    content = f.read()

# Define main keys for aligning tables
table1_main_keys = [
    "차내신호기의 신호현시가 변화한 후 그 현시를 확인하였을 때",
    "장내, 출발, 자동폐색신호기의 신호현시를 확인하였을 때",
    "원방신호기를 확인하였을 때",
    "자동폐색신호기의 정지신호현시를 확인후 소정의 스위치를 투입하였을 때",
    "ATS/ATC CUTOUT 스위치 취급시",
    "입환신호기의 신호현시를 확인하였을 때",
    "임시신호기를 확인하였을 때",
    "해제신호기 통과시점",
    "수신호의 현시를 확인하였을 때"
]

table2_main_keys = [
    "출발전호를 확인하였을 때",
    "입환전호를 확인하였을 때",
    "제동시험 전호를 확인하였을 때",
    "후부자력운전 및 되돌이운전 전호를 확인하였을 때"
]

table3_main_keys = [
    "전기관계표지를 확인하였을 때",
    "철도토목관계표지를 확인하였을 때",
    "신호관계표지를 확인하였을 때"
]

table4_main_keys = [
    "진로개통표시기의 진로개통상태 확인 시",
    "진로표시기의 진로상태 확인 시"
]

table5_main_keys = [
    "운전명령서 접수시",
    "운전허가증 수령 시"
]

table6_main_keys = [
    "열차운전중 기기취급 시",
    "AC, DC등 점등 시",
    "주차제동(수동제동기)걸기할 때",
    "구원열차 연결시",
    "기기상태 확인 시"
]

table17_main_keys = [
    "승강장에 열차도착 시",
    "열차출발 시 또는 후부자력운전 및 되돌이운전 시 신호현시상태를 확인하였을 때",
    "수신호의 현시를 확인하였을 때",
    "CCTV 모니터 확인",
    "승무원조작반내의 승강장안전문 상태를 확인하였을 때",
    "승강장조작반내 출발반응표지의 점,소등을 확인하였을 때",
    "역장의 출발지시전호를 확인하였을 때",
    "출발전호시",
    "열차후부가 승강장을 벗어난 직후",
    "후부표지, 행선 및 열차번호의 상태를 확인하였을때",
    "운전명령서 접수시",
    "기관사로부터 운전허가증의 주고받음을 통보받았을 때",
    "차량유치 완료후",
    "기기상태 확인시"
]

table18_main_keys = [
    "폐색수속취급 시",
    "열차도착 후 개통수속을 할 때",
    "열차출발시각을통보할 때",
    "운전명령서 및 운전허가증 발행 시",
    "운전허가증 반복 협의 완료 시"
]

table19_main_keys = [
    "신호기의 신호현시를 변경한 후",
    "수신호대용기 취급시",
    "제어반 절환조작시",
    "선로전환기 취급후",
    "진로를 설정하였을 때",
    "열차접근 부져를 확인하였을 때"
]

table20_main_keys = [
    "취급하여야 할 선로전환기를 확인하였을 때",
    "수동핸들 삽입 후",
    "선로전환기를 전환하였을 때"
]

table21_main_keys = [
    "출발신호기 또는 출발반응표지 확인 후 출발시키기 직전",
    "차장에게 출발지시전호를 할 때",
    "열차가 승강장을 벗어난 후 이상없음을 확인 시"
]

table22_main_keys = [
    "출발, 장내 및 입환신호기의 수동취급 시",
    "절환조작 시",
    "대용폐색방식 또는 전령법 시행 시",
    "운전명령 및 운전허가증 승인시 명령번호 기록부",
    "입,출고 시",
    "열차운전 정리 시",
    "열차의 도착․출발시각 접수시",
    "CPU 전환 시",
    "열차DIA 선택 시",
    "시발역 및 도중역에서 열차번호 취급 시"
]

table23_main_keys = [
    "장내, 출발, 자동폐색신호기의 신호현시를 확인하였을 때",
    "원방신호기를 확인하였을 때",
    "입환신호기의 신호현시를 확인하였을 때",
    "임시신호기를 확인하였을 때",
    "해제신호기 통과시점",
    "수신호의 현시를 확인하였을 때"
]

table24_main_keys = [
    "출발 전호를 확인하였을 때",
    "제동시험 전호를 확인하였을 때",
    "되돌이운전을 확인하였을 때"
]

table25_main_keys = [
    "철도토목관계표지를 확인하였을 때"
]

table26_main_keys = [
    "진로개통표시기의 진로개통상태 확인시",
    "진로표시기의 진로상태 확인시"
]

table27_main_keys = [
    "운전허가증 수령시"
]

table28_main_keys = [
    "주차제동(수동제동기)걸기할 때",
    "트로리 연결 시",
    "기기상태 확인 시"
]

table8_main_keys = [
    "차내신호",
    "입환신호기",
    "진로개통 표시기",
    "임시신호기",
    "수신호",
    "입환의 경우",
    "선   로 제표지",
    "전차선 표지",
    "열차운전 중 기기조작",
    "출입문 비연동 취급 시",
    "비상운전 취급 시",
    "기관사 안내장치 (HMI)",
    "대용폐색 시행",
    "기타"
]

def format_row(cells):
    clean_cells = [c.replace("\n", " ").strip() for c in cells]
    return "| " + " | ".join(clean_cells) + " |"

def fix_table_rows(unique_idx, headers, rows):
    new_rows = []
    
    # Tables that we completely replace:
    if unique_idx == 30:
        return [
            ['통화종류', '채널 (1호선)', '채널 (2호선)', '채널 (3,4호선)', '채널 (5~8호선)', '사용구간', '통신상대방'],
            ['---', '---', '---', '---', '---', '---', '---'],
            ['구내통화', 'L-CH', '군자, 신정', 'Y-CH', 'Y', '차량기지구내', '기지내 운전 취급실과 열차간'],
            ['관제통화', 'C-CH', 'C-CH', 'C-CH', 'C', '본선구간', '관제와 열차간, 관제와 역간'],
            ['비상통화', 'E-CH', 'E-CH', 'E-CH', 'E', '본선구간', '관제와 열차간, 열차와 역간, 관제와 역간'],
            ['유지보수통화', '-', '-', '-', 'M', '전구간', '유지보수자와 긴급통화']
        ]
    elif unique_idx == 32:
        return [
            ['송수화 기본원칙'],
            ['---'],
            ['- 신속, 정확하고 절도있는 통화<br>- 간단 명료하고 내용은 충실하게<br>- 표준말 경어사용']
        ]
    elif unique_idx == 35:
        return [
            ['구분', '호선', '운전관제', '승무원(이동국)'],
            ['---', '---', '---', '---'],
            ['종합관제센터에서이동국 개별 호출시', '5호선', '이동국이 있는 ZONE(존) 선택 INDIVIUAL(개별호출) 버튼 누름 열차번호 지정', '“ㅇㅇ열차 이상” 통화가 끝나면 “통화 끝”'],
            ['', '6, 7, 8호선', '이동국이 있는 ZONE(존) 선택 열차번호 지정 이동국 : IND Lamp(개별호출 램프) 점등', '운전관제 통화내용 경청 후 “알았습니다. 이상” 통화말미에 “이상” 통화가 끝나면 “통화 끝”'],
            ['이동국 부분 호출시(GROUP)', '', '해당 GROUP(그룹)을 선택 ALL(전체) 버튼 누름 통화말미에 “이상”', ''],
            ['이동국 전체 호출시(ALL)', '', 'ALL ZONE(전체 존) 버튼을 선택 ALL(전체) 버튼 누름 통화말미에 “이상”', ''],
            ['종합관제센터에서 전체 승객 방송시', '', 'ZONE(존)을 선택 BROADCAST(방송) 버튼을 누름 ZONE(존)내에 열차승객 방송', ''],
            ['종합관제센터에서 개별 승객 방송 시(6, 7, 8호선)', '', 'BROADCAST(방송) 버튼을 누름 ZONE(존)을 선택 열차번호를 누름 열차에 승객 방송', ''],
            ['이동국에서 운전관제를 호출할 때', '', '이동국 ZONE(존) 선택 후 “관제 이상” 통화내용 경청 후 “알았습니다. 이상”', '관제통화 채널을 선택 후 송수화기를 든다. 통화말미에 “이상” 통화가 끝나면 “통화 끝”'],
            ['이동국에서 기지구내 운전취급실을 호출할 때', '', '', '기지통화 채널을 선택하고 제2항에 준하여 통화 통화내용 경청 후 “알았습니다. 이상” 통화말미에 “이상”'],
            ['이동국에서 유지보수자와의 통화', '', '', '채널을 유지보수통화 채널로 선택 송수화기를 들고 *표를 누른다. 신호음 확인 후 가입자번호 선택 통화가 끝난 후 #표를 누른 후 송수화기를 놓는다.'],
            ['비상시의 통화방법', '', 'EM(비상호출) 확인 CLEAR 버튼을 누름 열차번호 현시 확인 후 ZONE(존) 선택 “관제 이상” 통화내용 경청 후 “알았습니다 이상”', 'EM S/W(비상호출 스위치)를 선택 통화말미에 “이상” 통화가 끝나면 “통화 끝”']
        ]
    elif unique_idx == 38:
        res = [
            ['구분 년월일', '직명', '성명', '평가 (자세)', '평가 (환호 요령)', '평가 (발성)', '평가 (지적 여부 및 시기)', '평가 (지도 평가)', '계', '순위', '판정', '비고'],
            ['---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---']
        ]
        for r in rows:
            if len(r) == 12 and r[0] == '' and r[1] == '':
                res.append(r)
        return res
    elif unique_idx == 39:
        res = [
            ['구분 년월일', '직 명', '교육인원 (계획)', '교육인원 (실시)', '교육인원 (미실시)', '교육인원 (실시율)', '비 고'],
            ['---', '---', '---', '---', '---', '---', '---']
        ]
        for r in rows:
            if len(r) == 7 and r[0] == '' and r[1] == '':
                res.append(r)
        return res
    elif unique_idx == 40:
        return [
            ['구분', '내용'],
            ['---', '---'],
            ['송    화', '위치 제      열차      직명      성명'],
            ['수    화', '위치 제      열차      직명      성명'],
            ['통화시간', '시     분부터       시        분까지'],
            ['통화요지', ''],
            ['○ 위치란에는 통화자 상호간 위치 - 역(소)는 역(소)명 - 열차는 ○○역, ○○승인 ○○역간 또는 ○○km 부근을 기재할 것', '']
        ]

    # Tables where we align cells row by row
    new_rows.append(headers)
    new_rows.append(['---'] * len(headers))
    
    col_count = len(headers)
    
    for r in rows:
        if len(r) == 0 or (len(r) == 1 and r[0] == ''):
            continue
        
        # Apply specific unique index rules
        if unique_idx == 1:
            if r[0] not in table1_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 2:
            if r[0] not in table2_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 3:
            if r[0] not in table3_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 4:
            if r[0] not in table4_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 5:
            if r[0] not in table5_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 6:
            if r[0] not in table6_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 7:
            if r[0] != '수신호를 생략 후 선로전환기 통과 시' and r[0] != '':
                r = [''] + r
        elif unique_idx == 8:
            if len(r) < 5 and r[0] not in table8_main_keys:
                # Custom mapping for short rows in table 8
                col2 = r[0]
                col3 = r[1]
                col5 = r[2] if len(r) > 2 else ""
                r = ['', col2, col3, '', col5]
        elif unique_idx == 13:
            if len(r) < 4 and not r[0].isdigit():
                r = [''] + r
        elif unique_idx == 17:
            if r[0] not in table17_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 18:
            if r[0] not in table18_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 19:
            if r[0] not in table19_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 20:
            if r[0] not in table20_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 21:
            if r[0] not in table21_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 22:
            if r[0] not in table22_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 23:
            if r[0] not in table23_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 24:
            if r[0] not in table24_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 25:
            if r[0] not in table25_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 26:
            if r[0] not in table26_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 27:
            if r[0] not in table27_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 28:
            if r[0] not in table28_main_keys and r[0] != '':
                r = [''] + r
        elif unique_idx == 29:
            if r[0] != '수신호를 생략 후 선로전환기 통과 시' and r[0] != '':
                r = [''] + r
        elif unique_idx == 31:
            # 4 columns: 구분, 채널, 사용구간, 통신상대방
            if r[0] == '2호선' or r[0] == '3, 4호선':
                r = (r + [""])[:4]
        
        # Pad or truncate row to match col_count
        r = (r + [""] * col_count)[:col_count]
        new_rows.append(r)
        
    return new_rows

# Helper to find and parse tables from markdown text
def parse_markdown_tables(text):
    lines = text.split("\n")
    tables = []
    current_table = []
    start_idx = None
    
    for idx, line in enumerate(lines):
        if line.strip().startswith("|") and line.strip().endswith("|"):
            if not current_table:
                start_idx = idx
            current_table.append(line)
        else:
            if current_table:
                tables.append((start_idx, idx, current_table))
                current_table = []
    if current_table:
        tables.append((start_idx, len(lines), current_table))
        
    return tables

# 1. Parse tables in md file
tables = parse_markdown_tables(content)
print(f"Parsed {len(tables)} tables from markdown content.")

# We will recreate the markdown content by replacing each table
md_lines = content.split("\n")
table_corrections = {}

for t_idx, (start, end, t_lines) in enumerate(tables):
    table_number = t_idx + 1
    unique_table_idx = (t_idx) % 40 + 1
    
    # Parse rows into lists of cells
    rows_cells = []
    for line in t_lines:
        cells = [c.strip() for c in line.split("|")[1:-1]]
        rows_cells.append(cells)
        
    headers = rows_cells[0]
    separator = rows_cells[1]
    data_rows = rows_cells[2:]
    
    # Fix the rows
    fixed_rows = fix_table_rows(unique_table_idx, headers, data_rows)
    
    # Convert to markdown text
    fixed_md_lines = [format_row(r) for r in fixed_rows]
    fixed_md_text = "\n".join(fixed_md_lines)
    
    table_corrections[(start, end)] = fixed_md_text

# Reconstruct md file content using the corrections
new_md_lines = []
skip_until = -1

for idx, line in enumerate(md_lines):
    if idx <= skip_until:
        continue
    
    # Check if this index starts a table
    table_start = None
    for (start, end) in table_corrections.keys():
        if start == idx:
            table_start = (start, end)
            break
            
    if table_start:
        new_md_lines.append(table_corrections[table_start])
        skip_until = table_start[1] - 1
    else:
        new_md_lines.append(line)

new_md_content = "\n".join(new_md_lines)

# Write back fixed markdown
with open(md_path, "w", encoding="utf-8") as f:
    f.write(new_md_content)
print(f"Successfully saved corrected markdown to: {md_path}")

# 2. Re-open JSON and update it
with open(json_path, "r", encoding="utf-8") as f:
    json_data = json.load(f)

# Split the new markdown content at the table header section
tables_header_part = "\n\n### [Tables in Document]\n\n"
split_parts = new_md_content.split(tables_header_part)

text_part = split_parts[0]
json_data["text"] = text_part
json_data["markdown"] = new_md_content

# Parse the 40 tables appended at the end to update json_data["tables"]
tables_part = split_parts[1] if len(split_parts) > 1 else ""
appended_tables = parse_markdown_tables(tables_part)

for t_idx, (start, end, t_lines) in enumerate(appended_tables):
    rows_cells = []
    for line in t_lines:
        cells = [c.strip() for c in line.split("|")[1:-1]]
        rows_cells.append(cells)
        
    markdown_str = "\n".join(t_lines)
    
    # Generate CSV representation
    import csv
    from io import StringIO
    csv_out = StringIO()
    writer = csv.writer(csv_out)
    for r in rows_cells:
        if r != rows_cells[1]: # skip separator
            writer.writerow(r)
    csv_str = csv_out.getvalue().strip()
    
    # Find matching table in json_data["tables"]
    # Table indices in JSON correspond to index 0 to 39
    if t_idx < len(json_data["tables"]):
        json_data["tables"][t_idx]["markdown"] = markdown_str
        json_data["tables"][t_idx]["csv"] = csv_str
        json_data["tables"][t_idx]["row_count"] = len(rows_cells) - 1 # exclude separator
        json_data["tables"][t_idx]["col_count"] = len(rows_cells[0])

with open(json_path, "w", encoding="utf-8") as f:
    json.dump(json_data, f, ensure_ascii=False, indent=2)
print(f"Successfully updated and saved JSON to: {json_path}")
