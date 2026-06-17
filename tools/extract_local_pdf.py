"""
Script extract text từ PDF local → tạo instruction dataset
Chạy trên Windows: python extract_local_pdf.py
"""
import os
import json
import re
import hashlib
import random
from pathlib import Path
from datetime import datetime
from tqdm import tqdm

# ============================================================
# CẤU HÌNH — sửa các path này cho đúng
# ============================================================
PDF_DIR = Path(r"G:\My Drive\NCKH\Đề tài NCKH\Cấp Sở\Sở KHCN TP. HCM\KIOS\Tài liệu - thủ tục_Xa Ban Co\ALL\PDF")
OUTPUT_DIR = Path(r"G:\My Drive\vanban-ai-dataset")
# ============================================================

DOCS_DIR = OUTPUT_DIR / "documents"
DATASET_DIR = OUTPUT_DIR / "instruction_dataset"

for d in [DOCS_DIR, DATASET_DIR]:
    d.mkdir(parents=True, exist_ok=True)

def install_deps():
    """Cài packages cần thiết."""
    import subprocess
    pkgs = ["pdfplumber", "tqdm"]
    for pkg in pkgs:
        subprocess.run(["pip", "install", "-q", pkg], check=False)

def clean_text(text):
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()

def extract_dieu_khoan(noi_dung):
    """Parse từng Điều khoản từ nội dung văn bản."""
    dieu_list = []
    text = noi_dung.replace('Điều', 'DIEU_MARK')
    for m in re.finditer(
        r'DIEU_MARK\s+(\d+[a-z]?)\s*\.?\s*([^\n]{3,100})\n([\s\S]*?)(?=DIEU_MARK\s+\d+|$)',
        text
    ):
        nd = m.group(3).strip()
        if len(nd) > 80:
            dieu_list.append({
                'so_dieu': m.group(1),
                'tieu_de': m.group(2).strip(),
                'noi_dung': clean_text(nd)[:3000]
            })
    return dieu_list

def detect_loai_vb(filename, text):
    """Phát hiện loại văn bản từ tên file và nội dung."""
    name_lower = filename.lower()
    text_lower = text[:500].lower() if text else ''
    
    patterns = {
        'Nghị định': ['nghị định', 'nd-cp', 'nd/cp', 'nghi-dinh'],
        'Thông tư': ['thông tư', 'tt-bca', 'tt-btc', 'tt-btp', 'thong-tu'],
        'Quyết định': ['quyết định', 'qd-ubnd', 'qd-ttg', 'quyet-dinh'],
        'Công văn': ['công văn', 'cv-ubnd', 'cong-van'],
        'Luật': ['luật ', 'luat '],
        'Nghị quyết': ['nghị quyết', 'nq-cp', 'nghi-quyet'],
        'Chỉ thị': ['chỉ thị', 'ct-ubnd', 'chi-thi'],
        'Thông báo': ['thông báo', 'tb-ubnd', 'thong-bao'],
        'Biểu mẫu': ['mẫu', 'biểu mẫu', 'form', 'bieu-mau'],
        'Hướng dẫn': ['hướng dẫn', 'huong-dan'],
    }
    
    for loai, keywords in patterns.items():
        for kw in keywords:
            if kw in name_lower or kw in text_lower:
                return loai
    
    return 'Văn bản hành chính'

def extract_metadata(filename, text):
    """Trích xuất metadata từ tên file và nội dung."""
    so_ki_hieu = ''
    ngay_ban_hanh = ''
    co_quan = ''
    
    # Từ tên file
    m = re.search(r'(\d+[-/]\d+[-/][A-Z\-]+)', filename)
    if m:
        so_ki_hieu = m.group(1)
    
    # Từ nội dung (500 ký tự đầu)
    header = text[:800] if text else ''
    
    # Số ký hiệu
    if not so_ki_hieu:
        m = re.search(r'Số[:\s]+([0-9A-Z/\-\.]+)', header)
        if m:
            so_ki_hieu = m.group(1).strip()
    
    # Ngày ban hành
    m = re.search(r'ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})', header, re.IGNORECASE)
    if m:
        ngay_ban_hanh = f"{m.group(1)}/{m.group(2)}/{m.group(3)}"
    
    # Cơ quan ban hành
    lines = header.split('\n')
    for line in lines[:10]:
        line = line.strip()
        if any(k in line.upper() for k in ['UBND', 'BỘ ', 'CỤC ', 'SỞ ', 'PHÒNG ', 'BAN ']):
            if len(line) > 5 and len(line) < 100:
                co_quan = line
                break
    
    return so_ki_hieu, ngay_ban_hanh, co_quan

def extract_title(filename, text):
    """Lấy tiêu đề văn bản."""
    # Từ nội dung — tìm dòng IN HOA dài
    lines = (text[:1000] if text else '').split('\n')
    for line in lines:
        line = line.strip()
        if len(line) > 20 and line == line.upper() and len(line) < 200:
            return line.title()
    
    # Từ tên file
    name = Path(filename).stem
    name = re.sub(r'[_\-]+', ' ', name)
    return name[:200]

