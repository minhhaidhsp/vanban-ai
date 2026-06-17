# -*- coding: utf-8 -*-
"""
Script OCR bo sung -- chi xu ly PDF scan bi bo qua lan truoc.
Chay SAU extract_local_pdf.py.
Output: report chi tiet + dataset cap nhat
"""
import os, sys, json, re, hashlib, random
from pathlib import Path
from datetime import datetime
from collections import Counter

# ============================================================
# CAU HINH
# ============================================================
PDF_DIR    = Path(r"G:\My Drive\NCKH\Đề tài NCKH\Cấp Sở\Sở KHCN TP. HCM\KIOS\Tài liệu - thủ tục_Xa Ban Co\ALL\PDF")
OUTPUT_DIR = Path(r"G:\My Drive\vanban-ai-dataset")
# Sua 2 path tren cho dung voi may cua ban
# PDF_DIR la folder chua tat ca PDF
# OUTPUT_DIR la noi luu dataset
# ============================================================

DOCS_DIR   = OUTPUT_DIR / "documents"
REPORT_DIR = OUTPUT_DIR / "reports"
for d in [DOCS_DIR, REPORT_DIR]:
    d.mkdir(parents=True, exist_ok=True)

def clean_text(text):
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()

def extract_dieu_khoan(noi_dung):
    dieu_list = []
    text = noi_dung.replace('Dieu', 'DIEU_MARK').replace('\u0110i\u1ec1u', 'DIEU_MARK')
    for m in re.finditer(
        r'DIEU_MARK\s+(\d+[a-z]?)\s*\.?\s*([^\n]{3,100})\n([\s\S]*?)(?=DIEU_MARK\s+\d+|$)', text
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
    n = filename.lower(); t = text[:500].lower() if text else ''
    patterns = {
        'Nghi dinh':  ['nghi dinh','nd-cp','nd/cp',' nd '],
        'Thong tu':   ['thong tu','tt-bca','tt-btc',' tt '],
        'Quyet dinh': ['quyet dinh','qd-ubnd','qd-ttg',' qd '],
        'Cong van':   ['cong van','cv-ubnd',' cv '],
        'Luat':       ['luat '],
        'Nghi quyet': ['nghi quyet','nq-cp',' nq '],
        'Chi thi':    ['chi thi','ct-ubnd'],
        'Thong bao':  ['thong bao','tb-ubnd',' tb '],
        'Bieu mau':   ['mau ','bieu mau'],
        'Huong dan':  ['huong dan'],
    }
    for loai, keys in patterns.items():
        for k in keys:
            if k in n or k in t:
                return loai
    return 'Van ban hanh chinh'

def extract_metadata(filename, text):
    so = ngay = cq = ''
    m = re.search(r'(\d+[-/]\d+[-/][A-Z\-]+)', filename)
    if m: so = m.group(1)
    h = text[:800] if text else ''
    if not so:
        m = re.search(r'So[:\s]+([0-9A-Z/\-\.]+)', h)
        if m: so = m.group(1).strip()
    m = re.search(r'ngay\s+(\d{1,2})\s+thang\s+(\d{1,2})\s+nam\s+(\d{4})', h, re.IGNORECASE)
    if m: ngay = f"{m.group(1)}/{m.group(2)}/{m.group(3)}"
    for line in h.split('\n')[:10]:
        line = line.strip()
        if any(k in line.upper() for k in ['UBND','BO ','CUC ','SO ','PHONG ','BAN ']):
            if 5 < len(line) < 100: cq = line; break
    return so, ngay, cq

def extract_title(filename, text):
    for line in (text[:1000] if text else '').split('\n'):
        line = line.strip()
        if len(line) > 20 and line == line.upper() and len(line) < 200:
            return line.title()
    return re.sub(r'[_\-]+', ' ', Path(filename).stem)[:200]

def save_json(data, path):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def ocr_pdf(pdf_path):
    """OCR PDF scan. Returns ((text, page_count), None) hoac (None, error_msg)."""
    try:
        import pytesseract
        from pdf2image import convert_from_path
        for p in [
            r'C:\Program Files\Tesseract-OCR\tesseract.exe',
            r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
        ]:
            if Path(p).exists():
                pytesseract.pytesseract.tesseract_cmd = p
                break
        images = convert_from_path(str(pdf_path), dpi=200,
            poppler_path=r'C:\poppler\Library\bin')
        if not images:
            return None, 'Khong convert duoc PDF sang anh'
        pages_text = []
        for img in images:
            try: t = pytesseract.image_to_string(img, lang='vie')
            except Exception: t = pytesseract.image_to_string(img, lang='eng')
            pages_text.append(t)
        return (clean_text('\n\n'.join(pages_text)), len(images)), None
    except Exception as e:
        return None, str(e)

def rebuild_dataset(all_docs):
    QA_I = [
        'Dua tren {loai_vb} sau, hay tra loi cau hoi',
        'Can cu van ban phap luat duoi day, tra loi cau hoi',
        'Tu noi dung van ban hanh chinh sau, tra loi chinh xac',
    ]
    QA_Q = [
        'Dieu {so_dieu} ve {tieu_de} quy dinh gi?',
        'Noi dung {tieu_de} la gi?',
        'Hay giai thich quy dinh ve {tieu_de}.',
    ]
    SOAN_I = [
        'Soan thao {loai_vb} theo chuan Nghi dinh 30/2020/ND-CP',
        'Viet {loai_vb} dung the thuc van ban hanh chinh Viet Nam',
        'Soan {loai_vb} theo mau chuan co quan nha nuoc Viet Nam',
    ]
    dataset = []
    for doc in all_docs:
        dieu_list = doc.get('cac_dieu', [])
        if dieu_list:
            for dieu in random.sample(dieu_list, min(3, len(dieu_list))):
                if len(dieu['noi_dung']) < 100: continue
                ctx = (
                    f"{doc['title']}\nSo KH: {doc.get('so_ki_hieu','N/A')}\n"
                    f"Ngay BH: {doc.get('ngay_ban_hanh','N/A')}\n"
                    f"Co quan: {doc.get('co_quan_ban_hanh','N/A')}\n\n"
                    f"Dieu {dieu['so_dieu']}. {dieu['tieu_de']}\n{dieu['noi_dung'][:1500]}"
                )
                dataset.append({
                    'task': 'rag_qa',
                    'instruction': random.choice(QA_I).format(loai_vb=doc['loai_vb']),
                    'input': ctx + '\n\nCau hoi: ' + random.choice(QA_Q).format(
                        so_dieu=dieu['so_dieu'], tieu_de=dieu['tieu_de']),
                    'output': (f"Theo {doc['loai_vb']} {doc.get('so_ki_hieu','')}, "
                               f"Dieu {dieu['so_dieu']} ve {dieu['tieu_de']} quy dinh:\n\n"
                               f"{dieu['noi_dung'][:800]}"),
                    'metadata': {'source_file': doc.get('source_file',''), 'loai_vb': doc['loai_vb'], 'nguon': doc.get('nguon','')}
                })
        if len(doc.get('noi_dung','')) >= 500:
            dataset.append({
                'task': 'soan_thao',
                'instruction': random.choice(SOAN_I).format(loai_vb=doc['loai_vb']),
                'input': (f"Loai VB: {doc['loai_vb']}\nCo quan: {doc.get('co_quan_ban_hanh','Co quan nha nuoc')}\n"
                          f"Ve viec: {doc['title']}\nNgay: {doc.get('ngay_ban_hanh','')}"),
                'output': doc['noi_dung'][:2000],
                'metadata': {'source_file': doc.get('source_file',''), 'loai_vb': doc['loai_vb'], 'nguon': doc.get('nguon','')}
            })
    random.shuffle(dataset)
    ds_dir = OUTPUT_DIR / 'instruction_dataset'
    ds_dir.mkdir(exist_ok=True)
    save_json(dataset, ds_dir / 'instruction_dataset.json')
    with open(ds_dir / 'instruction_dataset.jsonl', 'w', encoding='utf-8') as f:
        for item in dataset:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    return dataset

# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    start_time = datetime.now()
    print('OCR Supplement -- Ra soat va bo sung PDF scan')
    print('=' * 60)
    print(f'PDF dir : {PDF_DIR}')
    print(f'Output  : {OUTPUT_DIR}')
    print(f'Bat dau : {start_time.strftime("%Y-%m-%d %H:%M:%S")}')
    print()

    # Check deps
    missing_deps = []
    try: import pytesseract
    except ImportError: missing_deps.append('pytesseract')
    try: from pdf2image import convert_from_path
    except ImportError: missing_deps.append('pdf2image')
    if missing_deps:
        print(f'Thieu packages: {", ".join(missing_deps)}')
        print(f'Chay: pip install {" ".join(missing_deps)}')
        sys.exit(1)
    print('Dependencies OK')

    # Check Tesseract
    tess_found = False
    for p in [r'C:\Program Files\Tesseract-OCR\tesseract.exe',
              r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe']:
        if Path(p).exists():
            tess_found = True
            print(f'Tesseract: {p}')
            break
    if not tess_found:
        print('Khong tim thay Tesseract!')
        print('Cai tai: https://github.com/UB-Mannheim/tesseract/wiki')
        sys.exit(1)
    print()

    # Scan PDF
    all_pdfs = list(PDF_DIR.rglob('*.pdf')) + list(PDF_DIR.rglob('*.PDF'))
    print(f'Tong PDF trong thu muc : {len(all_pdfs)}')
    existing_ids = {f.stem for f in DOCS_DIR.glob('*.json')}
    print(f'Da extract truoc do    : {len(existing_ids)} docs')
    missing_pdfs = [p for p in all_pdfs
                    if hashlib.md5(str(p).encode()).hexdigest()[:12] not in existing_ids]
    print(f'Can OCR bo sung        : {len(missing_pdfs)} files')
    print()

    if not missing_pdfs:
        print('Tat ca PDF da duoc extract!')
        sys.exit(0)

    # OCR
    print('=' * 60)
    print('BAT DAU OCR BO SUNG')
    print('=' * 60)

    results = {'success': [], 'skip': [], 'error': []}

    for i, pdf_path in enumerate(missing_pdfs):
        fname = pdf_path.name
        doc_id = hashlib.md5(str(pdf_path).encode()).hexdigest()[:12]
        out_file = DOCS_DIR / f'{doc_id}.json'
        print(f'[{i+1:3d}/{len(missing_pdfs)}] {fname[:65]}')

        ocr_result, err = ocr_pdf(pdf_path)
        if err:
            print(f'         FAIL: {err[:80]}')
            results['error'].append({'file': fname, 'error': err})
            continue

        noi_dung, page_count = ocr_result
        if len(noi_dung.strip()) < 100:
            print(f'         SKIP: Text qua ngan ({len(noi_dung)} ky tu)')
            results['skip'].append({'file': fname, 'reason': f'Text qua ngan: {len(noi_dung)} ky tu', 'pages': page_count})
            continue

        loai_vb  = detect_loai_vb(fname, noi_dung)
        so, ngay, cq = extract_metadata(fname, noi_dung)
        title    = extract_title(fname, noi_dung)
        cac_dieu = extract_dieu_khoan(noi_dung)

        doc = {
            'title': title, 'loai_vb': loai_vb,
            'so_ki_hieu': so, 'ngay_ban_hanh': ngay,
            'ngay_hieu_luc': '', 'tinh_trang_hieu_luc': 'Con hieu luc',
            'co_quan_ban_hanh': cq, 'noi_dung': noi_dung,
            'cac_dieu': cac_dieu, 'page_count': page_count,
            'char_count': len(noi_dung), 'source_file': str(pdf_path),
            'nguon': 'local_pdf_ocr', 'crawl_time': datetime.now().isoformat(),
        }
        save_json(doc, out_file)
        print(f'         OK: {page_count} trang | {len(noi_dung):,} ky tu | {loai_vb} | {len(cac_dieu)} Dieu')
        results['success'].append({
            'file': fname, 'char_count': len(noi_dung),
            'page_count': page_count, 'loai_vb': loai_vb,
            'so_ki_hieu': so, 'so_dieu': len(cac_dieu),
        })

    end_time = datetime.now()
    duration = (end_time - start_time).seconds

    # --------------------------------------------------------
    # BAO CAO CHI TIET
    # --------------------------------------------------------
    print()
    print('=' * 60)
    print('BAO CAO KET QUA OCR BO SUNG')
    print('=' * 60)
    print(f'Thoi gian   : {duration // 60}m {duration % 60}s')
    print(f'Tong xu ly  : {len(missing_pdfs)} files')
    print(f'  OK        : {len(results["success"])}')
    print(f'  Bo qua    : {len(results["skip"])}')
    print(f'  Loi       : {len(results["error"])}')

    if results['success']:
        print(f'\nFILES DA OCR THANH CONG ({len(results["success"])}):')
        print(f'{"STT":>4} {"Ten file":<55} {"Loai":<18} {"Trang":>5} {"Ky tu":>8} {"Dieu":>5}')
        print('-' * 100)
        for j, r in enumerate(results['success'], 1):
            print(f'{j:4d} {r["file"][:55]:<55} {r["loai_vb"]:<18} {r["page_count"]:5d} {r["char_count"]:8,} {r["so_dieu"]:5d}')
        loai_count = Counter(r['loai_vb'] for r in results['success'])
        print(f'\n  Phan loai:')
        for loai, count in loai_count.most_common():
            print(f'    {loai:<20}: {count}')
        total_chars = sum(r['char_count'] for r in results['success'])
        total_dieu  = sum(r['so_dieu']    for r in results['success'])
        print(f'\n  Tong ky tu bo sung : {total_chars:,}')
        print(f'  Tong Dieu bo sung  : {total_dieu}')

    if results['skip']:
        print(f'\nFILES BO QUA ({len(results["skip"])}):')
        for r in results['skip']:
            print(f'  - {r["file"][:70]} ({r["reason"]})')

    if results['error']:
        print(f'\nFILES LOI ({len(results["error"])}):')
        for r in results['error']:
            print(f'  - {r["file"][:60]}: {r["error"][:60]}')

    # Luu report
    report = {
        'run_time': start_time.isoformat(),
        'duration_seconds': duration,
        'total_processed': len(missing_pdfs),
        'success_count': len(results['success']),
        'skip_count': len(results['skip']),
        'error_count': len(results['error']),
        'details': results,
    }
    report_file = REPORT_DIR / f'ocr_report_{start_time.strftime("%Y%m%d_%H%M%S")}.json'
    save_json(report, report_file)
    print(f'\nReport: {report_file}')

    # Rebuild dataset
    print('\nLoad tat ca docs...')
    all_docs = []
    for f in DOCS_DIR.glob('*.json'):
        try: all_docs.append(load_json(f))
        except: pass
    print(f'Tong docs (cu + moi): {len(all_docs)}')

    merged_dir = OUTPUT_DIR / 'merged'
    merged_dir.mkdir(exist_ok=True)
    save_json(all_docs, merged_dir / 'all_documents.json')

    print('\nRebuild instruction dataset...')
    dataset = rebuild_dataset(all_docs)
    qa   = sum(1 for d in dataset if d['task'] == 'rag_qa')
    soan = sum(1 for d in dataset if d['task'] == 'soan_thao')

    print()
    print('=' * 60)
    print('TONG KET DATASET SAU KHI BO SUNG OCR')
    print('=' * 60)
    print(f'Tong van ban : {len(all_docs)}')
    print(f'  Tu text    : {sum(1 for d in all_docs if d.get("nguon") == "local_pdf")}')
    print(f'  Tu OCR     : {sum(1 for d in all_docs if d.get("nguon") == "local_pdf_ocr")}')
    print(f'\nInstruction samples : {len(dataset)}')
    print(f'  RAG Q&A     : {qa}')
    print(f'  Soan thao   : {soan}')
    print(f'\nHOAN THANH!')
    print(f'Dataset: {OUTPUT_DIR / "instruction_dataset"}')