def process_pdf(pdf_path):
    """Extract text từ 1 file PDF."""
    try:
        import pdfplumber
        
        with pdfplumber.open(pdf_path) as pdf:
            pages_text = []
            for page in pdf.pages:
                text = page.extract_text() or ''
                pages_text.append(text)
            
            full_text = '\n\n'.join(pages_text)
            page_count = len(pdf.pages)
        
        if len(full_text.strip()) < 100:
            return None
        
        noi_dung = clean_text(full_text)
        filename = pdf_path.name
        loai_vb = detect_loai_vb(filename, noi_dung)
        so_ki_hieu, ngay_ban_hanh, co_quan = extract_metadata(filename, noi_dung)
        title = extract_title(filename, noi_dung)
        
        return {
            'title': title,
            'loai_vb': loai_vb,
            'so_ki_hieu': so_ki_hieu,
            'ngay_ban_hanh': ngay_ban_hanh,
            'ngay_hieu_luc': '',
            'tinh_trang_hieu_luc': 'Còn hiệu lực',
            'co_quan_ban_hanh': co_quan,
            'noi_dung': noi_dung,
            'cac_dieu': extract_dieu_khoan(noi_dung),
            'page_count': page_count,
            'char_count': len(noi_dung),
            'source_file': str(pdf_path),
            'nguon': 'local_pdf',
            'crawl_time': datetime.now().isoformat(),
        }
    except Exception as e:
        print(f'  ERR {pdf_path.name}: {e}')
        return None

def scan_and_extract(pdf_dir):
    """Scan toàn bộ PDF trong thư mục và subdirs."""
    pdf_dir = Path(pdf_dir)
    if not pdf_dir.exists():
        print(f'ERROR: Không tìm thấy thư mục: {pdf_dir}')
        return []
    
    # Tìm tất cả PDF
    pdf_files = list(pdf_dir.rglob('*.pdf')) + list(pdf_dir.rglob('*.PDF'))
    print(f'Tìm thấy {len(pdf_files)} file PDF trong {pdf_dir}')
    
    if not pdf_files:
        print('Không có file PDF nào!')
        return []
    
    # Extract từng file
    all_docs = []
    errors = 0
    
    for pdf_path in tqdm(pdf_files, desc='Extracting PDFs'):
        doc_id = hashlib.md5(str(pdf_path).encode()).hexdigest()[:12]
        out_file = DOCS_DIR / f'{doc_id}.json'
        
        if out_file.exists():
            # Load từ cache
            try:
                with open(out_file, 'r', encoding='utf-8') as f:
                    doc = json.load(f)
                all_docs.append(doc)
                continue
            except:
                pass
        
        doc = process_pdf(pdf_path)
        if doc:
            with open(out_file, 'w', encoding='utf-8') as f:
                json.dump(doc, f, ensure_ascii=False, indent=2)
            all_docs.append(doc)
        else:
            errors += 1
    
    print(f'\nExtract xong: {len(all_docs)} docs, {errors} lỗi')
    return all_docs

def make_dataset(all_docs, qa_per_doc=3):
    """Tạo instruction dataset từ các văn bản."""
    QA_INSTRS = [
        'Dựa trên {loai_vb} sau, hãy trả lời câu hỏi',
        'Căn cứ văn bản pháp luật dưới đây, trả lời câu hỏi',
        'Từ nội dung văn bản hành chính sau, trả lời chính xác',
        'Theo {loai_vb} này, hãy giải thích',
    ]
    QA_QUESTIONS = [
        'Điều {so_dieu} về {tieu_de} quy định gì?',
        'Nội dung {tieu_de} là gì?',
        'Hãy giải thích quy định về {tieu_de}.',
        'Theo văn bản này, {tieu_de} được quy định thế nào?',
    ]
    SOAN_INSTRS = [
        'Soạn thảo {loai_vb} theo chuẩn Nghị định 30/2020/NĐ-CP',
        'Viết {loai_vb} đúng thể thức văn bản hành chính Việt Nam',
        'Soạn {loai_vb} theo mẫu chuẩn cơ quan nhà nước Việt Nam',
    ]
    
    dataset = []
    
    for doc in tqdm(all_docs, desc='Tạo dataset'):
        # Task A: RAG Q&A từ các Điều khoản
        dieu_list = doc.get('cac_dieu', [])
        if dieu_list:
            selected = random.sample(dieu_list, min(qa_per_doc, len(dieu_list)))
            for dieu in selected:
                if len(dieu['noi_dung']) < 100:
                    continue
                ctx = (
                    f"{doc['title']}\n"
                    f"Số KH: {doc.get('so_ki_hieu', 'N/A')}\n"
                    f"Ngày BH: {doc.get('ngay_ban_hanh', 'N/A')}\n"
                    f"Cơ quan: {doc.get('co_quan_ban_hanh', 'N/A')}\n\n"
                    f"Điều {dieu['so_dieu']}. {dieu['tieu_de']}\n"
                    f"{dieu['noi_dung'][:1500]}"
                )
                output = (
                    f"Theo {doc['loai_vb']} {doc.get('so_ki_hieu', '')}, "
                    f"Điều {dieu['so_dieu']} về {dieu['tieu_de']} quy định:\n\n"
                    f"{dieu['noi_dung'][:800]}"
                )
                dataset.append({
                    'task': 'rag_qa',
                    'instruction': random.choice(QA_INSTRS).format(loai_vb=doc['loai_vb']),
                    'input': ctx + '\n\nCâu hỏi: ' + random.choice(QA_QUESTIONS).format(
                        so_dieu=dieu['so_dieu'], tieu_de=dieu['tieu_de']),
                    'output': output,
                    'metadata': {
                        'source_file': doc.get('source_file', ''),
                        'loai_vb': doc['loai_vb'],
                        'so_ki_hieu': doc.get('so_ki_hieu', ''),
                    }
                })
        
        # Task B: Soạn thảo từ văn bản gốc
        if len(doc.get('noi_dung', '')) >= 500:
            dataset.append({
                'task': 'soan_thao',
                'instruction': random.choice(SOAN_INSTRS).format(loai_vb=doc['loai_vb']),
                'input': (
                    f"Loại VB: {doc['loai_vb']}\n"
                    f"Cơ quan: {doc.get('co_quan_ban_hanh', 'Cơ quan nhà nước')}\n"
                    f"Về việc: {doc['title']}\n"
                    f"Ngày: {doc.get('ngay_ban_hanh', '')}"
                ),
                'output': doc['noi_dung'][:2000],
                'metadata': {
                    'source_file': doc.get('source_file', ''),
                    'loai_vb': doc['loai_vb'],
                }
            })
    
    random.shuffle(dataset)
    
    # Lưu JSON
    out_json = DATASET_DIR / 'instruction_dataset.json'
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)
    
    # Lưu JSONL cho HuggingFace/fine-tune
    out_jsonl = DATASET_DIR / 'instruction_dataset.jsonl'
    with open(out_jsonl, 'w', encoding='utf-8') as f:
        for item in dataset:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    
    qa = sum(1 for d in dataset if d['task'] == 'rag_qa')
    st = sum(1 for d in dataset if d['task'] == 'soan_thao')
    
    print(f'\n✅ Dataset hoàn thành:')
    print(f'  RAG Q&A:    {qa:5d} samples')
    print(f'  Soạn thảo:  {st:5d} samples')
    print(f'  TỔNG:       {len(dataset):5d} samples')
    print(f'  JSON:  {out_json}')
    print(f'  JSONL: {out_jsonl}')
    
    return dataset

def print_stats(all_docs):
    """In thống kê."""
    from collections import Counter
    print('\n📊 THỐNG KÊ VĂN BẢN:')
    print('='*50)
    print(f'Tổng: {len(all_docs)} văn bản')
    
    loai_count = Counter(d['loai_vb'] for d in all_docs)
    print('\nPhân loại:')
    for loai, count in loai_count.most_common():
        print(f'  {loai:25s}: {count}')
    
    total_chars = sum(len(d.get('noi_dung', '')) for d in all_docs)
    total_dieu = sum(len(d.get('cac_dieu', [])) for d in all_docs)
    print(f'\nTổng ký tự: {total_chars:,}')
    print(f'Tổng Điều:  {total_dieu:,}')
    
    # Sample
    if all_docs:
        print('\n📄 SAMPLE:')
        doc = all_docs[0]
        print(f'  Title:   {doc["title"][:70]}')
        print(f'  Loại:    {doc["loai_vb"]}')
        print(f'  Số KH:   {doc.get("so_ki_hieu", "N/A")}')
        print(f'  Ngày BH: {doc.get("ngay_ban_hanh", "N/A")}')
        print(f'  Chars:   {len(doc.get("noi_dung", ""))}')
        print(f'  Điều:    {len(doc.get("cac_dieu", []))}')
        print(f'  Nội dung (500 ký tự đầu):')
        print(f'  {doc.get("noi_dung", "")[:500]}')

# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    print('🇻🇳 VănBản.AI — Extract Local PDF Dataset')
    print('='*50)
    print(f'PDF dir: {PDF_DIR}')
    print(f'Output:  {OUTPUT_DIR}')
    print()
    
    # Cài dependencies
    print('Cài packages...')
    install_deps()
    
    # Extract PDF
    print('\n1. Extract text từ PDF...')
    all_docs = scan_and_extract(PDF_DIR)
    
    if not all_docs:
        print('Không có văn bản nào được extract!')
        exit(1)
    
    # Thống kê
    print_stats(all_docs)
    
    # Lưu merged
    merged_file = OUTPUT_DIR / 'merged' / 'all_documents.json'
    merged_file.parent.mkdir(exist_ok=True)
    with open(merged_file, 'w', encoding='utf-8') as f:
        json.dump(all_docs, f, ensure_ascii=False, indent=2)
    print(f'\nMerged: {merged_file}')
    
    # Tạo dataset
    print('\n2. Tạo instruction dataset...')
    dataset = make_dataset(all_docs, qa_per_doc=3)
    
    print('\n✅ HOÀN THÀNH!')
    print(f'Dataset tại: {DATASET_DIR}')
